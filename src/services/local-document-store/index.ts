/**
 * LocalDocumentStore - Robust IndexedDB Implementation
 * Implements versioned schema, separated metadata and blob storage,
 * in-memory fallback, and full lifecycle methods for local user PDF books.
 */

import {
  LocalBookMetadata,
  LocalUserBookRecord,
  LocalDocumentStoreInterface,
  StorageUsageInfo,
} from './types';
import { LOCAL_STORE_CONFIG, formatFileSize } from './config';

// In-memory fallback if IndexedDB is unavailable
const memoryMetadataStore = new Map<string, LocalBookMetadata>();
const memoryBlobStore = new Map<string, Blob>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(
      LOCAL_STORE_CONFIG.DB_NAME,
      LOCAL_STORE_CONFIG.DB_VERSION
    );

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      // Create metadata store
      if (!db.objectStoreNames.contains(LOCAL_STORE_CONFIG.STORES.METADATA)) {
        const metaStore = db.createObjectStore(LOCAL_STORE_CONFIG.STORES.METADATA, {
          keyPath: 'id',
        });
        metaStore.createIndex('lastOpenedAt', 'lastOpenedAt', { unique: false });
        metaStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create blobs store
      if (!db.objectStoreNames.contains(LOCAL_STORE_CONFIG.STORES.BLOBS)) {
        db.createObjectStore(LOCAL_STORE_CONFIG.STORES.BLOBS, { keyPath: 'id' });
      }

      // Handle migration from legacy v1 schema if present
      if (oldVersion < 2 && db.objectStoreNames.contains(LOCAL_STORE_CONFIG.STORES.LEGACY)) {
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction) {
          try {
            const legacyStore = transaction.objectStore(LOCAL_STORE_CONFIG.STORES.LEGACY);
            const cursorRequest = legacyStore.openCursor();
            cursorRequest.onsuccess = (e) => {
              const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                const legacyRecord = cursor.value;
                if (legacyRecord && legacyRecord.id) {
                  const meta: LocalBookMetadata = {
                    id: legacyRecord.id,
                    fileName: legacyRecord.metadata?.name || legacyRecord.id,
                    fileSize: legacyRecord.metadata?.size || 0,
                    mimeType: 'application/pdf',
                    pageCount: legacyRecord.metadata?.totalPages || 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastOpenedAt: legacyRecord.metadata?.lastOpened || new Date().toISOString(),
                    lastPage: legacyRecord.metadata?.lastPage || 1,
                    processingStatus: 'ready',
                    sourceType: LOCAL_STORE_CONFIG.SOURCE_TYPE,
                  };

                  const metaStore = transaction.objectStore(LOCAL_STORE_CONFIG.STORES.METADATA);
                  const blobStore = transaction.objectStore(LOCAL_STORE_CONFIG.STORES.BLOBS);

                  metaStore.put(meta);
                  if (legacyRecord.data) {
                    const blob = new Blob([legacyRecord.data], { type: 'application/pdf' });
                    blobStore.put({ id: legacyRecord.id, blob });
                  }
                }
                cursor.continue();
              }
            };
          } catch {
            // Ignore migration error and continue
          }
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('IndexedDB database upgrade blocked by other open tabs');
    };
  });
}

class LocalDocumentStoreService implements LocalDocumentStoreInterface {
  /**
   * Saves a new or updated document to IndexedDB with separated metadata and blob
   */
  async saveDocument(
    idOrDoc:
      | string
      | (Omit<LocalUserBookRecord, 'createdAt' | 'updatedAt' | 'lastOpenedAt' | 'sourceType'> & {
          createdAt?: string;
          updatedAt?: string;
          lastOpenedAt?: string;
          sourceType?: 'local-user-book';
        }),
    fileNameArg?: string,
    fileSizeArg?: number,
    dataArg?: ArrayBuffer | Uint8Array | Blob,
    pageCountArg?: number,
    lastPageArg?: number
  ): Promise<LocalBookMetadata> {
    const now = new Date().toISOString();
    let docId: string;
    let fileName: string;
    let fileSize: number;
    let fileBlob: Blob;
    let pageCount: number;
    let lastPage: number;
    let mimeType = 'application/pdf';
    let subject: string | undefined;
    let summary: string | undefined;
    let thumbnail: string | null = null;
    let processingStatus: 'ready' | 'processing' | 'error' = 'ready';
    let createdAt: string = now;
    let updatedAt: string = now;
    let lastOpenedAt: string = now;

    if (typeof idOrDoc === 'string') {
      docId = idOrDoc;
      fileName = fileNameArg || idOrDoc;
      fileSize = fileSizeArg || 0;
      pageCount = pageCountArg || 1;
      lastPage = lastPageArg || 1;
      if (dataArg instanceof Blob) {
        fileBlob = dataArg;
      } else if (dataArg) {
        const part: BlobPart = dataArg instanceof Uint8Array ? (dataArg.buffer as ArrayBuffer) : dataArg;
        fileBlob = new Blob([part], { type: 'application/pdf' });
      } else {
        fileBlob = new Blob([], { type: 'application/pdf' });
      }
    } else {
      docId = idOrDoc.id;
      fileName = idOrDoc.fileName;
      fileSize = idOrDoc.fileSize;
      fileBlob = idOrDoc.fileBlob;
      pageCount = idOrDoc.pageCount;
      lastPage = idOrDoc.lastPage || 1;
      mimeType = idOrDoc.mimeType || 'application/pdf';
      subject = idOrDoc.subject;
      summary = idOrDoc.summary;
      thumbnail = idOrDoc.thumbnail || null;
      processingStatus = idOrDoc.processingStatus || 'ready';
      createdAt = idOrDoc.createdAt || now;
      updatedAt = idOrDoc.updatedAt || now;
      lastOpenedAt = idOrDoc.lastOpenedAt || now;
    }

    const metadata: LocalBookMetadata = {
      id: docId,
      fileName,
      fileSize,
      mimeType,
      pageCount,
      createdAt,
      updatedAt,
      lastOpenedAt,
      lastPage,
      processingStatus,
      sourceType: LOCAL_STORE_CONFIG.SOURCE_TYPE,
      thumbnail,
      subject,
      summary,
    };

    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(
          [LOCAL_STORE_CONFIG.STORES.METADATA, LOCAL_STORE_CONFIG.STORES.BLOBS],
          'readwrite'
        );

        const metaStore = tx.objectStore(LOCAL_STORE_CONFIG.STORES.METADATA);
        const blobStore = tx.objectStore(LOCAL_STORE_CONFIG.STORES.BLOBS);

        metaStore.put(metadata);
        blobStore.put({ id: docId, blob: fileBlob });

        tx.oncomplete = () => resolve(metadata);
        tx.onerror = () => {
          if (tx.error?.name === 'QuotaExceededError') {
            reject(
              new Error('مساحة تخزين المتصفح ممتلئة. يرجى حذف بعض الملفات لتوفير مساحة.')
            );
          } else {
            reject(tx.error);
          }
        };
      });
    } catch {
      // Memory fallback
      memoryMetadataStore.set(docId, metadata);
      memoryBlobStore.set(docId, fileBlob);
      return metadata;
    }
  }

  /**
   * Retrieves full document record including file blob
   */
  async getDocument(id: string): Promise<LocalUserBookRecord | null> {
    const metadata = await this.getDocumentMetadata(id);
    if (!metadata) return null;

    const fileBlob = await this.getDocumentBlob(id);
    if (!fileBlob) return null;

    return {
      ...metadata,
      fileBlob,
    };
  }

  /**
   * Retrieves document metadata without loading the large file blob into memory
   */
  async getDocumentMetadata(id: string): Promise<LocalBookMetadata | null> {
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_STORE_CONFIG.STORES.METADATA, 'readonly');
        const store = tx.objectStore(LOCAL_STORE_CONFIG.STORES.METADATA);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return memoryMetadataStore.get(id) || null;
    }
  }

  /**
   * Retrieves the raw file Blob
   */
  async getDocumentBlob(id: string): Promise<Blob | null> {
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_STORE_CONFIG.STORES.BLOBS, 'readonly');
        const store = tx.objectStore(LOCAL_STORE_CONFIG.STORES.BLOBS);
        const request = store.get(id);

        request.onsuccess = () => {
          if (request.result && request.result.blob) {
            resolve(request.result.blob);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return memoryBlobStore.get(id) || null;
    }
  }

  /**
   * Retrieves document as ArrayBuffer for PDF.js viewer
   */
  async getDocumentData(id: string): Promise<ArrayBuffer | null> {
    const blob = await this.getDocumentBlob(id);
    if (!blob) return null;
    return await blob.arrayBuffer();
  }

  /**
   * Gets all saved documents metadata sorted by lastOpenedAt descending
   */
  async getAllDocuments(): Promise<LocalBookMetadata[]> {
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_STORE_CONFIG.STORES.METADATA, 'readonly');
        const store = tx.objectStore(LOCAL_STORE_CONFIG.STORES.METADATA);
        const request = store.getAll();

        request.onsuccess = () => {
          const list: LocalBookMetadata[] = request.result || [];
          list.sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime());
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      const list = Array.from(memoryMetadataStore.values());
      list.sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime());
      return list;
    }
  }

  /**
   * Updates document metadata fields
   */
  async updateDocument(
    id: string,
    updates: Partial<Omit<LocalBookMetadata, 'id' | 'createdAt'>>
  ): Promise<LocalBookMetadata | null> {
    const current = await this.getDocumentMetadata(id);
    if (!current) return null;

    const updated: LocalBookMetadata = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_STORE_CONFIG.STORES.METADATA, 'readwrite');
        const store = tx.objectStore(LOCAL_STORE_CONFIG.STORES.METADATA);
        const request = store.put(updated);

        request.onsuccess = () => resolve(updated);
        request.onerror = () => reject(request.error);
      });
    } catch {
      memoryMetadataStore.set(id, updated);
      return updated;
    }
  }

  /**
   * Deletes a document and its associated binary blob from IndexedDB
   */
  async deleteDocument(id: string): Promise<boolean> {
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(
          [LOCAL_STORE_CONFIG.STORES.METADATA, LOCAL_STORE_CONFIG.STORES.BLOBS],
          'readwrite'
        );

        tx.objectStore(LOCAL_STORE_CONFIG.STORES.METADATA).delete(id);
        tx.objectStore(LOCAL_STORE_CONFIG.STORES.BLOBS).delete(id);

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      const existed = memoryMetadataStore.has(id);
      memoryMetadataStore.delete(id);
      memoryBlobStore.delete(id);
      return existed;
    }
  }

  /**
   * Clears all local user documents and blobs
   */
  async clearAllDocuments(): Promise<number> {
    const count = (await this.getAllDocuments()).length;
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(
          [LOCAL_STORE_CONFIG.STORES.METADATA, LOCAL_STORE_CONFIG.STORES.BLOBS],
          'readwrite'
        );

        tx.objectStore(LOCAL_STORE_CONFIG.STORES.METADATA).clear();
        tx.objectStore(LOCAL_STORE_CONFIG.STORES.BLOBS).clear();

        tx.oncomplete = () => resolve(count);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      const memoryCount = memoryMetadataStore.size;
      memoryMetadataStore.clear();
      memoryBlobStore.clear();
      return memoryCount;
    }
  }

  /**
   * Saves the student's last read page and updates lastOpenedAt
   */
  async saveLastPage(id: string, pageNumber: number): Promise<void> {
    try {
      await this.updateDocument(id, {
        lastPage: pageNumber,
        lastOpenedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Notice: could not persist last page to IndexedDB', e);
    }
  }

  /**
   * Alias for saveLastPage for backwards compatibility
   */
  async updateLastPage(id: string, pageNumber: number): Promise<void> {
    return this.saveLastPage(id, pageNumber);
  }

  /**
   * Gets the last read page for a document
   */
  async getLastPage(id: string): Promise<number> {
    const doc = await this.getDocumentMetadata(id);
    return doc?.lastPage || 1;
  }

  /**
   * Retrieves all user local books formatted as LocalBook type
   * strictly from IndexedDB, isolated from admin books.
   */
  async getLocalBooks(): Promise<import('../../types').LocalBook[]> {
    const docs = await this.getAllDocuments();
    return docs.map((doc) => ({
      id: doc.id,
      source: 'local' as const,
      title: doc.fileName,
      subject: doc.subject || 'منهاج دراسي محلي',
      gradeLevel: 'المرحلة الدراسية',
      totalPages: doc.pageCount,
      currentPage: doc.lastPage || 1,
      progressPercent: Math.min(
        100,
        Math.round(((doc.lastPage || 1) / (doc.pageCount || 1)) * 100)
      ),
      status: 'local' as const,
      lastOpened: 'محلي',
      summary:
        doc.summary ||
        `كتاب دراسي محفوظ محلياً على هذا الجهاز (${doc.pageCount} صفحة).`,
      accentColor: '#4338ca',
      fileSize: doc.fileSize,
      sourceType: 'local-user-book' as const,
      lastOpenedAt: doc.lastOpenedAt,
      mimeType: doc.mimeType || 'application/pdf',
      pages: [
        {
          pageNumber: 1,
          chapterTitle: 'المحتوى المحلي',
          lessonTitle: doc.fileName,
          elements: [],
        },
      ],
    }));
  }

  /**
   * Calculates total local storage usage in IndexedDB
   */
  async getStorageUsage(): Promise<StorageUsageInfo> {
    const docs = await this.getAllDocuments();
    const totalBytes = docs.reduce((acc, d) => acc + (d.fileSize || 0), 0);
    return {
      totalBytes,
      documentCount: docs.length,
      formattedTotal: formatFileSize(totalBytes),
    };
  }
}

export const localDocumentStore = new LocalDocumentStoreService();
export const LocalDocumentStore = localDocumentStore;
export default localDocumentStore;
