/**
 * Types definition for Local User Books in IndexedDB
 */

export type SourceType = 'local-user-book';

export type ProcessingStatus = 'ready' | 'processing' | 'error';

export interface LocalBookMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  lastPage: number;
  processingStatus: ProcessingStatus;
  sourceType: SourceType;
  thumbnail?: string | null;
  subject?: string;
  summary?: string;
}

export interface LocalUserBookRecord extends LocalBookMetadata {
  fileBlob: Blob;
}

export interface StorageUsageInfo {
  totalBytes: number;
  documentCount: number;
  formattedTotal: string;
}

export interface LocalDocumentStoreInterface {
  saveDocument(
    doc: Omit<LocalUserBookRecord, 'createdAt' | 'updatedAt' | 'lastOpenedAt' | 'sourceType'> & {
      createdAt?: string;
      updatedAt?: string;
      lastOpenedAt?: string;
      sourceType?: SourceType;
    }
  ): Promise<LocalBookMetadata>;

  saveDocument(
    idOrDoc:
      | string
      | (Omit<LocalUserBookRecord, 'createdAt' | 'updatedAt' | 'lastOpenedAt' | 'sourceType'> & {
          createdAt?: string;
          updatedAt?: string;
          lastOpenedAt?: string;
          sourceType?: SourceType;
        }),
    fileName?: string,
    fileSize?: number,
    data?: ArrayBuffer | Uint8Array | Blob,
    pageCount?: number,
    lastPage?: number
  ): Promise<LocalBookMetadata>;

  getDocument(id: string): Promise<LocalUserBookRecord | null>;

  getDocumentMetadata(id: string): Promise<LocalBookMetadata | null>;

  getDocumentBlob(id: string): Promise<Blob | null>;

  getDocumentData(id: string): Promise<ArrayBuffer | null>;

  getAllDocuments(): Promise<LocalBookMetadata[]>;

  updateDocument(
    id: string,
    updates: Partial<Omit<LocalBookMetadata, 'id' | 'createdAt'>>
  ): Promise<LocalBookMetadata | null>;

  deleteDocument(id: string): Promise<boolean>;

  clearAllDocuments(): Promise<number>;

  saveLastPage(id: string, pageNumber: number): Promise<void>;

  updateLastPage(id: string, pageNumber: number): Promise<void>;

  getLastPage(id: string): Promise<number>;

  getStorageUsage(): Promise<StorageUsageInfo>;
}
