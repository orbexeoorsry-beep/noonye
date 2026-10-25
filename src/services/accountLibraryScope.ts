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
  type AccountIdentityValidator,
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
  userId: AuthenticatedUserId,
  validateIdentity: AccountIdentityValidator
): AccountLibraryScope {
  const documents = createAccountLocalDocumentStore(userId, validateIdentity);
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

  activate(
    userId: AuthenticatedUserId,
    readCurrentIdentity: () => Promise<AuthenticatedUserId | null>
  ): AccountLibraryScope {
    if (this.activeScope?.userId === userId) return this.activeScope;
    this.invalidate();
    let scope: AccountLibraryScope | null = null;
    const validateIdentity: AccountIdentityValidator = async () => {
      const expectedScope = scope;
      if (!expectedScope || this.activeScope !== expectedScope) return false;
      try {
        const currentUserId = await readCurrentIdentity();
        return this.activeScope === expectedScope && currentUserId === userId;
      } catch {
        return false;
      }
    };
    scope = createAccountLibraryScope(userId, validateIdentity);
    this.activeScope = scope;
    return scope;
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
