#!/usr/bin/env node
// Builds the portrait images of the mobile module from the desktop originals.
//   backgrounds: public/assets/bg/*.webp -> public/m/img/{scene}-{tall|wide}-{width}.webp
//   objects:     public/assets/{flowers,elements}/*.webp -> public/m/img/{name}-{width}.webp
//   manifest:    public/m/img/manifest.json (sizes + edge colours for the gradient fill)
// Originals are only read, never written. Crops / sizes come from public/m/layout.js.
// Vercel does not run this: re-run locally (`cd tools && npm i && node build-mobile-images.mjs`)
// and commit public/m/img/.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');
const OUT = join(PUB, 'm', 'img');
const { SCENES, BG_WIDTHS, bgName, objName, objWidth } = await import(pathToFileURL(join(PUB, 'm', 'layout.js')).href);

const QUALITY = Number(process.env.Q || 72);
mkdirSync(OUT, { recursive: true });
const manifest = { quality: QUALITY, bg: {}, objects: {} };
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

for (const scene of SCENES) {
  const src = await sceneSource(scene);
  const entry = (manifest.bg[scene.id] = {});
  for (const variant of ['tall', 'wide']) {
    const r = scene.bg[variant];
    if (r.x < 0 || r.y < 0 || r.x + r.w > src.w || r.y + r.h > src.h) throw new Error(`${scene.id}.${variant} crop outside source ${src.w}x${src.h}`);
    const cropped = await sharp(src.buf).extract({ left: r.x, top: r.y, width: r.w, height: r.h }).png().toBuffer();
    const top = await meanColor(cropped, { left: 0, top: 0, width: r.w, height: Math.max(8, Math.round(r.h * 0.04)) });
    const bottom = await meanColor(cropped, { left: 0, top: r.h - Math.max(8, Math.round(r.h * 0.04)), width: r.w, height: Math.max(8, Math.round(r.h * 0.04)) });
    const v = (entry[variant] = { aspect: +(r.w / r.h).toFixed(4), top: hex(top), bottom: hex(bottom), files: {} });
    for (const width of BG_WIDTHS[variant]) {
      const name = `${bgName(scene, variant, width)}.webp`;
      const info = await sharp(cropped)
        .resize({ width, kernel: 'lanczos3' })
        .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
        .toFile(join(OUT, name));
      v.files[width] = { url: `/m/img/${name}`, w: info.width, h: info.height, bytes: info.size };
      console.log(`bg  ${name.padEnd(28)} ${info.width}x${info.height} ${kb(info.size)}`);
    }
  }
}

// objects: one output per source file, sized for the largest use × 2
const want = new Map();
for (const scene of SCENES) for (const o of scene.objects) want.set(o.file, Math.max(want.get(o.file) || 0, o.maxW));
for (const [file, maxW] of want) {
  const path = join(PUB, 'assets', file);
  if (!existsSync(path)) throw new Error(`object ${file} not found`);
  const meta = await sharp(path).metadata();
  const width = objWidth({ maxW }, meta.width);
  const name = `${objName(file, width)}.webp`;
  const info = await sharp(path).resize({ width, kernel: 'lanczos3' }).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(join(OUT, name));
  manifest.objects[file] = { url: `/m/img/${name}`, w: info.width, h: info.height, aspect: +(info.width / info.height).toFixed(4), bytes: info.size };
  console.log(`obj ${name.padEnd(28)} ${info.width}x${info.height} ${kb(info.size)} (orig ${meta.width}w)`);
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('manifest -> public/m/img/manifest.json');
