import { isIP } from 'node:net';
import path from 'node:path';
import type { Express } from 'express';
import { accountsConfig, localDatabasePath, productionDatabasePath } from './config';

/** Values are supplied by the operator; never load a .env file or infer proxy topology. */
export function accountsRuntimeConfig(values: NodeJS.ProcessEnv, applicationRoot: string) {
  if (!values.NOON_ACCOUNTS_MODE) return accountsConfig(values, applicationRoot);
  if (values.NOON_ACCOUNTS_MODE !== 'proxy-production' || values.NOON_ACCOUNTS_LOCAL === '1') throw new Error('Conflicting or unsupported accounts mode');
  const origin = values.NOON_ACCOUNTS_ORIGIN || '';
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password || isIP(url.hostname) || !url.hostname.includes('.')) throw new Error('Production accounts require an exact HTTPS DNS origin');
  // This candidate deliberately supports a same-host proxy only. Do not widen this without topology review.
  const proxyAddress = values.NOON_ACCOUNTS_PROXY_IP;
  if (proxyAddress !== '127.0.0.1') throw new Error('An explicitly verified loopback proxy is required');
  const requested = localDatabasePath(values.NOON_ACCOUNTS_DB, applicationRoot);
  const database = productionDatabasePath(path.basename(requested), values.NOON_ACCOUNTS_STORAGE_ROOT, applicationRoot);
  if (database !== requested) throw new Error('Database must be a direct child of the private storage root');
  return { enabled: true, origin, database, mode: 'proxy-production' as const, proxyAddress };
}
export function configureAccountsProxy(app: Express, proxyAddress?: string) {
  app.disable('x-powered-by');
  app.set('trust proxy', proxyAddress ? (ip: string, hop: number) => hop === 0 && (ip === proxyAddress || ip === `::ffff:${proxyAddress}`) : false);
}
