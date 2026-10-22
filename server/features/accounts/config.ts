import path from 'node:path';
import { existsSync, lstatSync, realpathSync } from 'node:fs';

export function localDatabasePath(filename: string | undefined, root = process.cwd()) {
  if (!filename || !path.isAbsolute(filename) || filename === ':memory:') throw new Error('NOON_LOCAL_ACCOUNTS_DB must be an absolute persistent file path outside the application');
  const resolved = path.resolve(filename);
  // Resolve the nearest existing ancestor as well, so symlinked parents cannot reach public assets.
  let ancestor = resolved;
  while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
  if (existsSync(resolved) && (!lstatSync(resolved).isFile() || lstatSync(resolved).isSymbolicLink())) throw new Error('Database must be a regular non-symlink file');
  const canonical = path.join(realpathSync(ancestor), path.relative(ancestor, resolved));
  const app = realpathSync(root);
  if (canonical === app || canonical.startsWith(app + path.sep)) throw new Error('Database must be outside application and static asset directories');
  return canonical;
}
export function accountsConfig(env = process.env) {
  const enabled = env.NOON_ACCOUNTS_LOCAL === '1';
  if (!enabled) return { enabled: false, origin: 'http://127.0.0.1:3000', database: undefined };
  const port = env.PORT || '3000';
  const origin = env.NOON_LOCAL_ACCOUNTS_ORIGIN || `http://127.0.0.1:${port}`;
  const url = new URL(origin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.origin !== origin) throw new Error('Local accounts require an exact http://127.0.0.1:<port> origin');
  if (url.port !== (port === '80' ? '' : port)) throw new Error('Accounts origin port must match PORT');
  return { enabled: true, origin, database: localDatabasePath(env.NOON_LOCAL_ACCOUNTS_DB) };
}
