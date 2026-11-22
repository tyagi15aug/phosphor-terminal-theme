// vsce refuses SVG images (and relative images without a public repo URL) in
// the packaged README. GitHub renders them fine, so keep them in README.md and
// write an image-free copy for the .vsix: build/README.marketplace.md
// Run: node scripts/marketplace-readme.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const src = readFileSync(fileURLToPath(new URL('README.md', root)), 'utf8');

const out = src
  // centred <p> blocks that only wrap an SVG image
  .replace(/<p align="center">\s*<img [^>]*\.svg"[^>]*>\s*<\/p>\s*/g, '')
  // un-collapse the palette table, since the swatch image is gone
  .replace(/<details>\s*<summary>[^<]*<\/summary>\s*/g, '')
  .replace(/\s*<\/details>\s*/g, '\n\n');

mkdirSync(fileURLToPath(new URL('build/', root)), { recursive: true });
writeFileSync(fileURLToPath(new URL('build/README.marketplace.md', root)), out);
console.log('Wrote build/README.marketplace.md');
