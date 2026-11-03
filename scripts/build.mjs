import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await viteBuild({ configFile: path.join(root, 'vite.config.ts'), build: { outDir: path.join(dist, 'client'), emptyOutDir: true } });
await esbuild({ entryPoints: [path.join(root, 'server.ts')], outfile: path.join(dist, 'server.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', sourcemap: false });
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (path.relative(dist, full) !== 'manifest.json') {
      const bytes = await readFile(full);
      files.push({ path: path.relative(dist, full).split(path.sep).join('/'), size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
await walk(dist);
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const status = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root });
const manifest = {
  schemaVersion: 1,
  source: {
    commit: git(['rev-parse', 'HEAD']),
    tree: git(['rev-parse', 'HEAD^{tree}']),
    dirty: status.length > 0,
    dirtyStatus: status.toString('utf8'),
  },
  files: files.sort((a, b) => a.path.localeCompare(b.path)),
};
await writeFile(path.join(dist, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
