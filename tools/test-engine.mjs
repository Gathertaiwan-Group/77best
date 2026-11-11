#!/usr/bin/env node
// Unit tests for the letter layout engine (node --test tools/test-engine.mjs).
// Simulates renaming the home title ("Kiara") to 4 / 5 / 6 / 8 / 11-letter names and
// checks that every letter stays inside the content box and lines don't collide,
// for the phone / tablet content boxes we ship.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const M = join(ROOT, 'public', 'm');
const { groupLetters, layoutScene, overlapRatio, fittedAngle } = await import(pathToFileURL(join(M, 'engine.js')).href);
const { SCENES } = await import(pathToFileURL(join(M, 'layout.js')).href);
const data = JSON.parse(readFileSync(join(M, 'data.json'), 'utf8'));

// content boxes = viewport minus gutters (16px sides, 18px + safe-area top/bottom)
const BOXES = {
  '390x844': { w: 358, h: 808 - 34 - 47 },
  '375x667': { w: 343, h: 631 },
  '430x932': { w: 398, h: 896 - 34 - 47 },
  '820x1180': { w: 720, h: 1144 },
};

/** Replace the name word (main-02-*) with an n-letter word built from its own glyphs. */
function renamed(n) {
  const name = data.letters.filter((l) => /^main-02-/.test(l.word));
  const step = (name[name.length - 1].x - name[0].x) / (name.length - 1);
  const word = `main-02-test${n}`;
  const letters = Array.from({ length: n }, (_, i) => {
    const g = name[i % name.length];
    return { ...g, word, index: i, char: 'abcdefghijk'[i], x: name[0].x + step * i, y: g.y + (i % 2 ? 6 : -4) };
  });
  return [...data.letters.filter((l) => !/^main-02-/.test(l.word)), ...letters];
}

function check(scene, letters, box) {
  const byKey = groupLetters(letters);
  const placed = layoutScene(scene, byKey, box);
  for (const p of placed) {
    for (const l of p.letters) {
      // rotated letter extents
      const r = (l.rot * Math.PI) / 180, ac = Math.abs(Math.cos(r)), as = Math.abs(Math.sin(r));
      const hw = (l.w * ac + l.h * as) / 2, hh = (l.w * as + l.h * ac) / 2;
      assert.ok(l.x - hw >= -0.5 && l.x + hw <= box.w + 0.5, `${scene.id} ${l.src.file} x out of box`);
      assert.ok(l.y - hh >= -0.5 && l.y + hh <= box.h + 0.5, `${scene.id} ${l.src.file} y out of box`);
    }
  }
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++)
      assert.ok(overlapRatio(placed[i].aabb, placed[j].aabb) < 0.2, `${scene.id} lines ${i}/${j} overlap`);
  return placed;
}

test('data.json has the current name and all four pages', () => {
  assert.equal(typeof data.name, 'string');
  assert.ok(data.name.length > 0);
  for (const p of ['main', 'about', 'work', 'contact']) assert.ok(data.letters.some((l) => l.page === p), p);
  for (const k of ['linkedin', 'x', 'instagram']) assert.match(data.config.links[k], /^https:\/\//);
});

test('fittedAngle keeps reading direction', () => {
  const ls = [0, 1, 2].map((i) => ({ x: 100 * i, y: -100 * i, w: 50, h: 50 }));
  assert.ok(Math.abs(fittedAngle(ls) + 45) < 0.01);
  assert.ok(Math.abs(fittedAngle([...ls].reverse().map((l, i) => ({ ...l, x: 200 - 100 * i, y: -200 + 100 * i })))) <= 180);
});

for (const scene of SCENES) {
  for (const [size, box] of Object.entries(BOXES)) {
    test(`${scene.id} @${size}: every letter inside the box, no line collisions`, () => {
      check(scene, data.letters, box);
    });
  }
}

for (const n of [4, 5, 6, 8, 11]) {
  for (const [size, box] of Object.entries(BOXES)) {
    test(`home with a ${n}-letter name @${size} lays out`, () => {
      const placed = check(SCENES[0], renamed(n), box);
      const nameLine = placed[2];
      assert.equal(nameLine.letters.filter((l) => /^main-02-/.test(l.src.word)).length, n);
      const w = nameLine.aabb.right - nameLine.aabb.left;
      assert.ok(w <= ((nameLine.line.maxW ?? 94) / 100) * box.w + 0.5, `name width ${w.toFixed(1)} > maxW`);
    });
  }
}
