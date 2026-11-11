#!/usr/bin/env node
// Builds the portrait images of the mobile module from the desktop originals.
//   backgrounds: public/assets/bg/*.webp -> public/m/img/{scene}-{tall|wide}-{width}.webp
//   objects:     public/assets/{flowers,elements}/*.webp -> public/m/img/{name}-{width}.webp
//   sub pages:   public/assets/bg/{curtain,meadow}.webp -> public/m/img/sub-{name}-{tall|wide}-{width}.webp
//                hand-written composites (public/assets/sub-*.png, see data.json) -> public/m/img/p-{piece}-{width}.webp
//   manifest:    public/m/img/manifest.json (sizes + edge colours for the gradient fill)
// Originals are only read, never written. Crops / sizes come from public/m/layout.js.
// Vercel does not run this: re-run locally (`cd tools && npm i && node build-mobile-images.mjs`)
// and commit public/m/img/.
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');
const OUT = join(PUB, 'm', 'img');
const { SCENES, SUB, BG_WIDTHS, bgName, subBgName, pieceName, objName, objWidth } = await import(pathToFileURL(join(PUB, 'm', 'layout.js')).href);
const data = JSON.parse(readFileSync(join(PUB, 'm', 'data.json'), 'utf8'));
const subLetters = JSON.parse(readFileSync(join(ROOT, 'tools', 'sub-letters.json'), 'utf8')).pages; // from extract-data.mjs

const QUALITY = Number(process.env.Q || 72);
mkdirSync(OUT, { recursive: true });
const manifest = { quality: QUALITY, bg: {}, objects: {}, sub: { bg: {}, pieces: {} } };
const kb = (n) => `${(n / 1024).toFixed(0)}KB`;
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

async function meanColor(buf, region) {
  const { data, info } = await sharp(buf).extract(region).resize(16, 16, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const acc = [0, 0, 0];
  for (let i = 0; i < data.length; i += info.channels) for (let c = 0; c < 3; c++) acc[c] += data[i + c];
  return acc.map((v) => v / (data.length / info.channels));
}

/** Source canvas of a scene: the background, optionally with the curtain tail stacked below. */
async function sceneSource(scene) {
  const base = sharp(join(PUB, 'assets', scene.bg.src));
  const meta = await base.metadata();
  if (!scene.bg.stackTail) return { buf: await base.png().toBuffer(), w: meta.width, h: meta.height };
  const tail = sharp(join(PUB, 'assets', scene.bg.stackTail));
  const tm = await tail.metadata();
  const H = meta.height + tm.height;
  const baseBuf = await base.png().toBuffer();
  // the tail's floor fades to transparent: put the floor colour of the base's
  // bottom rows under it so the fade ends in paint, not in white
  const floor = await meanColor(baseBuf, { left: Math.round(meta.width * 0.7), top: meta.height - 80, width: Math.round(meta.width * 0.25), height: 80 });
  const buf = await sharp({ create: { width: meta.width, height: H, channels: 4, background: { r: floor[0], g: floor[1], b: floor[2], alpha: 1 } } })
    .composite([
      { input: baseBuf, left: 0, top: 0 },
      { input: await tail.png().toBuffer(), left: 0, top: meta.height },
    ])
    .png()
    .toBuffer();
  return { buf, w: meta.width, h: H };
}

async function buildBg(id, bg, src, entry, nameOf) {
  for (const variant of ['tall', 'wide']) {
    const r = bg[variant];
    if (r.x < 0 || r.y < 0 || r.x + r.w > src.w || r.y + r.h > src.h) throw new Error(`${id}.${variant} crop outside source ${src.w}x${src.h}`);
    const cropped = await sharp(src.buf).extract({ left: r.x, top: r.y, width: r.w, height: r.h }).png().toBuffer();
    const top = await meanColor(cropped, { left: 0, top: 0, width: r.w, height: Math.max(8, Math.round(r.h * 0.04)) });
    const bottom = await meanColor(cropped, { left: 0, top: r.h - Math.max(8, Math.round(r.h * 0.04)), width: r.w, height: Math.max(8, Math.round(r.h * 0.04)) });
    const v = (entry[variant] = { aspect: +(r.w / r.h).toFixed(4), top: hex(top), bottom: hex(bottom), files: {} });
    for (const width of BG_WIDTHS[variant]) {
      const name = `${nameOf(variant, width)}.webp`;
      const info = await sharp(cropped)
        .resize({ width, kernel: 'lanczos3' })
        .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
        .toFile(join(OUT, name));
      v.files[width] = { url: `/m/img/${name}`, w: info.width, h: info.height, bytes: info.size };
      console.log(`bg  ${name.padEnd(28)} ${info.width}x${info.height} ${kb(info.size)}`);
    }
  }
}

for (const scene of SCENES) {
  await buildBg(scene.id, scene.bg, await sceneSource(scene), (manifest.bg[scene.id] = {}), (v, w) => bgName(scene, v, w));
}
for (const [name, bg] of Object.entries(SUB.bg)) {
  await buildBg(name, bg, await sceneSource({ bg }), (manifest.sub.bg[name] = {}), (v, w) => subBgName(name, v, w));
}

// objects: one output per source file, sized for the largest use × 2
const want = new Map();
for (const scene of SCENES) for (const o of scene.objects) want.set(o.file, Math.max(want.get(o.file) || 0, o.maxW));
for (const [file, maxW] of Object.entries(SUB.objects)) want.set(file, Math.max(want.get(file) || 0, maxW));
for (const [file, maxW] of want) {
  const path = join(PUB, 'assets', file);
  if (!existsSync(path)) throw new Error(`object ${file} not found`);
  const meta = await sharp(path).metadata();
  const width = objWidth({ maxW }, meta.width);
  const name = `${objName(file, width)}.webp`;
  const info = await sharp(path).resize({ width, kernel: 'lanczos3' }).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(join(OUT, name));
  const entry = (manifest.objects[file] = { url: `/m/img/${name}`, w: info.width, h: info.height, aspect: +(info.width / info.height).toFixed(4), bytes: info.size });
  console.log(`obj ${name.padEnd(28)} ${info.width}x${info.height} ${kb(info.size)} (orig ${meta.width}w)`);
  // big objects (easels) also get a phone-sized file for the srcset
  if (width > 1000) {
    const small = `${objName(file, 760)}.webp`;
    const si = await sharp(path).resize({ width: 760, kernel: 'lanczos3' }).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(join(OUT, small));
    entry.srcset = `/m/img/${small} ${si.width}w, /m/img/${name} ${info.width}w`;
    entry.small = { url: `/m/img/${small}`, bytes: si.size };
    console.log(`obj ${small.padEnd(28)} ${si.width}x${si.height} ${kb(si.size)}`);
  }
}

// hand-written pieces: crops of the desktop composites (text.png / hot labels)
const PAD = 12;
for (const [id, p] of Object.entries(SUB.pieces)) {
  const page = data.subpages.pages[p.page];
  const box = p.src === 'static' ? page.static : page.hot.find((h) => h.id === p.src);
  if (!box) throw new Error(`piece ${id}: ${p.page} has no ${p.src}`);
  const url = data.assets[`assets/sub/${box.file}`];
  if (!url) throw new Error(`piece ${id}: no asset for ${box.file}`);
  const path = join(PUB, url);
  const meta = await sharp(path).metadata();
  let region = { left: 0, top: 0, width: meta.width, height: meta.height };
  if (p.words) {
    const ls = subLetters[p.page].filter((l) => p.words.includes(l.word) && l.source === p.src);
    if (ls.length === 0) throw new Error(`piece ${id}: no letters for ${p.words}`);
    const x0 = Math.max(0, Math.floor(Math.min(...ls.map((l) => l.x)) - box.x - PAD));
    const y0 = Math.max(0, Math.floor(Math.min(...ls.map((l) => l.y)) - box.y - PAD));
    const x1 = Math.min(meta.width, Math.ceil(Math.max(...ls.map((l) => l.x + l.w)) - box.x + PAD));
    const y1 = Math.min(meta.height, Math.ceil(Math.max(...ls.map((l) => l.y + l.h)) - box.y + PAD));
    region = { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  }
  const width = Math.min(region.width, Math.ceil(p.maxW * 2));
  const name = `${pieceName(id, width)}.webp`;
  const info = await sharp(path).extract(region).resize({ width, kernel: 'lanczos3' }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(join(OUT, name));
  manifest.sub.pieces[id] = { url: `/m/img/${name}`, w: info.width, h: info.height, aspect: +(info.width / info.height).toFixed(4), bytes: info.size };
  console.log(`pc  ${name.padEnd(28)} ${info.width}x${info.height} ${kb(info.size)}`);
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
// drop outputs of earlier runs that the manifest no longer references (e.g. after a maxW change)
const used = JSON.stringify(manifest);
for (const f of readdirSync(OUT)) if (f.endsWith('.webp') && !used.includes(`/m/img/${f}`)) { unlinkSync(join(OUT, f)); console.log(`rm  ${f} (stale)`); }
console.log('manifest -> public/m/img/manifest.json');
