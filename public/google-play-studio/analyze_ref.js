const fs = require('fs');
const path = require('path');
const base = 'C:\\Users\\Dell\\AppData\\Local\\Programs\\Antigravity';
const cssPath = path.join(base, 'scraped_reference_style.css');
const css = fs.readFileSync(cssPath, 'utf8');

const needle = '#page-overlay';
const idx = css.indexOf(needle);
console.log(css.substring(idx));
