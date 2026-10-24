import type { AuthenticatedUserId } from './accountScope';
import {
  AdminBookStore,
  createAccountAdminBookStore,
  type AccountAdminBookStore,
} from './adminBookStore';
import {
  localDocumentStore,
  createAccountLocalDocumentStore,
  type AccountLocalDocumentStore,
} from './local-document-store';
import {
  storageService,
  createAccountStorageService,
  type AccountStorageService,
} from './storage';

export interface AccountLibraryScope {
  readonly userId: AuthenticatedUserId;
  readonly documents: AccountLocalDocumentStore;
  readonly storage: AccountStorageService;
  readonly adminBooks: AccountAdminBookStore;
  revoke(): void;
}

export function createAccountLibraryScope(
  userId: AuthenticatedUserId
): AccountLibraryScope {
  const documents = createAccountLocalDocumentStore(userId);
  const storage = createAccountStorageService(userId);
  const adminBooks = createAccountAdminBookStore(userId);
  let revoked = false;

  return {
    userId,
    documents,
    storage,
    adminBooks,
    revoke() {
      if (revoked) return;
      revoked = true;
      documents.revoke();
      storage.revoke();
      adminBooks.revoke();
    },
  };
}

/** Owns the one currently authenticated scope; invalidation never deletes persistent records. */
export class SchoolLibrarySessionController {
  private activeScope: AccountLibraryScope | null = null;

  get currentScope(): AccountLibraryScope | null {
    return this.activeScope;
  }

  activate(userId: AuthenticatedUserId): AccountLibraryScope {
    if (this.activeScope?.userId === userId) return this.activeScope;
    this.invalidate();
    this.activeScope = createAccountLibraryScope(userId);
    return this.activeScope;
  }

  invalidate(): void {
    this.activeScope?.revoke();
    this.activeScope = null;
    // Clear volatile compatibility caches only; never remove localStorage or IndexedDB records.
    localDocumentStore.clearMemoryCache();
    storageService.clearMemoryCache();
    AdminBookStore.clearMemoryCache();
  }
}
