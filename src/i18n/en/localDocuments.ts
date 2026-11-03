import { LocalDocumentsTranslations } from '../types';

export const localDocuments: LocalDocumentsTranslations = {
  storageNotice: 'Files are saved locally on your device for absolute privacy and fast access.',
  uploadTitle: 'Add PDF Textbook',
  uploadSubtitle: 'Select or drag your textbook file to begin immediately',
  dropActive: 'Drop file here to start...',
  selectFileBtn: 'Select PDF File',
  sizeLimitNotice: 'Supports PDF textbooks up to 100 MB',
  deleteConfirm: 'Are you sure you want to delete this book and notes from your device?',
  deleteSuccess: 'Book deleted successfully from your device.',
  saveSuccess: 'Book saved locally and ready for studying.',
  savedLocally: 'Saved locally on this device',
  dragDropDesktop: 'Drag & drop PDF here, or click to browse',
  mobileUploadBtn: 'Choose PDF from Phone',
  fileSupported: 'Supports school textbooks up to 100 MB',
  sampleQuickPickTitle: 'Or choose a ready sample curriculum:',
  processingTitle: 'Processing textbook...',
  processingSteps: {
    reading: 'Reading pages and chapters...',
    extracting: 'Extracting figures and formulas...',
    indexing: 'Preparing the locally stored book for reading...',
  },
  successTitle: 'Book Prepared Successfully!',
  successDesc: 'Your book is ready to read locally. Explanation tools are currently unavailable.',
  successAction: 'Open Book in Viewer',
  errorTitle: 'Failed to load file',
  errorDesc: 'An error occurred while reading the textbook file. Please verify the file and try again.',
  errorRetry: 'Retry',
  addAnotherBook: 'Add Another Book',
};

export default localDocuments;
