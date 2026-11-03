import { AdminBook } from '../types';
import { INITIAL_ADMIN_BOOKS } from '../mock-data/books';
import { accountStorageKey, type AuthenticatedUserId } from './accountScope';

const LEGACY_ADMIN_BOOKS_STATE_KEY = 'noon_admin_books_state_v1';

type AdminBookProgress = {
  currentPage?: number;
  progressPercent?: number;
  lastOpened?: string;
};

type AdminBookState = Record<string, AdminBookProgress>;
type AdminStorageAdapter = Pick<Storage, 'getItem' | 'setItem'>;

export interface AccountAdminBookStore {
  getBooks(): AdminBook[];
  getBookById(bookId: string): AdminBook | null;
  updateBookPage(bookId: string, pageNumber: number): void;
  isAdminBook(bookId: string): boolean;
  clearMemoryCache(): void;
  revoke(): void;
}

function createAdminBookStore(
  storageKey: string,
  adapter?: AdminStorageAdapter
): AccountAdminBookStore {
  const fallback = new Map<string, string>();
  let active = true;
  let persistent: AdminStorageAdapter | null = adapter || null;
  if (!persistent) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        persistent = window.localStorage;
      }
    } catch {
      persistent = null;
    }
  }

  const readState = (): string | null => {
    if (!active) return null;
    try {
      const value = persistent?.getItem(storageKey);
      if (value !== null && value !== undefined) {
        fallback.set(storageKey, value);
        return value;
      }
    } catch {
      // Use the instance-specific fallback.
    }
    return fallback.get(storageKey) ?? null;
  };

  const writeState = (value: string): void => {
    if (!active) return;
    fallback.set(storageKey, value);
    try {
      persistent?.setItem(storageKey, value);
    } catch {
      // Keep the fallback local to this account store instance.
    }
  };

  const baseBooks = (): AdminBook[] =>
    INITIAL_ADMIN_BOOKS.map((book) => ({
      ...book,
      source: 'admin' as const,
      status: 'demo' as const,
    }));

  return {
    getBooks(): AdminBook[] {
      const savedState = readState();
      if (!savedState) return baseBooks();
      try {
        const stateMap: AdminBookState = JSON.parse(savedState);
        return INITIAL_ADMIN_BOOKS.map((book) => {
          const userProgress = stateMap[book.id];
          if (!userProgress) {
            return { ...book, source: 'admin' as const, status: 'demo' as const };
          }
          return {
            ...book,
            source: 'admin' as const,
            status: 'demo' as const,
            currentPage: userProgress.currentPage ?? book.currentPage,
            progressPercent: userProgress.progressPercent ?? book.progressPercent,
            lastOpened: userProgress.lastOpened ?? book.lastOpened,
          };
        });
      } catch (error) {
        console.warn('AdminBookStore: Could not load reading state', error);
        return baseBooks();
      }
    },

    getBookById(bookId: string): AdminBook | null {
      return this.getBooks().find((book) => book.id === bookId) || null;
    },

    updateBookPage(bookId: string, pageNumber: number): void {
      if (!active) return;
      try {
        const savedState = readState();
        const stateMap: AdminBookState = savedState ? JSON.parse(savedState) : {};
        const target = INITIAL_ADMIN_BOOKS.find((book) => book.id === bookId);
        if (!target) return;
        const progress = Math.min(100, Math.round((pageNumber / target.totalPages) * 100));
        stateMap[bookId] = {
          currentPage: pageNumber,
          progressPercent: progress,
          lastOpened: 'الآن',
        };
        writeState(JSON.stringify(stateMap));
      } catch (error) {
        console.error('AdminBookStore: Failed to save progress', error);
      }
    },

    isAdminBook(bookId: string): boolean {
      return INITIAL_ADMIN_BOOKS.some((book) => book.id === bookId);
    },

    clearMemoryCache(): void {
      fallback.clear();
    },

    revoke(): void {
      active = false;
      fallback.clear();
    },
  };
}

/** Legacy, unscoped store remains available only to older/non-account callers. */
export const AdminBookStore = createAdminBookStore(LEGACY_ADMIN_BOOKS_STATE_KEY);

export function createAccountAdminBookStore(
  userId: AuthenticatedUserId
): AccountAdminBookStore {
  return createAdminBookStore(accountStorageKey(userId, 'admin_books_state_v1'));
}

export default AdminBookStore;
