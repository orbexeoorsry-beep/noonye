import { request } from './api';
import type { AuthenticatedUserId } from '../../services/accountScope';

export type SessionFetcher = (url: string, init?: RequestInit) => Promise<Response>;

const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Read the current identity only from the authenticated server session. The caller
 * cannot provide a user ID through a URL, browser storage, or request body.
 */
export async function fetchAuthenticatedUserId(
  fetcher: SessionFetcher = request
): Promise<AuthenticatedUserId | null> {
  const response = await fetcher('/api/accounts/me', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Could not verify the school session.');

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('The server returned an invalid session identity.');
  }
  const user = (payload as { user?: unknown }).user;
  if (!user || typeof user !== 'object') {
    throw new Error('The server returned an invalid session identity.');
  }
  const userId = (user as { id?: unknown }).id;
  if (typeof userId !== 'string' || !USER_ID_PATTERN.test(userId)) {
    throw new Error('The server returned an invalid session identity.');
  }

  return userId as AuthenticatedUserId;
}
