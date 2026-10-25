/** Production account HTML never needs inline scripts; development Vite preamble does. */
export function accountPageHeaders(production: boolean) {
  const scripts = production ? "script-src 'self'" : "script-src 'self' 'unsafe-inline'";
  return {
    'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'self'; ${scripts}; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; img-src 'self' data: blob:; worker-src 'self' blob:; frame-ancestors 'none'; form-action 'self'; base-uri 'none'`,
    'Referrer-Policy': 'no-referrer',
  };
}
