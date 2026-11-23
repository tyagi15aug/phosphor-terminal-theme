// The Marketplace refuses SVG images and relative image paths, so the packaged
// README points at the PNG renders on GitHub (absolute https URLs). README.md
// keeps the SVGs for GitHub. Run: node scripts/marketplace-readme.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const src = readFileSync(fileURLToPath(new URL('README.md', root)), 'utf8');

const raw = 'https://raw.githubusercontent.com/tyagi15aug/phosphor-terminal-theme/main/';
const out = src.replace(/src="assets\/([\w-]+)\.svg"/g, (_, name) => `src="${raw}assets/${name}.png"`);

mkdirSync(fileURLToPath(new URL('build/', root)), { recursive: true });
writeFileSync(fileURLToPath(new URL('build/README.marketplace.md', root)), out);
console.log('Wrote build/README.marketplace.md');
