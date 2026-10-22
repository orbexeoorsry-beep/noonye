import path from 'node:path';
import { lstatSync, realpathSync } from 'node:fs';

/** Check the original spelling before normalization, including dangling symlinks. */
export function assertNoSymlinkPath(filename: string) {
  if (!path.isAbsolute(filename) || filename.includes('\0') || filename.includes('\\') || filename.split('/').some(part => part === '.' || part === '..')) throw new Error('Unsafe filesystem path');
  let cursor = path.parse(filename).root;
  const parts = filename.slice(cursor.length).split('/').filter(Boolean);
  for (let index = 0; index < parts.length; index++) {
    cursor = path.join(cursor, parts[index]);
    let info: ReturnType<typeof lstatSync>;
    try { info = lstatSync(cursor); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    if (info.isSymbolicLink()) throw new Error('Symlinks are not allowed in database or served asset paths');
    if (index < parts.length - 1 && !info.isDirectory()) throw new Error('Path ancestor is not a directory');
  }
}

/** applicationRoot must come from the physical entry module, never CWD or environment. */
export function localDatabasePath(filename: string | undefined, applicationRoot: string) {
  if (!filename || !path.isAbsolute(filename) || filename === ':memory:') throw new Error('NOON_LOCAL_ACCOUNTS_DB must be an absolute persistent file path outside the application');
  if (!applicationRoot || !path.isAbsolute(applicationRoot)) throw new Error('A trusted absolute application root is required');
  assertNoSymlinkPath(filename);
  const resolved = path.resolve(filename), app = realpathSync(applicationRoot);
  if (resolved === app || resolved.startsWith(app + path.sep)) throw new Error('Database must be outside application and static asset directories');
  try {
    const info = lstatSync(resolved);
    if (!info.isFile() || realpathSync(resolved) !== resolved) throw new Error('Database must be a regular canonical non-symlink file');
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return resolved;
}

/** Revalidate the created file as well, before SQLite initialization and before HTTP listen. */
export function assertCreatedDatabasePath(filename: string, applicationRoot: string) {
  const expected = localDatabasePath(filename, applicationRoot);
  if (!lstatSync(expected).isFile() || realpathSync(expected) !== expected) throw new Error('Created database path differs from validated path');
}

/** Static responses are a separate boundary: API authorization cannot protect them. */
export function safeAccountHttpPath(rawUrl: string, applicationRoot: string, localAccounts: boolean) {
  try {
    if (!rawUrl.startsWith('/') || rawUrl.includes('#')) return false;
    const decoded = decodeURIComponent(rawUrl.split('?')[0]);
    if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').some(part => part === '.' || part === '..')) return false;
    if (decoded.split('/').some(part => /\.(?:sqlite3?|db)(?:[-.].*)?$/i.test(part))) return false;
    if (!localAccounts) return true;
    if (decoded.includes('%')) return false; // Do not pass double-encoded paths to another decoder.
    if (/^\/@fs(?:\/|$)/i.test(decoded)) return false;
    const relative = decoded.replace(/^\/+/, '');
    for (const directory of ['dist', 'public']) assertNoSymlinkPath(path.join(applicationRoot, directory, relative));
    return true;
  } catch { return false; }
}

export function accountsConfig(env: NodeJS.ProcessEnv, applicationRoot: string) {
  const enabled = env.NOON_ACCOUNTS_LOCAL === '1';
  if (!enabled) return { enabled: false, origin: 'http://127.0.0.1:3000', database: undefined };
  const port = env.PORT || '3000';
  const origin = env.NOON_LOCAL_ACCOUNTS_ORIGIN || `http://127.0.0.1:${port}`;
  const url = new URL(origin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.origin !== origin) throw new Error('Local accounts require an exact http://127.0.0.1:<port> origin');
  if (url.port !== (port === '80' ? '' : port)) throw new Error('Accounts origin port must match PORT');
  return { enabled: true, origin, database: localDatabasePath(env.NOON_LOCAL_ACCOUNTS_DB, applicationRoot) };
}
