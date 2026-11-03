# Reproducible dependency installs

Production deployment remains blocked. Do not infer a deployment command or live runtime from these local checks.

`package-lock.json` is the npm lockfile. The existing Hostinger metadata previously observed specifies npm; local validation uses `npm ci`, never mutable `npm install`. That metadata does not establish live process provenance.

`bun.lock` is retained and regenerated with Bun 1.4.3 from the pre-hotfix Bun lockfile plus the current manifest. It explicitly includes `playwright-core@1.64.1`. Validate it with `bun install --frozen-lockfile` in a separate empty directory. Do not delete or silently substitute either lockfile. npm and Bun installations must not share `node_modules`; their results are recorded separately. Future dependency changes must update and revalidate both locks, or receive reviewer approval for an explicit package-manager migration.

Browser tests require a compatible system Chromium (`CHROMIUM_EXECUTABLE_PATH`, default `/usr/bin/chromium`). `playwright-core` does not download a browser. Tests and staging rehearsal must run in a network namespace with loopback only, no inherited secrets, no production access, and synthetic fixtures only. A clean install or local rehearsal is not approval to deploy.
