import path from 'node:path';
import { lstatSync, realpathSync, statSync, openSync, readSync, fstatSync, closeSync, constants } from 'node:fs';

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

function sqliteHeader(bytes: Buffer, size: number) {
  if (size >= 16 && bytes.subarray(0, 16).equals(Buffer.from('SQLite format 3\0'))) return true;
  if (size >= 8 && bytes.subarray(0, 8).equals(Buffer.from('d9d505f920a163d7', 'hex'))) return true; // rollback journal
  if (size >= 4 && [0x377f0682, 0x377f0683].includes(bytes.readUInt32BE(0))) return true; // WAL
  // SQLite's shared-memory WAL-index header has version 3007000 in native byte order.
  return size >= 32 && (bytes.readUInt32LE(0) === 3007000 || bytes.readUInt32BE(0) === 3007000);
}
function safeStaticFile(filename: string, rejectSymlinks: boolean, protectedFiles: string[]) {
  if (rejectSymlinks) assertNoSymlinkPath(filename);
  let info: ReturnType<typeof statSync>;
  try { info = statSync(filename); }
  catch (error) { if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code || '')) return true; throw error; }
  if (info.isDirectory()) return safeStaticFile(path.join(filename, 'index.html'), rejectSymlinks, protectedFiles);
  if (!info.isFile()) return false;
  const canonical = realpathSync(filename);
  if (/\.(?:sqlite3?|db)(?:[-.].*)?$/i.test(path.basename(canonical))) return false;
  const privateIdentities = protectedFiles.flatMap(privateFile => {
    try { return [statSync(privateFile)]; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  });
  const fd = openSync(canonical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== info.dev || opened.ino !== info.ino) return false;
    if (protectedFiles.includes(canonical) || privateIdentities.some(privateFile => privateFile.dev === opened.dev && privateFile.ino === opened.ino)) return false;
    const header = Buffer.alloc(32), size = readSync(fd, header, 0, header.length, 0);
    return !sqliteHeader(header, size);
  } finally { closeSync(fd); }
}

/** Validate every filesystem mapping used by production static and Vite, on every request. */
export function safeAccountHttpPath(rawUrl: string, applicationRoot: string, localAccounts: boolean, database?: string, trustedViteFiles: readonly string[] = []) {
  try {
    if (!rawUrl.startsWith('/') || rawUrl.includes('#')) return false;
    const decoded = decodeURIComponent(rawUrl.split('?')[0]);
    if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').some(part => part === '.' || part === '..')) return false;
    if (decoded.split('/').some(part => /\.(?:sqlite3?|db)(?:[-.].*)?$/i.test(part))) return false;
    if (localAccounts && decoded.includes('%')) return false; // Do not pass double-encoded paths to another decoder.
    const relative = decoded.replace(/^\/+/, '');
    const protectedFiles = database ? [database, ...['-wal', '-shm', '-journal'].map(suffix => database + suffix)] : [];
    if (/^@fs(?:\/|$)/i.test(relative)) {
      const filename = path.resolve(path.sep, relative.slice(4));
      // Vite's own env module may be outside root in linked dependency installations.
      // Exact physical file only, never a directory or an arbitrary user-supplied path.
      return trustedViteFiles.includes(filename) && realpathSync(filename) === filename && safeStaticFile(filename, true, protectedFiles);
    }
    if (/^(?:dist|public)(?:\/|$)/i.test(relative) || relative.startsWith('@/')) return false;
    // Vite serves app-root URLs too. Prefixing only public/dist checks a different file.
    // Dependency symlinks are normal dev infrastructure; still inspect their real file and inode.
    const dependency = relative === 'node_modules' || relative.startsWith('node_modules/');
    const candidates: [string, boolean][] = [
      [path.join(applicationRoot, 'dist', relative), true],
      [path.join(applicationRoot, 'public', relative), true],
      [path.join(applicationRoot, relative), !dependency],
      [path.join(applicationRoot, 'dist', 'index.html'), true],
      [path.join(applicationRoot, 'index.html'), true],
    ];
    return candidates.every(([filename, rejectSymlinks]) => safeStaticFile(filename, rejectSymlinks, protectedFiles));
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
