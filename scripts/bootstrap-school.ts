import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AccountStore } from '../server/features/accounts/store';
import { localDatabasePath } from '../server/features/accounts/config';

// Password is read from standard input, never argv, logs, a fixture, or an environment file.
const [schoolSlug, schoolName, username, displayName] = process.argv.slice(2);
if (!schoolSlug || !schoolName || !username || !displayName || process.argv.length !== 6) {
  console.error('Usage: npm run accounts:bootstrap -- <school-slug> <school-name> <admin-username> <display-name> (password on stdin)');
  process.exit(1);
}
process.umask(0o077);
let store: AccountStore | undefined;
try {
  const applicationRoot = path.resolve(path.dirname(realpathSync(fileURLToPath(import.meta.url))), '..');
  const database = localDatabasePath(process.env.NOON_LOCAL_ACCOUNTS_DB, applicationRoot);
  const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '');
  store = new AccountStore(database, applicationRoot);
  const result = await store.bootstrapSchool(schoolSlug, schoolName, username, password, displayName);
  console.log(JSON.stringify({ schoolId: result.schoolId, schoolSlug, adminUsername: username }));
} catch {
  console.error('School bootstrap failed. Check local database path, input policy, and whether the school slug already exists. No account was partially created.');
  process.exitCode = 1;
} finally { store?.close(); }
