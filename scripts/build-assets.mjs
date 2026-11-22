// Generates README images from palette.mjs:
//   assets/banner.svg  - CRT-style title banner (glow, scanlines, vignette)
//   assets/palette.svg - palette swatches with roles and hex codes
// GitHub strips CSS from README markdown, but styles inside an SVG shown via
// <img> survive. No external fonts or scripts: those never load in <img>.
// Run: node scripts/build-assets.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { P } from './palette.mjs';

const dir = fileURLToPath(new URL('../assets/', import.meta.url));
mkdirSync(dir, { recursive: true });

const FONT = "'Share Tech Mono', 'Noto Sans Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'DejaVu Sans Mono', monospace";
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Shared CRT defs: glow filter, 3px scanlines, edge vignette.
const crtDefs = (id) => `
    <filter id="${id}-glow" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b2"/>
      <feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-soft" x="-10%" y="-50%" width="120%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="${id}-scan" width="4" height="3" patternUnits="userSpaceOnUse">
      <rect y="2" width="4" height="1" fill="${P.deep}" fill-opacity="0.35"/>
    </pattern>
    <radialGradient id="${id}-vignette" cx="50%" cy="50%" r="75%">
      <stop offset="62%" stop-color="${P.deep}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${P.deep}" stop-opacity="0.75"/>
    </radialGradient>`;

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------
const W = 1200;
const H = 340;

// A tiny code sample showing how roles are told apart without hue.
// Each line is a list of [text, colour, style] spans.
const code = [
  [['// all green. brightness does the talking', P.muted, 'i']],
  [['export ', P.bright, 'b'], ['async ', P.bright, 'b'], ['function ', P.bright, 'b'], ['boot', P.link], ['(', P.g6], ['tty', P.text, 'i'], [': ', P.g6], ['Screen', P.g2, 'i'], [') {', P.g6]],
  [['  const ', P.bright, 'b'], ['msg ', P.text], ['= ', P.g6], ["'READY.'", P.g3], [';', P.g6]],
  [['  await ', P.bright, 'b'], ['tty', P.text], ['.', P.g6], ['write', P.link], ['(', P.g6], ['msg', P.text], [', { ', P.g6], ['baud', P.g1], [': ', P.g6], ['9600', P.g7], [' });', P.g6]],
  [['}', P.g6]],
];
const codeX = 640;
const codeY = 150;
const codeSvg = code
  .map((spans, i) => {
    const tspans = spans
      .map(([txt, fill, st]) => {
        const attrs = [`fill="${fill}"`];
        if (st === 'b') attrs.push('font-weight="700"');
        if (st === 'i') attrs.push('font-style="italic"');
        return `<tspan ${attrs.join(' ')}>${esc(txt).replace(/ /g, '&#160;')}</tspan>`;
      })
      .join('');
    return `<text x="${codeX}" y="${codeY + i * 30}" font-size="19">${tspans}</text>`;
  })
  .join('\n      ');

const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">Phosphor Terminal</title>
  <desc id="d">A monochrome green CRT-terminal colour theme for VS Code.</desc>
  <style>
    text { font-family: ${FONT}; }
    .cursor { animation: blink 1.1s steps(1, end) infinite; }
    .flicker { animation: flicker 7s steps(1, end) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    @keyframes flicker { 0%, 100% { opacity: 1; } 46% { opacity: .9; } 47% { opacity: 1; } 88% { opacity: .93; } 89% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .cursor, .flicker { animation: none; } }
  </style>
  <defs>${crtDefs('b')}
    <clipPath id="b-screen"><rect x="0" y="0" width="${W}" height="${H}" rx="22"/></clipPath>
  </defs>

  <g clip-path="url(#b-screen)">
    <rect width="${W}" height="${H}" fill="${P.bg}"/>
    <!-- code panel -->
    <rect x="608" y="96" width="560" height="196" rx="10" fill="${P.deep}" stroke="${P.border}"/>
    <rect x="608" y="96" width="560" height="30" rx="10" fill="${P.raised}"/>
    <rect x="608" y="116" width="560" height="10" fill="${P.raised}"/>
    <circle cx="630" cy="111" r="5" fill="${P.border}"/>
    <circle cx="648" cy="111" r="5" fill="${P.border}"/>
    <circle cx="666" cy="111" r="5" fill="${P.border}"/>
    <text x="690" y="116" font-size="14" fill="${P.muted}">boot.ts</text>

    <g class="flicker">
      <g filter="url(#b-glow)">
        <text x="56" y="138" font-size="60" font-weight="700" letter-spacing="4" fill="${P.bright}">PHOSPHOR</text>
        <text x="56" y="204" font-size="60" font-weight="700" letter-spacing="4" fill="${P.text}">TERMINAL</text>
      </g>
      <g filter="url(#b-soft)">
        <text x="58" y="254" font-size="21" fill="${P.muted}">&gt; monochrome green CRT theme for VS Code<tspan class="cursor" fill="${P.bright}">&#160;█</tspan></text>
        <text x="58" y="290" font-size="16" fill="${P.g5}">syntax by brightness, italic &amp; bold</text>
      </g>
      <g filter="url(#b-soft)">
      ${codeSvg}
      </g>
    </g>

    <!-- CRT overlays -->
    <rect width="${W}" height="${H}" fill="url(#b-scan)"/>
    <rect width="${W}" height="${H}" fill="url(#b-vignette)"/>
  </g>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="21" fill="none" stroke="${P.border}" stroke-width="2"/>
</svg>
`;

// ---------------------------------------------------------------------------
// Palette swatches
// ---------------------------------------------------------------------------
const groups = [
  ['SURFACES', [
    ['Screen', P.bg], ['Raised', P.raised], ['Sunken', P.sunken], ['Deepest', P.deep],
  ]],
  ['TEXT', [
    ['Main', P.text], ['Muted', P.muted], ['Brightest', P.bright], ['Link', P.link],
  ]],
  ['LINES', [
    ['Border', P.border], ['Selection', P.selection],
  ]],
  ['SYNTAX', [
    ['Constants', P.g7], ['Properties', P.g1], ['Types', P.g2], ['Strings', P.g3],
    ['Operators', P.g6], ['Units', P.g4], ['Dim', P.g5],
  ]],
];

// Relative luminance to choose label colour on each swatch.
const lum = (hex) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

const PW = 1200;
const pad = 40;
const sw = 148;
const gap = 12;
const rowH = 128;
const headH = 30;
let y = 78;
const rows = [];
for (const [label, items] of groups) {
  rows.push(`<text x="${pad}" y="${y}" font-size="15" letter-spacing="3" fill="${P.muted}">${label}</text>`);
  y += 14;
  items.forEach(([name, hex], i) => {
    const x = pad + i * (sw + gap);
    const dark = lum(hex) < 0.2;
    const fg = dark ? P.text : P.deep;
    const sub = dark ? P.muted : P.sunken;
    rows.push(
      `<g>` +
        `<rect x="${x}" y="${y}" width="${sw}" height="${rowH - headH - 14}" rx="8" fill="${hex}" stroke="${P.border}"/>` +
        `<text x="${x + 12}" y="${y + 30}" font-size="16" font-weight="700" fill="${fg}">${name}</text>` +
        `<text x="${x + 12}" y="${y + 70}" font-size="15" fill="${sub}">${hex}</text>` +
      `</g>`,
    );
  });
  y += rowH - headH + 22;
}
const PH = y + 10;

const palette = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW}" height="${PH}" role="img" aria-labelledby="pt pd">
  <title id="pt">Phosphor Terminal palette</title>
  <desc id="pd">${groups.flatMap(([, it]) => it.map(([n, h]) => `${n} ${h}`)).join(', ')}</desc>
  <style>text { font-family: ${FONT}; }</style>
  <defs>${crtDefs('p')}
    <clipPath id="p-screen"><rect width="${PW}" height="${PH}" rx="18"/></clipPath>
  </defs>
  <g clip-path="url(#p-screen)">
    <rect width="${PW}" height="${PH}" fill="${P.bg}"/>
    <text x="${pad}" y="44" font-size="22" font-weight="700" letter-spacing="2" fill="${P.bright}" filter="url(#p-soft)">PALETTE</text>
    ${rows.join('\n    ')}
    <rect width="${PW}" height="${PH}" fill="url(#p-scan)" opacity="0.25"/>
    <rect width="${PW}" height="${PH}" fill="url(#p-vignette)" opacity="0.4"/>
  </g>
  <rect x="1" y="1" width="${PW - 2}" height="${PH - 2}" rx="17" fill="none" stroke="${P.border}" stroke-width="2"/>
</svg>
`;

writeFileSync(dir + 'banner.svg', banner);
writeFileSync(dir + 'palette.svg', palette);
console.log(`Wrote ${dir}banner.svg and ${dir}palette.svg`);
