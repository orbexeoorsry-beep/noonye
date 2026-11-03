export interface LocalDocumentRecord {
  id: string;
  title: string;
  subject?: string;
  gradeLevel?: string;
  fileData: ArrayBuffer | Uint8Array;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalPages: number;
  currentPage: number;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
}

export type LocalDocumentMetadata = Omit<LocalDocumentRecord, 'fileData'>;
