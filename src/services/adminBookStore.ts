import { AdminBook } from '../types';
import { INITIAL_ADMIN_BOOKS } from '../mock-data/books';

const ADMIN_STORAGE_KEYS = {
  ADMIN_BOOKS_STATE: 'noon_admin_books_state_v1',
};

const adminMemoryStorage = new Map<string, string>();

const safeAdminStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fall through
    }
    return adminMemoryStorage.get(key) || null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Fall through
    }
    adminMemoryStorage.set(key, value);
  },
};

/**
 * AdminBookStore: Dedicated store for Noon platform curated curricula / admin books.
 * Strictly manages mock / pre-configured curriculum books.
 * Does not manage or store user local uploads.
 */
export const AdminBookStore = {
  /**
   * Retrieves all admin / curated books.
   * State (current page, reading progress) is stored separately to preserve user reading position
   * without altering the immutable admin catalog.
   */
  getBooks(): AdminBook[] {
    try {
      const savedState = safeAdminStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_BOOKS_STATE);
      if (savedState) {
        const stateMap: Record<
          string,
          { currentPage?: number; progressPercent?: number; lastOpened?: string }
        > = JSON.parse(savedState);

        return INITIAL_ADMIN_BOOKS.map((book) => {
          const userProgress = stateMap[book.id];
          if (userProgress) {
            return {
              ...book,
              source: 'admin' as const,
              status: 'demo' as const,
              currentPage: userProgress.currentPage ?? book.currentPage,
              progressPercent: userProgress.progressPercent ?? book.progressPercent,
              lastOpened: userProgress.lastOpened ?? book.lastOpened,
            };
          }
          return {
            ...book,
            source: 'admin' as const,
            status: 'demo' as const,
          };
        });
      }
    } catch (e) {
      console.warn('AdminBookStore: Could not load reading state', e);
    }

    return INITIAL_ADMIN_BOOKS.map((book) => ({
      ...book,
      source: 'admin' as const,
      status: 'demo' as const,
    }));
  },

  /**
   * Finds a specific admin book by ID
   */
  getBookById(bookId: string): AdminBook | null {
    const books = this.getBooks();
    return books.find((b) => b.id === bookId) || null;
  },

  /**
   * Updates reading progress for an admin book (without modifying original curriculum content)
   */
  updateBookPage(bookId: string, pageNumber: number): void {
    try {
      const savedState = safeAdminStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_BOOKS_STATE);
      const stateMap: Record<
        string,
        { currentPage?: number; progressPercent?: number; lastOpened?: string }
      > = savedState ? JSON.parse(savedState) : {};

      const target = INITIAL_ADMIN_BOOKS.find((b) => b.id === bookId);
      if (target) {
        const progress = Math.min(100, Math.round((pageNumber / target.totalPages) * 100));
        stateMap[bookId] = {
          currentPage: pageNumber,
          progressPercent: progress,
          lastOpened: 'الآن',
        };
        safeAdminStorage.setItem(ADMIN_STORAGE_KEYS.ADMIN_BOOKS_STATE, JSON.stringify(stateMap));
      }
    } catch (e) {
      console.error('AdminBookStore: Failed to save progress', e);
    }
  },

  /**
   * Checks if a book ID belongs to an admin book
   */
  isAdminBook(bookId: string): boolean {
    return INITIAL_ADMIN_BOOKS.some((b) => b.id === bookId);
  },
};

export default AdminBookStore;
