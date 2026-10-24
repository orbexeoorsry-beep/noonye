import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import express from 'express';
import { AccountStore } from '../server/features/accounts/store.js';
import { createAccountsRouter } from '../server/features/accounts/router.js';
import { fetchAuthenticatedUserId } from '../src/features/accounts/sessionIdentity';
import { request } from '../src/features/accounts/api';
import {
  broadcastSchoolSessionChange,
  subscribeToSchoolSessionChanges,
} from '../src/features/accounts/sessionSignals';
import { SchoolLibrarySessionController } from '../src/services/accountLibraryScope';
import { accountDatabaseName, accountStorageKey } from '../src/services/accountScope';
import { LOCAL_STORE_CONFIG } from '../src/services/local-document-store/config';
import { INITIAL_PROGRESS } from '../src/mock-data/progress';
import type { AuthenticatedUserId } from '../src/services/accountScope';

type Callback = ((event: any) => void) | null;

function clone<T>(value: T): T {
  return structuredClone(value);
}

class FakeTransaction {
  oncomplete: Callback = null;
  onerror: Callback = null;
  private completionScheduled = false;

  constructor(private readonly database: FakeDatabase) {}

  objectStore(name: string): FakeObjectStore {
    const values = this.database.stores.get(name);
    if (!values) throw new Error(`Missing fake object store: ${name}`);
    return new FakeObjectStore(values, this);
  }

  scheduleComplete(): void {
    if (this.completionScheduled) return;
    this.completionScheduled = true;
    setTimeout(() => this.oncomplete?.({ target: this }), 0);
  }
}

class FakeObjectStore {
  constructor(
    private readonly values: Map<string, unknown>,
    private readonly transaction: FakeTransaction | null = null
  ) {}

  createIndex(): void {}

  put(value: any): { result?: unknown; onsuccess: Callback; onerror: Callback } {
    if (!value || value.id === undefined) throw new Error('Fake object store requires id keyPath.');
    this.values.set(String(value.id), clone(value));
    this.transaction?.scheduleComplete();
    return this.makeRequest(undefined);
  }

  get(key: IDBValidKey): { result?: unknown; onsuccess: Callback; onerror: Callback } {
    const value = this.values.get(String(key));
    return this.makeRequest(value === undefined ? undefined : clone(value));
  }

  getAll(): { result?: unknown; onsuccess: Callback; onerror: Callback } {
    return this.makeRequest(Array.from(this.values.values(), (value) => clone(value)));
  }

  delete(key: IDBValidKey): void {
    this.values.delete(String(key));
    this.transaction?.scheduleComplete();
  }

  clear(): void {
    this.values.clear();
    this.transaction?.scheduleComplete();
  }

  private makeRequest(result: unknown): { result?: unknown; onsuccess: Callback; onerror: Callback } {
    const request = { result, onsuccess: null as Callback, onerror: null as Callback };
    setTimeout(() => request.onsuccess?.({ target: request }), 0);
    return request;
  }
}

class FakeDatabase {
  readonly stores = new Map<string, Map<string, unknown>>();
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };

  constructor(readonly name: string, public version: number) {}

  createObjectStore(name: string): FakeObjectStore {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    return new FakeObjectStore(this.stores.get(name)!);
  }

  transaction(_names: string | string[], _mode?: IDBTransactionMode): FakeTransaction {
    return new FakeTransaction(this);
  }

  close(): void {}
}

class FakeIndexedDB {
  readonly databases = new Map<string, FakeDatabase>();
  failNextOpen = 0;

  open(name: string, version = 1): any {
    const request: any = {
      result: undefined,
      transaction: undefined,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      onblocked: null,
    };
    setTimeout(() => {
      if (this.failNextOpen > 0) {
        this.failNextOpen -= 1;
        request.error = new Error('Synthetic IndexedDB open failure.');
        request.onerror?.({ target: request });
        return;
      }
      let database = this.databases.get(name);
      const oldVersion = database?.version ?? 0;
      if (!database) {
        database = new FakeDatabase(name, 0);
        this.databases.set(name, database);
      }
      request.result = database;
      if (version > database.version) {
        database.version = version;
        request.transaction = new FakeTransaction(database);
        request.onupgradeneeded?.({ target: request, oldVersion });
      }
      request.onsuccess?.({ target: request });
    }, 0);
    return request;
  }
}

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, String(value)); }
  removeItem(key: string): void { this.values.delete(key); }
  entries(): Array<[string, string]> { return Array.from(this.values.entries()); }
}

function setGlobalProperty(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}

function restoreGlobalProperty(name: string, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else delete (globalThis as Record<string, unknown>)[name];
}

test('school library scopes isolate account data and preserve legacy records', async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const broadcastDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel');
  const originalFetch = globalThis.fetch;
  const directory = mkdtempSync(path.join(tmpdir(), 'noon-account-isolation-'));
  let store: AccountStore | undefined;
  let server: Server | undefined;

  try {
    // A real loopback accounts route supplies the only identities accepted by the scope factories.
    store = new AccountStore(path.join(directory, 'accounts.sqlite'));
    await store.bootstrapSchool('cedar-school', 'Cedar School', 'cedar-admin', 'cedar-password-test', 'Cedar Admin');
    await store.bootstrapSchool('maple-school', 'Maple School', 'maple-admin', 'maple-password-test', 'Maple Admin');

    const probe = express().listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      probe.once('listening', resolve);
      probe.once('error', reject);
    });
    const address = probe.address();
    assert.ok(address && typeof address !== 'string');
    const port = address.port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    const origin = `http://127.0.0.1:${port}`;

    const app = express();
    app.use('/api', createAccountsRouter({ store, origin, enabled: true }));
    server = app.listen(port, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', resolve);
      server!.once('error', reject);
    });

    const login = async (schoolSlug: string, username: string, password: string) => {
      const response = await fetch(`${origin}/api/accounts/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Origin: origin },
        body: JSON.stringify({ schoolSlug, username, password }),
      });
      assert.equal(response.status, 200);
      const cookieHeader = response.headers.get('set-cookie');
      assert.ok(cookieHeader?.includes('noon_local_session='));
      return cookieHeader!.split(';')[0];
    };

    const cookieA = await login('cedar-school', 'cedar-admin', 'cedar-password-test');
    const cookieB = await login('maple-school', 'maple-admin', 'maple-password-test');
    const makeSessionFetcher = (cookie?: string) => async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (cookie) headers.set('cookie', cookie);
      return fetch(`${origin}${url}`, { ...init, headers });
    };

    const unauthenticated = await fetchAuthenticatedUserId(makeSessionFetcher());
    const userA = await fetchAuthenticatedUserId(makeSessionFetcher(cookieA));
    const userB = await fetchAuthenticatedUserId(makeSessionFetcher(cookieB));
    assert.equal(unauthenticated, null, 'missing server session returns no identity');
    assert.ok(userA && userB && userA !== userB, 'distinct server sessions return distinct user IDs');
    const readIdentityA = () => fetchAuthenticatedUserId(makeSessionFetcher(cookieA));
    const readIdentityB = () => fetchAuthenticatedUserId(makeSessionFetcher(cookieB));

    const fakeIdb = new FakeIndexedDB();
    const localStorage = new MemoryStorage();
    const legacyNotes = JSON.stringify([{ id: 'legacy-note', bookId: 'legacy-only', pageNumber: 1, text: 'legacy note', createdAt: 'legacy' }]);
    const legacyProgress = JSON.stringify({ ...INITIAL_PROGRESS, totalPagesRead: 812 });
    const legacyBooks = JSON.stringify([{ id: 'legacy-book', title: 'legacy book' }]);
    localStorage.setItem('noon_notes_v1', legacyNotes);
    localStorage.setItem('noon_progress_v1', legacyProgress);
    localStorage.setItem('noon_user_local_books_v1', legacyBooks);
    localStorage.setItem('noon_last_opened_book_v1', 'legacy-book');

    const legacyDatabase = new FakeDatabase(LOCAL_STORE_CONFIG.DB_NAME, LOCAL_STORE_CONFIG.DB_VERSION);
    legacyDatabase.createObjectStore(LOCAL_STORE_CONFIG.STORES.LEGACY);
    const legacyBytes = Uint8Array.from([0, 37, 80, 68, 70, 45, 255, 10]);
    const legacyRecord = {
      id: 'legacy-only',
      data: legacyBytes,
      metadata: { fileName: 'legacy.pdf', marker: 'must-remain-byte-identical' },
    };
    legacyDatabase.stores.get(LOCAL_STORE_CONFIG.STORES.LEGACY)!.set(
      legacyRecord.id,
      clone(legacyRecord)
    );
    fakeIdb.databases.set(LOCAL_STORE_CONFIG.DB_NAME, legacyDatabase);

    const browserWindow = Object.assign(new EventTarget(), {
      indexedDB: fakeIdb,
      localStorage,
    });
    setGlobalProperty('window', browserWindow);
    setGlobalProperty('BroadcastChannel', undefined);

    const controllerA = new SchoolLibrarySessionController();
    const controllerB = new SchoolLibrarySessionController();
    const scopeA = controllerA.activate(userA as AuthenticatedUserId, readIdentityA);
    const scopeB = controllerB.activate(userB as AuthenticatedUserId, readIdentityB);
    const makePdf = (bytes: number[], fileName: string) => ({
      id: 'shared-document',
      fileName,
      fileSize: bytes.length,
      mimeType: 'application/pdf',
      fileBlob: new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' }),
      pageCount: 2,
      lastPage: 1,
      processingStatus: 'ready' as const,
      subject: 'Synthetic test',
      summary: 'Synthetic account isolation fixture',
    });
    const pdfA = [37, 80, 68, 70, 45, 65];
    const pdfB = [37, 80, 68, 70, 45, 66];
    await scopeA.documents.saveDocument(makePdf(pdfA, 'a-only.pdf'));
    await scopeA.documents.saveDocument({ ...makePdf([65, 45, 111, 110, 108, 121], 'only-a.pdf'), id: 'a-only' });
    await scopeB.documents.saveDocument(makePdf(pdfB, 'b-only.pdf'));
    await scopeB.documents.saveDocument({ ...makePdf([66, 45, 111, 110, 108, 121], 'only-b.pdf'), id: 'b-only' });

    const readBytes = async (documents: typeof scopeA.documents, id: string) => {
      const data = await documents.getDocumentData(id);
      return data ? Array.from(new Uint8Array(data)) : null;
    };

    let identityChecks = 0;
    let markIdentityCheckStarted!: () => void;
    let resolveDelayedIdentity!: () => void;
    const identityCheckStarted = new Promise<void>((resolve) => {
      markIdentityCheckStarted = resolve;
    });
    const delayedIdentity = new Promise<void>((resolve) => {
      resolveDelayedIdentity = resolve;
    });
    const readIdentityWithDelay = async (): Promise<AuthenticatedUserId | null> => {
      identityChecks += 1;
      if (identityChecks > 2) {
        markIdentityCheckStarted();
        await delayedIdentity;
      }
      return readIdentityA();
    };
    const fallbackController = new SchoolLibrarySessionController();
    const fallbackScope = fallbackController.activate(
      userA as AuthenticatedUserId,
      readIdentityWithDelay
    );
    fakeIdb.failNextOpen = 1;
    await fallbackScope.documents.saveDocument({
      ...makePdf([70, 65, 76, 76, 66, 65, 67, 75], 'fallback-only.pdf'),
      id: 'fallback-only',
    });
    fakeIdb.failNextOpen = 1;
    assert.deepEqual(
      await readBytes(fallbackScope.documents, 'fallback-only'),
      [70, 65, 76, 76, 66, 65, 67, 75],
      'a confirmed current identity may use the account memory fallback'
    );
    fakeIdb.failNextOpen = 1;
    const pendingFallbackRead = fallbackScope.documents.getDocumentData('fallback-only');
    await identityCheckStarted;
    fallbackController.invalidate();
    resolveDelayedIdentity();
    assert.equal(
      await pendingFallbackRead,
      null,
      'an IndexedDB failure must not expose memory fallback after the scope was invalidated'
    );

    const raceController = new SchoolLibrarySessionController();
    const raceScope = raceController.activate(userA as AuthenticatedUserId, readIdentityA);
    const pendingPdfRead = raceScope.documents.getDocumentData('a-only');
    const pendingDocumentList = raceScope.documents.getAllDocuments();
    raceController.invalidate();
    assert.equal(await pendingPdfRead, null, 'a pending PDF read is discarded after logout/revoke');
    assert.deepEqual(await pendingDocumentList, [], 'a pending metadata list is discarded after revoke');

    assert.deepEqual(await readBytes(scopeA.documents, 'shared-document'), pdfA);
    assert.deepEqual(await readBytes(scopeB.documents, 'shared-document'), pdfB);
    assert.notDeepEqual(await readBytes(scopeA.documents, 'shared-document'), await readBytes(scopeB.documents, 'shared-document'));
    assert.equal(await readBytes(scopeB.documents, 'a-only'), null, 'B cannot read A-only PDF');
    assert.equal(await readBytes(scopeA.documents, 'b-only'), null, 'A cannot read B-only PDF');
    assert.equal(await readBytes(scopeA.documents, 'legacy-only'), null, 'A cannot read legacy PDF');
    assert.equal(await readBytes(scopeB.documents, 'legacy-only'), null, 'B cannot read legacy PDF');
    assert.deepEqual(
      (await scopeA.documents.getAllDocuments()).map((document) => document.id).sort(),
      ['a-only', 'shared-document']
    );
    assert.deepEqual(
      (await scopeB.documents.getAllDocuments()).map((document) => document.id).sort(),
      ['b-only', 'shared-document']
    );
    assert.ok(fakeIdb.databases.has(accountDatabaseName(userA as AuthenticatedUserId)));
    assert.ok(fakeIdb.databases.has(accountDatabaseName(userB as AuthenticatedUserId)));

    const switchController = new SchoolLibrarySessionController();
    const switchingA = switchController.activate(userA as AuthenticatedUserId, readIdentityA);
    const switchingB = switchController.activate(userB as AuthenticatedUserId, readIdentityB);
    assert.deepEqual(await switchingA.documents.getAllDocuments(), [], 'switching away revokes A volatile state');
    assert.equal(await readBytes(switchingB.documents, 'a-only'), null, 'B remains isolated after A→B switch');
    assert.deepEqual(await readBytes(switchingB.documents, 'b-only'), [66, 45, 111, 110, 108, 121]);
    const switchedBackA = switchController.activate(userA as AuthenticatedUserId, readIdentityA);
    assert.deepEqual(await readBytes(switchedBackA.documents, 'a-only'), [65, 45, 111, 110, 108, 121]);
    switchController.invalidate();

    assert.deepEqual(scopeA.storage.getNotes(), [], 'school scope does not import legacy notes');
    assert.deepEqual(scopeB.storage.getNotes(), [], 'other school scope does not import legacy notes');
    assert.deepEqual(scopeA.storage.getProgress(), INITIAL_PROGRESS, 'school scope does not import legacy progress');
    assert.deepEqual(scopeB.storage.getProgress(), INITIAL_PROGRESS, 'other school scope does not import legacy progress');
    const noteA = scopeA.storage.addNote({ bookId: 'shared-document', pageNumber: 1, text: 'note A' });
    const noteB = scopeB.storage.addNote({ bookId: 'shared-document', pageNumber: 1, text: 'note B' });
    assert.equal(scopeA.storage.getNotes('shared-document')[0]?.text, 'note A');
    assert.equal(scopeB.storage.getNotes('shared-document')[0]?.text, 'note B');
    assert.notEqual(noteA.id, noteB.id);

    const progressA = { ...INITIAL_PROGRESS, totalPagesRead: 4, quizzesCompleted: 1 };
    const progressB = { ...INITIAL_PROGRESS, totalPagesRead: 9, quizzesCompleted: 2 };
    scopeA.storage.saveProgress(progressA);
    scopeB.storage.saveProgress(progressB);
    assert.deepEqual(scopeA.storage.getProgress(), progressA);
    assert.deepEqual(scopeB.storage.getProgress(), progressB);

    const adminBookId = scopeA.adminBooks.getBooks()[0].id;
    const accountAInitialPage = scopeA.adminBooks.getBookById(adminBookId)!.currentPage || 1;
    scopeA.adminBooks.updateBookPage(adminBookId, accountAInitialPage + 1);
    assert.equal(scopeA.adminBooks.getBookById(adminBookId)!.currentPage, accountAInitialPage + 1);
    assert.equal(scopeB.adminBooks.getBookById(adminBookId)!.currentPage, accountAInitialPage);

    assert.equal(localStorage.getItem('noon_notes_v1'), legacyNotes);
    assert.equal(localStorage.getItem('noon_progress_v1'), legacyProgress);
    assert.equal(localStorage.getItem('noon_user_local_books_v1'), legacyBooks);
    assert.equal(localStorage.getItem('noon_last_opened_book_v1'), 'legacy-book');
    assert.notEqual(
      accountStorageKey(userA as AuthenticatedUserId, 'notes_v1'),
      accountStorageKey(userB as AuthenticatedUserId, 'notes_v1')
    );
    const legacyAfter = legacyDatabase.stores.get(LOCAL_STORE_CONFIG.STORES.LEGACY)!.get('legacy-only') as typeof legacyRecord;
    assert.deepEqual(Array.from(legacyAfter.data), Array.from(legacyBytes), 'legacy PDF bytes remain unchanged');
    assert.deepEqual(legacyAfter.metadata, legacyRecord.metadata, 'legacy metadata remains unchanged');

    // A non-/me 401 emits a local invalidation signal, as do explicit logout notifications.
    const unsubscribe = subscribeToSchoolSessionChanges(() => controllerB.invalidate());
    globalThis.fetch = async () => new Response('expired', { status: 401 });
    await request('/api/accounts/logout', { method: 'POST' });
    assert.equal(controllerB.currentScope, null, '401 invalidates the active account scope');
    assert.deepEqual(await scopeB.documents.getAllDocuments(), [], 'revoked scope exposes no document state');
    assert.deepEqual(scopeB.storage.getNotes(), [], 'revoked scope exposes no note state');
    assert.deepEqual(scopeB.storage.getProgress(), INITIAL_PROGRESS, 'revoked scope exposes no prior progress state');
    await assert.rejects(
      scopeB.documents.saveDocument(makePdf([1], 'revoked.pdf')),
      /session is locked/i
    );

    const reactivatedB = controllerB.activate(userB as AuthenticatedUserId, readIdentityB);
    assert.deepEqual(await readBytes(reactivatedB.documents, 'b-only'), [66, 45, 111, 110, 108, 121]);
    assert.deepEqual(reactivatedB.storage.getNotes().map((note) => note.text), ['note B']);
    broadcastSchoolSessionChange();
    assert.equal(controllerB.currentScope, null, 'logout signal also invalidates the active scope');
    unsubscribe();

    let meNotifications = 0;
    const unsubscribeMe = subscribeToSchoolSessionChanges(() => { meNotifications += 1; });
    await request('/api/accounts/me');
    assert.equal(meNotifications, 0, '/me 401 does not rebroadcast and cause cross-tab ping-pong');
    unsubscribeMe();
    controllerA.invalidate();
  } finally {
    globalThis.fetch = originalFetch;
    restoreGlobalProperty('window', windowDescriptor);
    restoreGlobalProperty('BroadcastChannel', broadcastDescriptor);
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    store?.db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
