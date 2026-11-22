// Phosphor Terminal palette. Every value is a shade of green.
// Keep in sync with the web "Phosphor terminal" theme.
export const P = {
  // Surfaces
  bg: '#06170b', // screen background
  raised: '#0a2010', // sidebar, panels, tabs, widgets
  sunken: '#0e2915', // inputs, inactive tabs, terminal
  deep: '#04120a', // code block / deepest background

  // Text
  text: '#8dffad', // main text
  muted: '#5fd47f', // comments, line numbers, inactive
  bright: '#d2ffde', // keywords, active items, headings
  link: '#a6ffbf', // links

  // Lines and highlights
  border: '#22582f', // borders / hairlines
  selection: '#1f5c2e', // selection / find match

  // Extra greens for syntax variety (brightest to dimmest roughly)
  g7: '#b6ffc9',
  g1: '#7dffa0',
  g2: '#6fef90',
  g3: '#55d877',
  g6: '#45b866',
  g4: '#3fbf62',
  g5: '#2fa350',
};

/** Append an alpha channel (0..1) to a #rrggbb colour. */
export const a = (hex, alpha) =>
  hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
