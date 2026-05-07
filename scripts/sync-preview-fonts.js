'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dest = path.join(root, 'assets', 'fonts', 'preview');

const copies = [
  [
    path.join(root, 'node_modules', '@fontsource', 'roboto', 'files'),
    [
      'roboto-latin-400-normal.woff2',
      'roboto-latin-400-italic.woff2',
      'roboto-latin-500-normal.woff2',
      'roboto-latin-700-normal.woff2',
    ],
  ],
  [
    path.join(root, 'node_modules', '@fontsource', 'roboto-mono', 'files'),
    [
      'roboto-mono-latin-400-normal.woff2',
      'roboto-mono-latin-500-normal.woff2',
      'roboto-mono-latin-600-normal.woff2',
    ],
  ],
];

fs.mkdirSync(dest, { recursive: true });

for (const [dir, names] of copies) {
  for (const name of names) {
    const from = path.join(dir, name);
    const to = path.join(dest, name);
    if (!fs.existsSync(from)) {
      console.error('Missing:', from);
      process.exit(1);
    }
    fs.copyFileSync(from, to);
    console.log('Copied', name);
  }
}
