// Letter layout engine (pure functions, no DOM) — usable in the browser and in Node tests.
//
// Input letters come straight from data.json ({word, char, doodle, x, y, w, h, seq, ...}
// in desktop source pixels). The engine keeps every word's letters at their original
// relative positions, straightens the word (baseline fitted through the letter
// centres), flows the words of a line left→right, then scales / turns / places the
// line inside the scene's content box.

const RAD = Math.PI / 180;
const DESCENDERS = new Set(['g', 'j', 'p', 'q', 'y', ',']);
const GAP = 0.8; // word gap in a line, × the line's median letter height (desktop art: 0.6–1.3)

/** `${page}-${NN}` key of a data word id like "main-02-kiara". */
export const wordKey = (word) => word.match(/^([a-z]+-\d+)/i)?.[1] ?? word;

export function groupLetters(letters) {
  const byKey = new Map();
  for (const l of letters) {
    const k = wordKey(l.word);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(l);
  }
  for (const ls of byKey.values()) ls.sort((a, b) => a.index - b.index);
  return byKey;
}

/** Angle (deg) of the principal axis through the letter centres; 0 for 1 letter. */
export function fittedAngle(letters) {
  if (letters.length < 2) return 0;
  const c = letters.map((l) => [l.x + l.w / 2, l.y + l.h / 2]);
  const mx = c.reduce((a, p) => a + p[0], 0) / c.length;
  const my = c.reduce((a, p) => a + p[1], 0) / c.length;
  let sxx = 0, sxy = 0, syy = 0;
  for (const [x, y] of c) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); syy += (y - my) ** 2; }
  let a = (0.5 * Math.atan2(2 * sxy, sxx - syy)) / RAD;
  // reading direction: first letter should stay on the left
  const first = c[0], last = c[c.length - 1];
  const dirX = (last[0] - first[0]) * Math.cos(a * RAD) + (last[1] - first[1]) * Math.sin(a * RAD);
  if (dirX < 0) a += a > 0 ? -180 : 180;
  return a;
}

const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };

function rotPt(x, y, cx, cy, deg) {
  const r = deg * RAD, c = Math.cos(r), s = Math.sin(r);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}

/** Axis-aligned extent of a w×h box centred at (cx,cy) rotated by deg. */
function boxExtent(cx, cy, w, h, deg) {
  const r = deg * RAD, ac = Math.abs(Math.cos(r)), as = Math.abs(Math.sin(r));
  const hw = (w * ac + h * as) / 2, hh = (w * as + h * ac) / 2;
  return [cx - hw, cy - hh, cx + hw, cy + hh];
}

/**
 * One word unit = a primary word + optional doodles riding along ("with").
 * Returns letters in unit-local source coords (straightened), plus box/baseline.
 */
export function buildUnit(spec, byKey) {
  const id = typeof spec === 'string' ? spec : spec.id;
  const primary = byKey.get(id);
  if (!primary) throw new Error(`layout: word ${id} not in data`);
  const extra = (spec.with || []).flatMap((k) => byKey.get(k) || []);
  // `straight: false` keeps the drawn slope; `turn` (deg) fixes words whose glyphs are drawn turned (single letters on a curve)
  const fitted = spec.straight === false ? 0 : fittedAngle(primary.filter((l) => !l.doodle));
  const angle = fitted - (spec.turn || 0);
  const pc = [
    primary.reduce((a, l) => a + l.x + l.w / 2, 0) / primary.length,
    primary.reduce((a, l) => a + l.y + l.h / 2, 0) / primary.length,
  ];
  const letters = [...primary, ...extra].map((l) => {
    const [cx, cy] = rotPt(l.x + l.w / 2, l.y + l.h / 2, pc[0], pc[1], -angle);
    return { src: l, cx, cy, w: l.w, h: l.h, rot: -angle, primary: primary.includes(l) };
  });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of letters) {
    const e = boxExtent(l.cx, l.cy, l.w, l.h, l.rot);
    x0 = Math.min(x0, e[0]); y0 = Math.min(y0, e[1]); x1 = Math.max(x1, e[2]); y1 = Math.max(y1, e[3]);
  }
  const base = letters.filter((l) => l.primary && !l.src.doodle && !DESCENDERS.has(l.src.char));
  const baseline = base.length ? median(base.map((l) => l.cy + l.h / 2)) : y1;
  const xHeight = median(letters.filter((l) => l.primary && !l.src.doodle).map((l) => l.h)) || (y1 - y0);
  return { id, letters, x0, y0, x1, y1, baseline, xHeight };
}

/**
 * Lay out one line. Returns letters in content-box px:
 *   { src, x, y (centre), w, h, rot } and the line AABB {left, top, right, bottom}.
 * box = { w, h } of the content box; k = px per source px (already resolved).
 */
export function layoutLine(line, byKey, box, k) {
  const units = line.words.map((w) => buildUnit(w, byKey));
  const refH = median(units.map((u) => u.xHeight));
  // flow: unit-local -> line-local source coords, baselines aligned at y=0
  const flowed = [];
  let cursor = 0;
  units.forEach((u, i) => {
    if (i) cursor += GAP * refH * (line.gap ?? 1);
    const dx = cursor - u.x0, dy = -u.baseline;
    for (const l of u.letters) flowed.push({ ...l, cx: l.cx + dx, cy: l.cy + dy, unit: u.id });
    cursor += u.x1 - u.x0;
  });
  // line centre (source)
  let lx0 = Infinity, ly0 = Infinity, lx1 = -Infinity, ly1 = -Infinity;
  for (const l of flowed) {
    const e = boxExtent(l.cx, l.cy, l.w, l.h, l.rot);
    lx0 = Math.min(lx0, e[0]); ly0 = Math.min(ly0, e[1]); lx1 = Math.max(lx1, e[2]); ly1 = Math.max(ly1, e[3]);
  }
  const ccx = (lx0 + lx1) / 2, ccy = (ly0 + ly1) / 2;
  const rotate = line.rotate || 0;

  const place = (s) => {
    const out = flowed.map((l) => {
      const [x, y] = rotPt(l.cx, l.cy, ccx, ccy, rotate);
      return { src: l.src, unit: l.unit, x: (x - ccx) * s, y: (y - ccy) * s, w: l.w * s, h: l.h * s, rot: l.rot + rotate };
    });
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const l of out) {
      const e = boxExtent(l.x, l.y, l.w, l.h, l.rot);
      a = Math.min(a, e[0]); b = Math.min(b, e[1]); c = Math.max(c, e[2]); d = Math.max(d, e[3]);
    }
    return { out, a, b, c, d };
  };

  let s = k * (line.scale ?? 1);
  let p = place(s);
  const maxW = ((line.maxW ?? 94) / 100) * box.w;
  if (p.c - p.a > maxW) { s *= maxW / (p.c - p.a); p = place(s); }
  const maxH = ((line.maxH ?? 40) / 100) * box.h;
  if (p.d - p.b > maxH) { s *= maxH / (p.d - p.b); p = place(s); }

  // anchor
  const ax = (line.x / 100) * box.w, ay = (line.y / 100) * box.h;
  let ox = line.align === 'left' ? ax - p.a : line.align === 'right' ? ax - p.c : ax - (p.a + p.c) / 2;
  let oy = ay - (p.b + p.d) / 2;
  // clamp inside the content box
  ox = Math.min(Math.max(ox, -p.a), box.w - p.c);
  oy = Math.min(Math.max(oy, -p.b), box.h - p.d);
  const letters = p.out.map((l) => ({ ...l, x: l.x + ox, y: l.y + oy }));
  return { letters, scale: s, aabb: { left: p.a + ox, top: p.b + oy, right: p.c + ox, bottom: p.d + oy } };
}

/** Resolve the scene base scale: k at 390 content width, limited by the height. */
export function sceneScale(scene, box, base = 390) {
  const f = Math.min(box.w / base, box.h / 760, 1.6);
  return scene.k * f;
}

export function layoutScene(scene, byKey, box) {
  const k = sceneScale(scene, box);
  return scene.lines.map((line) => ({ line, ...layoutLine(line, byKey, box, k) }));
}

/** Overlap ratio of two AABBs (intersection / smaller area). */
export function overlapRatio(a, b) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  const area = (r) => (r.right - r.left) * (r.bottom - r.top);
  return (w * h) / Math.min(area(a), area(b));
}
