// Checks the built theme:
//   1. every colour is a shade of green (no other hues);
//   2. WCAG contrast for every foreground/background pair that matters.
// Run: node scripts/check-contrast.mjs   (exit code 1 on any failure)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { P } from './palette.mjs';

const theme = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../themes/phosphor-terminal-color-theme.json', import.meta.url)),
    'utf8',
  ),
);

// ---- colour maths ---------------------------------------------------------
const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const alphaOf = (hex) => (hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1);
const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
/** Composite a possibly translucent colour over an opaque background. */
const over = (fg, bg) => {
  const al = alphaOf(fg);
  const f = rgb(fg);
  const b = rgb(bg);
  return toHex(f.map((v, i) => v * al + b[i] * (1 - al)));
};
const lum = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hue = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return null; // grey
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

let failures = 0;

// ---- 1. hue check ---------------------------------------------------------
// Opacity masks (#000000xx) are not colours, and fully transparent is allowed.
const maskKeys = new Set(['editorUnnecessaryCode.opacity', 'minimap.foregroundOpacity']);
const allColours = [];
for (const [k, v] of Object.entries(theme.colors)) allColours.push([`colors.${k}`, v]);
for (const r of theme.tokenColors) if (r.settings.foreground) allColours.push([`token "${r.name}"`, r.settings.foreground]);
for (const [k, v] of Object.entries(theme.semanticTokenColors)) {
  const fg = typeof v === 'string' ? v : v.foreground;
  if (fg) allColours.push([`semantic.${k}`, fg]);
}
const offHue = allColours.filter(([k, v]) => {
  if (maskKeys.has(k.replace('colors.', ''))) return false;
  if (alphaOf(v) === 0) return false;
  const h = hue(v.slice(0, 7));
  return h === null || h < 120 || h > 150; // palette greens sit at ~133-140°
});
const palette = new Set(Object.values(P));
const offPalette = allColours.filter(([k, v]) => {
  if (maskKeys.has(k.replace('colors.', '')) || alphaOf(v) === 0) return false;
  return !palette.has(v.slice(0, 7));
});
console.log(`\nHUE CHECK  ${allColours.length} colour values`);
console.log(offHue.length ? `  FAIL non-green: ${offHue.map(([k, v]) => `${k}=${v}`).join(', ')}` : '  PASS all colours are greens (hue 120-150°)');
console.log(offPalette.length ? `  FAIL off-palette: ${offPalette.map(([k, v]) => `${k}=${v}`).join(', ')}` : '  PASS all colours (ignoring alpha) come from the palette');
failures += offHue.length + offPalette.length;

// ---- 2. contrast ----------------------------------------------------------
const c = theme.colors;
const rows = [];
const check = (label, fg, bg, min) => {
  const bgSolid = bg.length === 9 ? over(bg, c['editor.background']) : bg;
  const fgSolid = fg.length === 9 ? over(fg, bgSolid) : fg;
  const r = ratio(fgSolid, bgSolid);
  const ok = r >= min;
  if (!ok) failures++;
  rows.push({ label, fg, bg, r, min, ok });
};

// Rule 1: main text >= 7:1 on every surface it sits on
const surfaces = {
  'editor bg': c['editor.background'],
  raised: P.raised,
  sunken: P.sunken,
  deep: P.deep,
  'current line': c['editor.lineHighlightBackground'],
};
for (const [n, bg] of Object.entries(surfaces)) check(`main text on ${n}`, P.text, bg, 7);
check('brightest on editor bg', P.bright, P.bg, 7);

// Rule 2: comments / muted >= 4.5:1
for (const [n, bg] of Object.entries(surfaces)) check(`muted text on ${n}`, P.muted, bg, 4.5);

// Every token foreground on editor bg and on current-line bg (>= 4.5)
const seen = new Set();
for (const r of theme.tokenColors) {
  const fg = r.settings.foreground;
  if (!fg || seen.has(fg)) continue;
  seen.add(fg);
}
for (const fg of seen) {
  const names = theme.tokenColors.filter((r) => r.settings.foreground === fg).map((r) => r.name);
  const label = `syntax ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
  check(label, fg, P.bg, fg === P.text ? 7 : 4.5);
  check(`  same on current line`, fg, c['editor.lineHighlightBackground'], fg === P.text ? 7 : 4.5);
}

// Selected text
check('selected text on selection', c['editor.selectionForeground'], c['editor.selectionBackground'], 7);
check('main text on selection', P.text, P.selection, 4.5);
check('main text on find match', P.text, c['editor.findMatchBackground'], 4.5);

// UI pairs
const ui = [
  ['line numbers', 'editorLineNumber.foreground', 'editorGutter.background', 4.5],
  ['active line number', 'editorLineNumber.activeForeground', 'editorGutter.background', 7],
  ['sidebar text', 'sideBar.foreground', 'sideBar.background', 7],
  ['sidebar title', 'sideBarTitle.foreground', 'sideBar.background', 7],
  ['list selection', 'list.activeSelectionForeground', 'list.activeSelectionBackground', 7],
  ['list hover', 'list.hoverForeground', 'list.hoverBackground', 7],
  ['activity bar active', 'activityBar.foreground', 'activityBar.background', 7],
  ['activity bar inactive', 'activityBar.inactiveForeground', 'activityBar.background', 4.5],
  ['badge', 'activityBarBadge.foreground', 'activityBarBadge.background', 4.5],
  ['active tab', 'tab.activeForeground', 'tab.activeBackground', 7],
  ['inactive tab', 'tab.inactiveForeground', 'tab.inactiveBackground', 4.5],
  ['breadcrumb', 'breadcrumb.foreground', 'breadcrumb.background', 4.5],
  ['title bar', 'titleBar.activeForeground', 'titleBar.activeBackground', 7],
  ['title bar inactive', 'titleBar.inactiveForeground', 'titleBar.inactiveBackground', 4.5],
  ['status bar', 'statusBar.foreground', 'statusBar.background', 7],
  ['status bar no folder', 'statusBar.noFolderForeground', 'statusBar.noFolderBackground', 7],
  ['status bar debugging', 'statusBar.debuggingForeground', 'statusBar.debuggingBackground', 7],
  ['status bar error item', 'statusBarItem.errorForeground', 'statusBarItem.errorBackground', 7],
  ['status bar warning item', 'statusBarItem.warningForeground', 'statusBarItem.warningBackground', 7],
  ['status bar remote', 'statusBarItem.remoteForeground', 'statusBarItem.remoteBackground', 4.5],
  ['panel title', 'panelTitle.activeForeground', 'panel.background', 7],
  ['panel title inactive', 'panelTitle.inactiveForeground', 'panel.background', 4.5],
  ['input text', 'input.foreground', 'input.background', 7],
  ['input placeholder', 'input.placeholderForeground', 'input.background', 4.5],
  ['button', 'button.foreground', 'button.background', 7],
  ['secondary button', 'button.secondaryForeground', 'button.secondaryBackground', 7],
  ['dropdown', 'dropdown.foreground', 'dropdown.background', 7],
  ['quick input', 'quickInput.foreground', 'quickInput.background', 7],
  ['quick input focus', 'quickInputList.focusForeground', 'quickInputList.focusBackground', 7],
  ['command palette group', 'pickerGroup.foreground', 'quickInput.background', 4.5],
  ['notification', 'notifications.foreground', 'notifications.background', 7],
  ['notification link', 'notificationLink.foreground', 'notifications.background', 4.5],
  ['widget text', 'editorWidget.foreground', 'editorWidget.background', 7],
  ['suggest selected', 'editorSuggestWidget.selectedForeground', 'editorSuggestWidget.selectedBackground', 7],
  ['suggest highlight', 'editorSuggestWidget.highlightForeground', 'editorSuggestWidget.background', 7],
  ['hover text', 'editorHoverWidget.foreground', 'editorHoverWidget.background', 7],
  ['peek file', 'peekViewResult.fileForeground', 'peekViewResult.background', 7],
  ['peek line', 'peekViewResult.lineForeground', 'peekViewResult.background', 7],
  ['peek title', 'peekViewTitleLabel.foreground', 'peekViewTitle.background', 7],
  ['peek description', 'peekViewTitleDescription.foreground', 'peekViewTitle.background', 4.5],
  ['code lens', 'editorCodeLens.foreground', 'editor.background', 4.5],
  ['inlay hint', 'editorInlayHint.foreground', 'editorInlayHint.background', 4.5],
  ['menu', 'menu.foreground', 'menu.background', 7],
  ['menu selection', 'menu.selectionForeground', 'menu.selectionBackground', 7],
  ['keybinding label', 'keybindingLabel.foreground', 'keybindingLabel.background', 7],
  ['terminal text', 'terminal.foreground', 'terminal.background', 7],
  ['diff unchanged region', 'diffEditor.unchangedRegionForeground', 'diffEditor.unchangedRegionBackground', 4.5],
];
for (const [label, fgKey, bgKey, min] of ui) check(label, c[fgKey], c[bgKey], min);

// Diagnostics: errors/warnings/info text on editor + raised surfaces
for (const k of ['editorError.foreground', 'editorWarning.foreground', 'editorInfo.foreground']) {
  check(k.replace('.foreground', ''), c[k], P.bg, 7);
}

// Diff: main text must stay readable on added and removed lines
check('text on diff inserted line', P.text, c['diffEditor.insertedLineBackground'], 7);
check('text on diff inserted text', P.text, over(c['diffEditor.insertedTextBackground'], over(c['diffEditor.insertedLineBackground'], P.bg)), 7);
check('text on diff removed line', P.text, c['diffEditor.removedLineBackground'], 7);
check('text on diff removed text', P.text, over(c['diffEditor.removedTextBackground'], over(c['diffEditor.removedLineBackground'], P.bg)), 7);

// Git decorations on the sidebar
for (const k of Object.keys(c).filter((k) => k.startsWith('gitDecoration.'))) {
  check(k.replace('gitDecoration.', 'git ').replace('ResourceForeground', ''), c[k], c['sideBar.background'], 4.5);
}

// Terminal ANSI colours on terminal background (black is a background colour,
// so it is reported but held to 1.5:1 only)
for (const k of Object.keys(c).filter((k) => k.startsWith('terminal.ansi'))) {
  check(k.replace('terminal.', ''), c[k], c['terminal.background'], k === 'terminal.ansiBlack' ? 1.5 : 4.5);
}
// ANSI red vs yellow must differ clearly in brightness
const ry = ratio(c['terminal.ansiRed'], c['terminal.ansiYellow']);
const ryOk = ry >= 1.8;
if (!ryOk) failures++;

// ---- report ---------------------------------------------------------------
console.log(`\nCONTRAST   ${rows.length} pairs (WCAG 2.x ratio)\n`);
const w = Math.max(...rows.map((r) => r.label.length));
for (const r of rows) {
  console.log(
    `  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label.padEnd(w)}  ${r.fg.padEnd(9)} on ${r.bg.padEnd(9)}  ${r.r.toFixed(2).padStart(5)}:1  (min ${r.min})`,
  );
}
console.log(`\n  ${ryOk ? 'PASS' : 'FAIL'}  ANSI red vs ANSI yellow brightness difference  ${ry.toFixed(2)}:1  (min 1.8)`);
const low = rows.reduce((m, r) => (r.min >= 4.5 && r.r < m.r ? r : m), { r: Infinity });
console.log(`\nLowest required pair: "${low.label.trim()}" at ${low.r.toFixed(2)}:1`);
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
