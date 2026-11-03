import { localDocumentStore as store, LocalDocumentError } from '../src/services/local-document-store';
import { LOCAL_STORE_CONFIG as config } from '../src/services/local-document-store/config';
import { loadBookDocumentData } from '../src/features/book-viewer/document-source';

export async function runBrowserTests(): Promise<string[]> {
  const passed: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
    passed.push(message);
  };
  async function rejects(operation: () => Promise<unknown>, code: string, label: string) {
    let error: unknown;
    try { await operation(); } catch (caught) { error = caught; }
    check(error instanceof LocalDocumentError && error.code === code, label);
  }
  const bytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]);
  await store.clearAllDocuments();
  await store.saveDocument('persisted', 'Original PDF', bytes.length, bytes, 3);

  // Read through a separate native connection, not the service's memory or return value.
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(config.DB_NAME, config.DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const raw = await new Promise<{ blob: Blob }>((resolve, reject) => {
    const tx = db.transaction(config.STORES.BLOBS, 'readonly');
    const request = tx.objectStore(config.STORES.BLOBS).get('persisted');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  check(Array.from(new Uint8Array(await raw.blob.arrayBuffer())).join() === Array.from(bytes).join(),
    'Saved PDF bytes exist in native IndexedDB through a new connection');
  await store.updateLastPage('persisted', 2);
  check(await store.getLastPage('persisted') === 2, 'Last page survives database connection reopening');
  const sliced = new Uint8Array([0, ...bytes, 0]).subarray(1, bytes.length + 1);
  await store.saveDocument('slice', 'Typed array slice', sliced.length, sliced, 1);
  check((await store.getDocumentData('slice'))?.byteLength === bytes.length,
    'Typed array slices persist only their selected bytes');

  const originalPut = IDBObjectStore.prototype.put;
  try {
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === config.STORES.BLOBS) throw new DOMException('Full', 'QuotaExceededError');
      return originalPut.apply(this, args);
    };
    await rejects(() => store.saveDocument('quota-failed', 'Full PDF', bytes.length, bytes, 1), 'quota',
      'Quota failure rejects saving instead of returning volatile success');
  } finally { IDBObjectStore.prototype.put = originalPut; }
  check(await store.getDocumentMetadata('quota-failed') === null,
    'Failed blob save rolls back its metadata atomically');
  check(await store.getDocumentData('quota-failed') === null, 'Failed save leaves no memory fallback');

  // Request success is not transaction success: abort after put has succeeded.
  try {
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      const request = originalPut.apply(this, args);
      request.addEventListener('success', () => this.transaction.abort());
      return request;
    };
    await rejects(() => store.saveDocument('aborted', 'Aborted PDF', bytes.length, bytes, 1), 'save',
      'Aborted transaction after successful requests rejects saving');
    await rejects(() => store.updateLastPage('persisted', 3), 'save',
      'Last-page update rejects a transaction abort');
  } finally { IDBObjectStore.prototype.put = originalPut; }
  check(await store.getDocumentMetadata('aborted') === null, 'Aborted save persists no metadata');
  check(await store.getLastPage('persisted') === 2, 'Aborted last-page update keeps previous position');

  const originalGet = IDBObjectStore.prototype.get;
  try {
    IDBObjectStore.prototype.get = function (key: IDBValidKey | IDBKeyRange) {
      const request = originalGet.call(this, key);
      request.addEventListener('success', () => this.transaction.abort());
      return request;
    };
    await rejects(() => store.getDocumentData('persisted'), 'load', 'Aborted read is an explicit load error, not missing data');
  } finally { IDBObjectStore.prototype.get = originalGet; }

  let sampleCalls = 0;
  const sample = () => { sampleCalls++; return bytes; };
  await rejects(() => loadBookDocumentData({ id: 'missing', source: 'local' }, undefined, sample), 'missing',
    'Missing user file raises a recoverable missing-file error');
  check(sampleCalls === 0, 'Missing user PDF never invokes sample generation');
  const actual = await loadBookDocumentData({ id: 'persisted', source: 'local' }, undefined, sample);
  check(actual.byteLength === bytes.length && sampleCalls === 0, 'Existing user PDF loads its original bytes');
  await loadBookDocumentData({ id: 'demo', source: 'admin' }, undefined, sample);
  check(sampleCalls === 1, 'Only an explicitly designated demo/admin book may generate a sample');
  await rejects(() => store.saveLastPage('missing', 2), 'missing', 'Missing metadata cannot claim last-page persistence');

  await store.deleteDocument('persisted');
  check(await store.getDocumentData('persisted') === null && await store.getDocumentMetadata('persisted') === null,
    'Deletion removes both native PDF and metadata');
  check(await store.clearAllDocuments() === 1, 'Clearing returns the committed number of remaining documents');
  check((await store.getAllDocuments()).length === 0, 'Clear commits to native IndexedDB');
  return passed;
}
