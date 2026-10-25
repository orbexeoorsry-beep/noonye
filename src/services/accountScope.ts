declare const authenticatedUserIdBrand: unique symbol;

/** A UUID obtained only after a successful authenticated /api/accounts/me response. */
export type AuthenticatedUserId = string & {
  readonly [authenticatedUserIdBrand]: true;
};

const SERVER_USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertAuthenticatedUserId(userId: AuthenticatedUserId): string {
  if (typeof userId !== 'string' || !SERVER_USER_ID_PATTERN.test(userId)) {
    throw new Error('A valid server-authenticated user ID is required.');
  }
  return userId;
}

export function accountStorageKey(
  userId: AuthenticatedUserId,
  suffix: string
): string {
  if (!/^[a-z0-9_]+$/.test(suffix)) {
    throw new Error('Invalid account storage key suffix.');
  }
  return `noon_school_${assertAuthenticatedUserId(userId)}_${suffix}`;
}

export function accountDatabaseName(userId: AuthenticatedUserId): string {
  return `noon_learning_account_${assertAuthenticatedUserId(userId)}`;
}
