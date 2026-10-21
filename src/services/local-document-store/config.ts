/**
 * Local Document Store Configuration
 * Centralized settings for local user PDF storage
 */

export const LOCAL_STORE_CONFIG = {
  DB_NAME: 'noon_learning_db',
  DB_VERSION: 2, // Upgraded versioned schema
  STORES: {
    METADATA: 'documents_metadata',
    BLOBS: 'documents_blobs',
    LEGACY: 'pdf_documents', // For backwards compatibility & migration
  },
  MAX_FILE_SIZE_BYTES: 150 * 1024 * 1024, // 150MB maximum file size limit
  ALLOWED_MIME_TYPES: ['application/pdf', 'application/x-pdf'],
  SOURCE_TYPE: 'local-user-book' as const,
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}
