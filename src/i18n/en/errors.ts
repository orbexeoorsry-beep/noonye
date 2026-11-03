import { ErrorsTranslations } from '../types';

export const errors: ErrorsTranslations = {
  invalidPdf: 'Selected file is not a valid PDF or may be corrupted.',
  fileTooLarge: 'File size exceeds maximum allowed limit (100 MB).',
  networkError: 'Network connection error. Please verify your connection.',
  connectionFailed: 'Assistant and explanation tools are currently unavailable.',
  readingError: 'An error occurred while reading and processing the textbook.',
  unclearSelection: 'The selection is unclear or too small. Please select a larger region and try again.',
  unknownError: 'An unexpected error occurred. Please try again.',
  fileTooBigError: 'File size exceeds 100 MB limit.',
  invalidPageError: 'Invalid page number entered.',
  retryAction: 'Retry',
};

export default errors;
