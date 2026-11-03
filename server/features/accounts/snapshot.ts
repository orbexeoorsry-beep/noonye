import { createHash } from 'node:crypto';
import { closeSync, constants, fsyncSync, fstatSync, lstatSync, openSync, readFileSync, unlinkSync } from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { productionDatabasePath } from './config';

export interface DatabaseSnapshot {
  path: string;
  sha256: string;
  size: number;
}

/**
 * Create a compact, consistent local snapshot. This is an operator-only primitive,
 * not an HTTP endpoint. `filename` must be a direct-child .sqlite name in a private
 * storage directory; the directory must already exist and be owned/mode 0700.
 */
export function createDatabaseSnapshot(
  source: DatabaseSync,
  filename: string,
  storageRoot: string,
  applicationRoot: string,
): DatabaseSnapshot {
  const destination = productionDatabasePath(filename, storageRoot, applicationRoot);
  const owner = process.getuid?.();
  if (owner === undefined) throw new Error('Private snapshots require a Unix uid');
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try { lstatSync(destination + suffix); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    throw new Error('Snapshot destination and sidecars must not exist');
  }
  // Existing targets, symlinks, hardlinks, and SQLite sidecars are rejected by the guard.
  // O_EXCL below also prevents replacement if the target appears after validation.
  const fd = openSync(destination, 'wx', 0o600);
  const createdIdentity = fstatSync(fd);
  let succeeded = false;
  try {
    const created = fstatSync(fd);
    if (!created.isFile() || created.uid !== owner || created.nlink !== 1 || (created.mode & 0o777) !== 0o600) {
      throw new Error('Snapshot destination must be a new private regular file');
    }
    // VACUUM INTO accepts a scalar expression, and Node 22.5+ supports binding it
    // via StatementSync.run(). Never interpolate a filesystem path into SQL.
    source.prepare('VACUUM main INTO ?').run(destination);

    const check = new DatabaseSync(destination, { readOnly: true });
    try {
      const integrity = check.prepare('PRAGMA integrity_check').all() as Array<Record<string, unknown>>;
      if (integrity.length !== 1 || integrity[0]?.integrity_check !== 'ok') {
        throw new Error('Snapshot failed SQLite integrity_check');
      }
      const foreignKeyIssues = check.prepare('PRAGMA foreign_key_check').all();
      if (foreignKeyIssues.length !== 0) throw new Error('Snapshot failed SQLite foreign_key_check');
    } finally {
      check.close();
    }

    // Revalidate the destination and sidecars after SQLite has written it.
    productionDatabasePath(filename, storageRoot, applicationRoot);
    const fileInfo = lstatSync(destination);
    if (!fileInfo.isFile() || fileInfo.isSymbolicLink() || fileInfo.uid !== owner || fileInfo.nlink !== 1 || fileInfo.ino !== createdIdentity.ino || fileInfo.dev !== createdIdentity.dev || path.resolve(destination) !== destination) {
      throw new Error('Unsafe snapshot file after creation');
    }
    const outputFd = openSync(destination, constants.O_RDONLY | constants.O_NOFOLLOW);
    let digest: string;
    try {
      const opened = fstatSync(outputFd);
      if (opened.ino !== createdIdentity.ino || opened.dev !== createdIdentity.dev) throw new Error('Snapshot identity changed');
      fsyncSync(outputFd);
      const hash = createHash('sha256');
      // Hash the exact finalized file through its descriptor; the fsync precedes hashing.
      hash.update(readFileSync(outputFd));
      digest = hash.digest('hex');
    } finally {
      closeSync(outputFd);
    }
    const directoryFd = openSync(storageRoot, 'r');
    try { fsyncSync(directoryFd); } finally { closeSync(directoryFd); }
    succeeded = true;
    return { path: destination, sha256: digest, size: fileInfo.size };
  } finally {
    closeSync(fd);
    if (!succeeded) {
      try {
        const failed = lstatSync(destination);
        if (failed.ino === createdIdentity.ino && failed.dev === createdIdentity.dev) unlinkSync(destination);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }
}
