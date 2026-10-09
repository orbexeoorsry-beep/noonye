import { Book, AdminBook, LocalBook, StudentProgress, UserNote } from '../types';
import { AdminBookStore } from './adminBookStore';
import { INITIAL_PROGRESS } from '../mock-data/progress';

const STORAGE_KEYS = {
  USER_LOCAL_BOOKS: 'noon_user_local_books_v1',
  PROGRESS: 'noon_progress_v1',
  NOTES: 'noon_notes_v1',
  LAST_OPENED_BOOK: 'noon_last_opened_book_v1',
};

// In-memory fallback if localStorage is unavailable (e.g. testing or private browsing)
const memoryStorage = new Map<string, string>();

const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fall through to in-memory
    }
    return memoryStorage.get(key) || null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Fall through
    }
    memoryStorage.set(key, value);
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Fall through
    }
    memoryStorage.delete(key);
  },
};

export const storageService = {
  /**
   * Retrieves all books by querying AdminBookStore and user local books.
   * Both sources are clearly identified with `source: 'admin'` or `source: 'local'`.
   */
  getBooks(): Book[] {
    const adminBooks: AdminBook[] = AdminBookStore.getBooks();
    const localUserBooks: LocalBook[] = this.getLocalBooks();
    return [...adminBooks, ...localUserBooks];
  },

  /**
   * Retrieves only user local books from cache/storage
   */
  getLocalBooks(): LocalBook[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.USER_LOCAL_BOOKS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map((b) => ({
            ...b,
            source: 'local' as const,
            status: 'local' as const,
            sourceType: 'local-user-book' as const,
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load local books cache', e);
    }
    return [];
  },

  /**
   * Saves user local books strictly isolated from admin books
   */
  saveLocalBooks(localBooks: LocalBook[]): void {
    try {
      // Ensure no admin books ever leak into user local books
      const pureLocalBooks = localBooks.filter((b) => b.source === 'local');
      safeStorage.setItem(STORAGE_KEYS.USER_LOCAL_BOOKS, JSON.stringify(pureLocalBooks));
    } catch (e) {
      console.error('Failed to save user local books', e);
    }
  },

  /**
   * Adds a new local book to the user's local collection
   */
  addBook(newBook: Book): Book[] {
    if (newBook.source === 'local') {
      const localBooks = this.getLocalBooks();
      const pureLocalBook: LocalBook = {
        ...newBook,
        source: 'local',
        status: 'local',
        sourceType: 'local-user-book',
        fileSize: newBook.fileSize || 0,
        mimeType: newBook.mimeType || 'application/pdf',
      };
      const filtered = localBooks.filter((b) => b.id !== pureLocalBook.id);
      this.saveLocalBooks([pureLocalBook, ...filtered]);
    }
    return this.getBooks();
  },

  /**
   * Deletes a user local book (Admin books are strictly protected from deletion)
   */
  deleteBook(bookId: string): Book[] {
    // If it's an admin book, refuse deletion
    if (AdminBookStore.isAdminBook(bookId)) {
      console.warn('Admin books cannot be deleted');
      return this.getBooks();
    }

    const localBooks = this.getLocalBooks();
    const updated = localBooks.filter((b) => b.id !== bookId);
    this.saveLocalBooks(updated);
    return this.getBooks();
  },

  /**
   * Updates reading progress for either an admin book or a local book
   */
  updateBookPage(bookId: string, pageNumber: number): void {
    if (AdminBookStore.isAdminBook(bookId)) {
      AdminBookStore.updateBookPage(bookId, pageNumber);
      return;
    }

    const localBooks = this.getLocalBooks();
    const updated = localBooks.map((b) => {
      if (b.id === bookId) {
        const progress = Math.min(100, Math.round((pageNumber / b.totalPages) * 100));
        return {
          ...b,
          currentPage: pageNumber,
          progressPercent: progress,
          lastOpened: 'الآن',
        };
      }
      return b;
    });
    this.saveLocalBooks(updated);
  },

  getProgress(): StudentProgress {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }
    return INITIAL_PROGRESS;
  },

  saveProgress(progress: StudentProgress): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    } catch (e) {
      console.error('Failed to save progress', e);
    }
  },

  getNotes(bookId?: string, pageNumber?: number): UserNote[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.NOTES);
      if (data) {
        const notes: UserNote[] = JSON.parse(data);
        if (bookId && pageNumber !== undefined) {
          return notes.filter((n) => n.bookId === bookId && n.pageNumber === pageNumber);
        }
        if (bookId) {
          return notes.filter((n) => n.bookId === bookId);
        }
        return notes;
      }
    } catch {
      // Fallback
    }
    return [];
  },

  addNote(note: Omit<UserNote, 'id' | 'createdAt'>): UserNote {
    const currentNotes = this.getNotes();
    const newNote: UserNote = {
      ...note,
      id: 'note_' + Date.now(),
      createdAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [newNote, ...currentNotes];
    try {
      safeStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save note', e);
    }
    return newNote;
  },

  deleteNote(noteId: string): void {
    const currentNotes = this.getNotes();
    const updated = currentNotes.filter((n) => n.id !== noteId);
    try {
      safeStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete note', e);
    }
  },
};

