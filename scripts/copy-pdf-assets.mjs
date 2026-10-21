import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Keep fonts, CMaps and image decoders on this origin and exactly matched to PDF.js.
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  const source = fileURLToPath(new URL(`../node_modules/pdfjs-dist/${folder}/`, import.meta.url));
  const destination = fileURLToPath(new URL(`../public/pdfjs/${folder}/`, import.meta.url));
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
}
