#!/usr/bin/env node
// Extracts the data tables of the desktop bundle (public/assets/main-*.js) into
// public/m/data.json for the portrait mobile module. Standard library only.
//
// Robustness: object literals are located by stable *content* signatures (not by
// minified variable names), cut out with a JS-aware brace matcher, and evaluated
// one by one inside an empty node:vm context. The bundle itself is never executed.
// Re-run after every desktop re-deploy: `node tools/extract-data.mjs`.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');
const ASSETS = join(PUB, 'assets');
const OUT = join(PUB, 'm', 'data.json');

const mainFile = readdirSync(ASSETS).find((f) => /^main-[\w-]+\.js$/.test(f));
if (!mainFile) throw new Error('public/assets/main-*.js not found');
const src = readFileSync(join(ASSETS, mainFile), 'utf8');

/** Return the index just past the literal that closes the `{`/`[` at `start`. */
function matchBrace(s, start) {
  const stack = [];
  let i = start;
  const closer = { '{': '}', '[': ']', '(': ')' };
  // modes: code | ' | " | ` (with ${} nesting tracked on the stack as 'T')
  const modes = ['code'];
  for (; i < s.length; i++) {
    const c = s[i];
    const mode = modes[modes.length - 1];
    if (mode === "'" || mode === '"') {
      if (c === '\\') { i++; continue; }
      if (c === mode) modes.pop();
      continue;
    }
    if (mode === '`') {
      if (c === '\\') { i++; continue; }
      if (c === '`') { modes.pop(); continue; }
      if (c === '$' && s[i + 1] === '{') { modes.push('code'); stack.push('T'); i++; }
      continue;
    }
    // code
    if (c === "'" || c === '"' || c === '`') { modes.push(c); continue; }
    if (c === '{' || c === '[' || c === '(') { stack.push(closer[c]); continue; }
    if (c === '}' || c === ']' || c === ')') {
      const want = stack.pop();
      if (want === 'T') { modes.pop(); continue; } // end of ${...}
      if (want !== c) throw new Error(`brace mismatch at ${i}: want ${want} got ${c}`);
      if (stack.length === 0) return i + 1;
    }
  }
  throw new Error('unterminated literal from ' + start);
}

// 1) asset variables:  ab=`/assets/foo-HASH.png`
const assetVars = {};
for (const m of src.matchAll(/(?<![\w$.])([\w$]+)=`(\/assets\/[^`$]+)`/g)) assetVars[m[1]] = m[2];

// 2) vite glob objects: Object.assign({"./assets/letters/x.png":ab, ...})
const assets = {};
for (const m of src.matchAll(/Object\.assign\(\{"\.\/assets\//g)) {
  const open = m.index + 'Object.assign('.length;
  const lit = src.slice(open, matchBrace(src, open));
  for (const e of lit.matchAll(/"(\.\/assets\/[^"]+)":([\w$]+)/g)) {
    const url = assetVars[e[2]];
    if (!url) throw new Error(`glob ${e[1]} -> unknown var ${e[2]}`);
    assets[e[1].replace(/^\.\//, '')] = url; // key: "assets/letters/main-00-walk-00.png"
  }
}

const sandbox = vm.createContext(Object.assign(Object.create(null), assetVars));
function grab(name, signature, { prefixToBrace = 0 } = {}) {
  const at = typeof signature === 'string' ? src.indexOf(signature) : src.search(signature);
  if (at < 0) throw new Error(`${name}: signature not found (${signature})`);
  const open = at + prefixToBrace;
  if (src[open] !== '{') throw new Error(`${name}: expected { at ${open}`);
  const lit = src.slice(open, matchBrace(src, open));
  try {
    return vm.runInContext(`(${lit})`, sandbox, { timeout: 1000 });
  } catch (err) {
    throw new Error(`${name}: could not evaluate literal (${err.message})`);
  }
}

const config = grab('config', '{links:{');
const stage = grab('stage', '{design_width:');
const letterTable = grab('letters', '{note:`canvas coords');
const subpages = grab('subpages', '{note:`page coords (2912');
const contactObjects = grab('contactObjects', '{note:`page coords, back to front`');

// webp rule of the desktop app:  Uo = e => `/assets/${e minus assets/ prefix, .png -> .webp}`
const webp = (p) => `/assets/${p.replace(/^\/?(assets\/)?/, '').replace(/\.png$/i, '.webp')}`;

const letters = letterTable.items.map((l) => {
  const url = assets[`assets/letters/${l.file}`];
  if (!url) throw new Error(`letter ${l.file} has no hashed asset`);
  return { ...l, url };
});

// pages / words summary (what the mobile layout tables key on)
const words = {};
for (const l of letters) {
  const w = (words[l.word] ||= { word: l.word, page: l.page, text: l.text, doodle: l.doodle, count: 0 });
  w.count++;
  if (l.keyword) w.keyword = l.keyword;
  if (l.link) w.link = l.link;
  if (l.group) w.group = l.group;
}
const name = letters.find((l) => l.page === 'main' && /^main-02-/.test(l.word))?.text ?? null;

// Drop inline base64 placeholders etc. we never need on mobile
const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'string' && v.startsWith('data:') ? undefined : v)));

const data = {
  generatedFrom: mainFile,
  name,
  webpRule: 'webp(p) = /assets/${p without assets/ prefix, .png -> .webp}',
  urls: {
    bg: Object.fromEntries(['bg_s1', 'bg_s2', 'bg_s3', 'contact_base', 'curtain', 'curtain_tail', 'meadow'].map((b) => [b, webp(`bg/${b}.png`)])),
  },
  config: strip(config),
  stage: strip(stage),
  contactObjects: strip(contactObjects),
  subpages: strip(subpages),
  words: Object.values(words),
  letters,
  assets,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data));
console.log(`extract-data: ${mainFile} -> ${OUT.replace(ROOT + '/', '')}`);
console.log(`  name=${name} letters=${letters.length} words=${Object.keys(words).length} assets=${Object.keys(assets).length}`);
console.log(`  links=${Object.keys(config.links).join(',')} subpages=${Object.keys(subpages.pages).join(',')}`);
