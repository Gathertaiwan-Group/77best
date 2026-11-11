// walk with … — portrait mobile module (Phase 1: shell + four main scenes;
// Phase 2 sub pages in ./sub.js; Phase 3 motion in ./fx.js, music in ./music.js —
// both loaded after the first screen)
//
// Usage (from any page):
//   import { mount, preload } from '/m/app.js';
//   preload();                         // optional: start the first background early
//   const app = await mount(document.body, { /* options */ });
//   app.destroy();                     // removes everything it added
//
// The module only touches the container it is given (plus one <style> and the
// preload <link>s in <head>). Data comes from /m/data.json (tools/extract-data.mjs)
// and /m/img/manifest.json (tools/build-mobile-images.mjs); layout from ./layout.js.

import { SCENES, BG_WIDTHS, bgName, CONTENT_MAX } from './layout.js';
import { groupLetters, layoutScene } from './engine.js';

const BASE = new URL('./', import.meta.url);
const rel = (p) => new URL(p, BASE).href;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = () => !!(navigator.connection && (navigator.connection.saveData || /2g|3g/.test(navigator.connection.effectiveType || '')));
const WIDE_MQ = '(min-aspect-ratio: 3/5)';
const LINK_LABEL = { linkedin: 'LinkedIn', x: 'X', instagram: 'Instagram' };

const CSS = `
.m77{position:fixed;inset:0;overflow:hidden;background:#1f3a1c;color:#fff;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;-webkit-text-size-adjust:100%;font:16px/1.4 system-ui,sans-serif}
.m77 *{box-sizing:border-box}
.m77 img{-webkit-user-drag:none;-webkit-touch-callout:none}
.m77-scroller{position:absolute;inset:0;overflow-x:hidden;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior-y:contain;scrollbar-width:none}
.m77-scroller::-webkit-scrollbar{display:none}
.m77-scene{position:relative;height:100%;overflow:hidden;scroll-snap-align:start;scroll-snap-stop:always;background:var(--bgfill,#1f3a1c);contain:layout paint}
.m77-bg,.m77-bg img{position:absolute;inset:0;width:100%;height:100%}
.m77-bg img{object-fit:cover;object-position:var(--pos,50% 50%);opacity:0;transition:opacity .5s ease}
.m77-bg img.is-in{opacity:1}
.m77-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,var(--shade-top,.12)) 0%,rgba(0,0,0,0) 38%,rgba(0,0,0,0) 70%,rgba(0,0,0,var(--shade-bottom,.1)) 100%)}
.m77-obj{position:absolute;pointer-events:none;will-change:transform}
.m77-obj img{display:block;width:100%;height:auto}
.m77-box{position:absolute;top:calc(env(safe-area-inset-top,0px) + 18px);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);left:max(16px,env(safe-area-inset-left,0px));right:max(16px,env(safe-area-inset-right,0px));max-width:${CONTENT_MAX}px;margin:0 auto;pointer-events:none}
.m77-line{position:absolute;pointer-events:none;filter:drop-shadow(0 0 5px rgba(22,38,18,var(--ink,.4)))}
.m77-line img{position:absolute;display:block;max-width:none;visibility:hidden}
.m77-typed .m77-line img{visibility:visible}
.m77-hot{pointer-events:auto;display:block;text-decoration:none;color:inherit;outline:none;touch-action:manipulation;border-radius:999px}
.m77-hot .m77-inner{position:absolute;inset:0;transform-origin:50% 50%;transition:transform .12s ease-out}
.m77-hot .m77-glow{position:absolute;inset:-18%;border-radius:50%;background:radial-gradient(closest-side,var(--glow) 0%,var(--glow-mid) 45%,transparent 100%);opacity:.25;pointer-events:none}
.m77-backing{position:absolute;inset:-10%;border-radius:50%;background:radial-gradient(closest-side,var(--backing) 0%,var(--backing) 35%,transparent 100%);mix-blend-mode:multiply;opacity:.85;pointer-events:none;filter:blur(6px)}
.m77-hot:focus-visible .m77-glow{opacity:1}
.m77-hot.is-pressed .m77-inner{transform:scale(var(--press,1.09))}
.m77-hot.is-pressed .m77-glow{opacity:1;animation:none}
@keyframes m77-breathe{0%,100%{opacity:var(--lo,.25)}50%{opacity:var(--hi,1)}}
@keyframes m77-breathe-scale{0%,100%{transform:scale(1)}50%{transform:scale(var(--idle-scale,1.045))}}
.m77-ready .m77-hot .m77-glow{animation:m77-breathe var(--period,3.6s) ease-in-out var(--delay,.4s) infinite}
.m77-ready .m77-hot:not(.is-pressed) .m77-inner{animation:m77-breathe-scale var(--period,3.6s) ease-in-out var(--delay,.4s) infinite}
@keyframes m77-sway{from{transform:rotate(calc(var(--amp,2) * -1deg))}to{transform:rotate(calc(var(--amp,2) * 1deg))}}
@keyframes m77-bob{0%,100%{transform:translate(-50%,0) rotate(-90deg)}50%{transform:translate(-50%,6px) rotate(-90deg)}}
.m77-sway{animation:m77-sway var(--half,2.5s) ease-in-out infinite alternate}
.m77-hint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);width:44px;height:44px;padding:8px;border:0;background:none;transform:translate(-50%,0) rotate(-90deg);animation:m77-bob 2.4s ease-in-out infinite;opacity:.85;cursor:pointer}
.m77-hint img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 4px rgba(22,38,18,.5))}
.m77-hint{outline:none}.m77-hint:focus-visible img{filter:drop-shadow(0 0 6px rgba(255,247,205,.95)) drop-shadow(0 0 2px rgba(255,247,205,.95))}
.m77-sub{position:absolute;inset:0;z-index:5;background:var(--theme,#1f3a1c);opacity:0;visibility:hidden;transition:opacity .35s ease,visibility 0s linear .35s}
.m77-sub.is-open{opacity:1;visibility:visible;transition:opacity .35s ease}
.m77-sub .m77-bg img{opacity:.45;filter:blur(2px) saturate(.9)}
.m77-back{position:absolute;z-index:2;top:calc(env(safe-area-inset-top,0px) + 8px);left:max(8px,env(safe-area-inset-left,0px));width:56px;height:48px;padding:10px;border:0;background:none;cursor:pointer;touch-action:manipulation}
.m77-back{outline:none}
/* Phase 4 QA: keep the arrow readable on the light frames / paper of the sub pages: a soft dark halo */
.m77-back::before{content:"";position:absolute;inset:5px 3px;border-radius:999px;background:rgba(26,20,14,.6);filter:blur(4px);pointer-events:none}
.m77-back img{position:relative}
.m77-back img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 4px rgba(22,38,18,.5))}
.m77-back:focus-visible img{filter:drop-shadow(0 0 6px rgba(255,247,205,.95)) drop-shadow(0 0 2px rgba(255,247,205,.95))}
.m77-sub .m77-line img{visibility:visible}
.m77-vh{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
@media (prefers-reduced-motion: reduce){.m77 *{animation:none!important;transition:none!important}.m77-scroller{scroll-behavior:auto}}
`;

/* ---------------------------------------------------------------- helpers */
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style') for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) n.style.setProperty(sk, sv); else n.style[sk] = sv; }
    else if (k.startsWith('--')) n.style.setProperty(k, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...kids.filter(Boolean));
  return n;
}
const rgbMix = (rgb, a) => rgb.replace(/^rgb\((.*)\)$/, `rgba($1,${a})`);
const jitter = (v, j) => v * (1 + (Math.random() * 2 - 1) * j);

let gsapPromise = null;
function loadGsap() {
  if (window.gsap) return Promise.resolve(window.gsap);
  if (!gsapPromise) {
    gsapPromise = new Promise((resolve) => {
      const s = el('script', { src: rel('vendor/gsap.min.js'), async: true });
      s.onload = () => resolve(window.gsap || null);
      s.onerror = () => resolve(null);
      document.head.append(s);
    });
  }
  return gsapPromise;
}

function bgSrcset(scene, variant, manifest) {
  const files = manifest?.bg?.[scene.id]?.[variant]?.files;
  // Save-Data / slow connection: only the @2x file
  return BG_WIDTHS[variant].slice(0, saveData() ? 1 : undefined).map((w) => `${files?.[w]?.url ?? rel(`img/${bgName(scene, variant, w)}.webp`)} ${w}w`).join(', ');
}
/** The first (LCP) scene always uses the @2x file so the first screen stays inside budget. */
function firstSrcset(scene, variant, manifest) {
  const w = BG_WIDTHS[variant][0];
  const f = manifest?.bg?.[scene.id]?.[variant]?.files?.[w]?.url ?? rel(`img/${bgName(scene, variant, w)}.webp`);
  return `${f} ${w}w`;
}

/** Start fetching the first scene's background right away (call before mount). */
export function preload() {
  const scene = SCENES[0];
  if (document.querySelector('link[data-m77-preload]')) return;
  for (const [variant, media] of [['tall', `not all and ${WIDE_MQ}`], ['wide', WIDE_MQ]]) {
    const w = BG_WIDTHS[variant][0];
    document.head.append(el('link', { rel: 'preload', as: 'image', href: rel(`img/${bgName(scene, variant, w)}.webp`), media, fetchpriority: 'high', 'data-m77-preload': '' }));
  }
}

/* ----------------------------------------------------------------- mount */
export async function mount(container, opts = {}) {
  const dataUrl = opts.dataUrl || rel('data.json');
  const manifestUrl = opts.manifestUrl || rel('img/manifest.json');
  preload();
  const still = reduceMotion();
  const gsapReady = still ? Promise.resolve(null) : loadGsap();

  const style = el('style', { 'data-m77': '' });
  style.textContent = CSS;
  document.head.append(style);

  const root = el('div', { class: 'm77', 'data-m77-root': '', role: 'main' });
  const scroller = el('div', { class: 'm77-scroller', tabindex: '-1' });
  root.append(scroller);
  container.append(root);

  const [data, manifest] = await Promise.all([
    fetch(dataUrl).then((r) => r.json()),
    fetch(manifestUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const cfg = data.config;
  const typingCfg = cfg.text.typing;
  const hoverCfg = cfg.hover;
  const byKey = groupLetters(data.letters);
  if (opts.setTitle && data.name) document.title = `walk with ${data.name}`;

  const cleanups = [];
  let destroyed = false;
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)); };

  /* ---------- build scenes */
  const scenes = SCENES.map((spec, index) => buildScene(spec, index));
  // sub pages live in ./sub.js, loaded on the first sub route (deep link / tap) or when idle
  const firstHash = location.hash;
  let subs = null, subsP = null;
  const getSubs = () => (subsP ||= import('./sub.js').then(({ createSubpages, SUB_CSS }) => {
    const st = el('style', { 'data-m77': 'sub' });
    st.textContent = SUB_CSS;
    document.head.append(st);
    cleanups.push(() => st.remove());
    subs = createSubpages({ data, manifest, root, el, on, rel, still, saveData, hoverCfg, rgbMix, seed: [firstHash], getGsap: () => window.gsap || null });
    return subs;
  }));

  function buildScene(spec, index) {
    const m = manifest?.bg?.[spec.id];
    const node = el('section', {
      class: 'm77-scene',
      'data-scene': spec.id,
      'aria-label': spec.id,
      style: { '--pos': spec.bg.position },
    });
    node.style.setProperty('--bgfill', m ? `linear-gradient(180deg, ${m.tall.top}, ${m.tall.bottom})` : spec.theme);
    const first = index === 0;
    const img = el('img', { alt: '', decoding: 'async', sizes: '100vw', fetchpriority: first ? 'high' : null, loading: first ? 'eager' : 'lazy' });
    const source = el('source', { media: WIDE_MQ, sizes: '100vw' });
    const picture = el('picture', { class: 'm77-bg' }, source, img);
    const fill = first ? firstSrcset : bgSrcset;
    const setBg = () => {
      if (img.dataset.set) return;
      img.dataset.set = '1';
      source.srcset = fill(spec, 'wide', manifest);
      img.srcset = fill(spec, 'tall', manifest);
    };
    // the first (LCP) scene paints its background as soon as it arrives (no fade:
    // opacity-0 paints are not LCP candidates); later scenes fade in
    if (first) img.classList.add('is-in');
    const onBg = () => img.classList.add('is-in');
    img.addEventListener('load', onBg, { once: true });
    node.append(picture, el('div', { class: 'm77-shade' }));

    // objects
    const objs = el('div', { class: 'm77-objects', 'aria-hidden': 'true' });
    const objImgs = [];
    const objRefs = [];
    for (const o of spec.objects) {
      const mo = manifest?.objects?.[o.file];
      const [vy, vx] = o.anchor.split('-');
      const wrap = el('div', { class: 'm77-obj' });
      if (vx === 'center') {
        wrap.style.left = `calc(50% + ${o.x}%)`;
        wrap.style.marginLeft = `calc(min(${o.w}%, ${o.maxW}px) / -2)`;
      } else wrap.style[vx] = `${o.x}%`;
      wrap.style[vy] = `${o.y}%`;
      wrap.style.width = `min(${o.w}%, ${o.maxW}px)`;
      if (o.rotate) wrap.style.rotate = `${o.rotate}deg`;
      if (o.back) wrap.style.zIndex = '0';
      const im = el('img', { alt: '', decoding: 'async', width: mo?.w, height: mo?.h, loading: first ? 'eager' : 'lazy', fetchpriority: first && o.lcp ? 'high' : null });
      im.dataset.src = mo?.url || `/assets/${o.file}`;
      if (o.filter) im.style.filter = o.filter;
      // sway (flowers) and float (contact clouds / door) are driven by ./fx.js
      wrap.append(im);
      objs.append(wrap);
      objImgs.push(im);
      objRefs.push({ spec: o, wrap, im });
    }
    node.append(objs);

    // text
    const box = el('div', { class: 'm77-box' });
    const label = el('h2', { class: 'm77-vh' });
    const lines = spec.lines.map((line, li) => buildLine(spec, line, li));
    label.textContent = lines.map((l) => l.text).join(' ');
    box.append(...lines.map((l) => l.node));
    node.append(label, box);

    if (spec.hint) {
      const hint = el('button', { class: 'm77-hint', type: 'button', 'aria-label': 'next section' }, el('img', { alt: '', src: data.assets['assets/sub/arrow.png'] }));
      on(hint, 'click', () => goTo(index + 1));
      node.append(hint);
    }
    scroller.append(node);

    let loaded = false;
    let load = () => {
      if (loaded) return;
      loaded = true;
      setBg();
      for (const im of objImgs) im.src = im.dataset.src;
      for (const l of lines) for (const im of l.imgs) im.src = im.dataset.src;
    };
    return { spec, index, node, box, img, lines, objs: objRefs, isLoaded: () => loaded, get load() { return load; }, set load(f) { load = f; }, typed: false, typing: false };
  }

  function buildLine(spec, line, li) {
    const words = line.words.map((w) => (typeof w === 'string' ? w : w.id));
    const withs = line.words.flatMap((w) => (typeof w === 'string' ? [] : w.with || []));
    const all = [...words, ...withs].flatMap((k) => byKey.get(k) || []);
    const hotLetter = all.find((l) => l.keyword || l.link);
    const text = words.map((k) => byKey.get(k)?.[0]?.text ?? '').join(' ');
    let node, inner;
    if (hotLetter) {
      const kw = hotLetter.keyword, link = hotLetter.link;
      const href = kw ? `#/${kw}` : cfg.links[link];
      node = el('a', {
        class: 'm77-line m77-hot',
        href,
        target: link ? '_blank' : null,
        rel: link ? 'noopener' : null,
        'aria-label': link ? LINK_LABEL[link] || link : kw,
        'data-hot': kw || link,
      });
      const glow = cfg.hover.glowColors?.[hotLetter.word] || hoverCfg.glowColor;
      node.style.setProperty('--glow', rgbMix(glow, hoverCfg.glowOuterAlpha));
      node.style.setProperty('--glow-mid', rgbMix(glow, hoverCfg.glowOuterAlpha * 0.35));
      node.style.setProperty('--press', hoverCfg.scale);
      node.style.setProperty('--idle-scale', hoverCfg.idle.scale);
      node.style.setProperty('--lo', hoverCfg.idle.low * 0.6);
      node.style.setProperty('--hi', hoverCfg.idle.high);
      node.style.setProperty('--period', `${hoverCfg.idle.period}s`);
      node.style.setProperty('--delay', `${hoverCfg.idle.delay + hoverCfg.idle.stagger * hoverCfg.idle.period * li}s`);
      inner = el('span', { class: 'm77-inner' });
      const backing = hoverCfg.backing?.[hotLetter.word];
      if (backing) {
        const b = el('span', { class: 'm77-backing' });
        b.style.setProperty('--backing', rgbMix(backing.color, 0.9));
        inner.append(b);
      }
      inner.append(el('span', { class: 'm77-glow' }));
      node.append(inner);
      bindPress(node, kw);
    } else {
      node = el('div', { class: 'm77-line', 'aria-hidden': 'true' });
      inner = node;
    }
    const ink = line.ink ?? spec.ink; // per line (layout.js `ink`), else per scene
    if (ink != null) node.style.setProperty('--ink', ink);
    const imgs = all.map((l) => {
      const im = el('img', { alt: '', decoding: 'async', draggable: 'false', 'aria-hidden': 'true' });
      im.dataset.src = l.url;
      im.dataset.seq = l.seq;
      return im;
    });
    const imgByLetter = new Map(all.map((l, i) => [l, imgs[i]]));
    inner.append(...imgs);
    return { line, node, inner, imgs, imgByLetter, hot: !!hotLetter, minHit: hotLetter?.link ? 48 : 44, text };
  }

  function bindPress(node, internal) {
    let t = 0;
    const press = () => { node.classList.add('is-pressed'); clearTimeout(t); };
    const release = () => { clearTimeout(t); t = setTimeout(() => node.classList.remove('is-pressed'), 160); };
    on(node, 'pointerdown', press);
    on(node, 'pointerup', release);
    on(node, 'pointercancel', release);
    on(node, 'pointerleave', release);
    if (internal) {
      on(node, 'click', (e) => {
        e.preventDefault();
        press();
        const target = node.getAttribute('href');
        setTimeout(() => { location.hash = target; release(); }, 120);
      });
    } else {
      on(node, 'click', () => { press(); release(); });
    }
  }

  /* ---------- layout */
  function layoutAll() {
    const ref = scenes[0].box;
    const box = { w: ref.clientWidth, h: ref.clientHeight };
    if (!box.w || !box.h) return;
    for (const s of scenes) {
      const placed = layoutScene(s.spec, byKey, box);
      placed.forEach((p, i) => placeLine(s.lines[i], p));
    }
    subs?.layout();
  }

  function placeLine(L, placed) {
    const pad = L.hot ? hoverCfg.hitPad * placed.scale : 0;
    let { left, top, right, bottom } = placed.aabb;
    left -= pad; right += pad; top -= pad; bottom += pad;
    const grow = (a, b, min) => { const d = Math.max(0, min - (b - a)) / 2; return [a - d, b + d]; };
    if (L.hot) { [left, right] = grow(left, right, L.minHit); [top, bottom] = grow(top, bottom, L.minHit); }
    Object.assign(L.node.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    placed.letters.forEach((p) => {
      const im = L.imgByLetter.get(p.src);
      Object.assign(im.style, {
        left: `${(p.x - p.w / 2 - left).toFixed(2)}px`,
        top: `${(p.y - p.h / 2 - top).toFixed(2)}px`,
        width: `${p.w.toFixed(2)}px`,
        height: `${p.h.toFixed(2)}px`,
        rotate: `${p.rot.toFixed(2)}deg`,
      });
    });
  }

  /* ---------- typing */
  async function typeScene(s) {
    if (s.typed || s.typing) return;
    s.typing = true;
    s.load();
    const imgs = s.lines.flatMap((l) => l.imgs);
    await Promise.race([
      Promise.all(imgs.map((im) => (im.complete && im.naturalWidth ? null : im.decode().catch(() => null)))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    const gsap = await gsapReady;
    if (!gsap || still) { s.node.classList.add('m77-typed'); s.typed = true; return; }
    const speed = s.spec.typing === 'title' ? typingCfg.title : typingCfg.small;
    const letters = s.lines.flatMap((L) => [...L.imgByLetter.entries()].map(([l, im]) => ({ l, im })));
    letters.sort((a, b) => a.l.seq - b.l.seq);
    const lead = letters.filter((x) => x.l.group === 'lead');
    const rest = letters.filter((x) => x.l.group !== 'lead');
    const tl = gsap.timeline({ paused: true, delay: s.index === 0 ? typingCfg.startAt : 0.15 });
    const pop = typingCfg.flowerPop;
    const show = ({ l, im }, t) => {
      tl.set(im, { visibility: 'visible' }, t);
      if (l.doodle && pop.units.includes(l.text)) {
        const d = pop.duration * 0.6;
        tl.set(im, { scale: pop.fromScale, rotation: (Math.random() < 0.5 ? -1 : 1) * pop.rotate }, t);
        tl.to(im, { scale: pop.overshoot, duration: d, ease: 'power2.out' }, t);
        tl.to(im, { scale: 1, duration: pop.duration - d, ease: 'power1.inOut' }, t + d);
        tl.to(im, { rotation: 0, duration: pop.duration, ease: 'power2.out' }, t);
      }
    };
    lead.forEach((x, i) => show(x, (i / Math.max(1, lead.length)) * typingCfg.leadDuration * 0.75));
    let t = lead.length ? typingCfg.leadDuration + jitter(speed.wordGap, typingCfg.jitter) * 0.5 : 0;
    let prev = '';
    for (const x of rest) {
      if (prev && x.l.word !== prev) t += jitter(speed.wordGap, typingCfg.jitter);
      prev = x.l.word;
      show(x, t);
      t += jitter(speed.letter, typingCfg.jitter);
    }
    tl.eventCallback('onComplete', () => { s.node.classList.add('m77-typed'); s.typed = true; s.typing = false; });
    tl.play();
  }

  /* ---------- observers */
  const typeIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) typeScene(scenes.find((s) => s.node === e.target));
  }, { root: scroller, threshold: 0.6 });
  scenes.forEach((s) => typeIO.observe(s.node));
  cleanups.push(() => typeIO.disconnect());

  let prefetchIO = null;
  const startPrefetch = () => {
    if (prefetchIO || saveData()) return;
    prefetchIO = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) scenes.find((s) => s.node === e.target).load();
    }, { root: scroller, rootMargin: '100% 0px' });
    scenes.forEach((s) => prefetchIO.observe(s.node));
    cleanups.push(() => prefetchIO.disconnect());
  };
  // on save-data, still load a scene once it is actually reached (not when it only touches the edge)
  const nearIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && e.intersectionRatio > 0) scenes.find((s) => s.node === e.target).load();
  }, { root: scroller, threshold: [0, 0.01] });
  scenes.forEach((s) => nearIO.observe(s.node));
  cleanups.push(() => nearIO.disconnect());

  scenes[0].load();
  const firstBg = scenes[0].img;
  Promise.all([firstBg, ...scenes[0].lines.flatMap((l) => l.imgs)].map((im) => (im.complete && im.naturalWidth ? null : im.decode().catch(() => null))))
    .then(() => performance.mark?.('m77-first-screen'));
  // Phase 3 modules come after the first screen: they never count against its budget
  let fx = null, music = null;
  const fxReady = { resolve: null };
  const fxP = new Promise((r) => { fxReady.resolve = r; });
  const startPhase3 = () => {
    import('./music.js').then(({ createMusic }) => {
      if (destroyed) return;
      music = createMusic({ root, data, el, on, rel });
      cleanups.push(() => music.destroy());
      music.reveal();
    }).catch((e) => console.warn('m77 music', e));
    Promise.all([import('./fx.js'), gsapReady]).then(([{ createFx }, gsap]) => {
      if (destroyed) return;
      fx = createFx({ root, scroller, scenes, data, manifest, gsap: still ? null : gsap, still, lite: saveData(), on, el, rel });
      cleanups.push(() => fx.destroy());
      fxReady.resolve(fx);
    }).catch((e) => console.warn('m77 fx', e));
  };
  const afterFirst = () => setTimeout(() => {
    startPhase3();
    (window.requestIdleCallback || setTimeout)(() => { startPrefetch(); if (!saveData()) setTimeout(getSubs, 1500); });
  }, 300);
  if (firstBg.complete && firstBg.naturalWidth) afterFirst();
  else { firstBg.addEventListener('load', afterFirst, { once: true }); firstBg.addEventListener('error', afterFirst, { once: true }); }

  /* ---------- navigation helpers */
  const sceneHeight = () => scroller.clientHeight;
  const current = () => Math.round(scroller.scrollTop / Math.max(1, sceneHeight()));
  function goTo(i) {
    const n = Math.max(0, Math.min(scenes.length - 1, i));
    scroller.scrollTo({ top: n * sceneHeight(), behavior: still ? 'auto' : 'smooth' });
  }

  /* ---------- sub pages (#/about, #/work, #/work/<id>, #/about/<id>) — see sub.js */
  const SUB_RE = /^#\/(about|work)(\/|$)/;
  async function route() {
    if (!subs && !SUB_RE.test(location.hash)) return; // main page, sub pages never opened
    const S = await getSubs();
    const id = S.route(location.hash);
    fx?.refresh();
    // keep the main page under a sub page on its section, so "back" lands there
    const section = id ? S.sectionOf(location.hash) : null;
    if (section) {
      const i = scenes.findIndex((s) => s.spec.id === section);
      if (i >= 0 && current() !== i) { scroller.scrollTop = i * sceneHeight(); lastIdx = i; }
    }
  }
  on(window, 'hashchange', route);

  /* ---------- resize */
  let rt = 0, lastIdx = 0;
  on(scroller, 'scroll', () => { lastIdx = current(); }, { passive: true });
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(() => { layoutAll(); scroller.scrollTop = lastIdx * sceneHeight(); }, 80);
  };
  on(window, 'resize', onResize);
  on(window, 'orientationchange', onResize);

  layoutAll();
  route();
  if (still) scenes.forEach((s) => s.node.classList.add('m77-typed'));
  requestAnimationFrame(() => root.classList.add('m77-ready'));

  return {
    root,
    scenes: scenes.map((s) => s.node),
    goTo,
    relayout: layoutAll,
    get subs() { return subs; },
    loadSubs: getSubs,
    get fx() { return fx; },
    fxReady: fxP,
    get music() { return music; },
    destroy() {
      destroyed = true;
      cleanups.forEach((f) => f());
      root.remove();
      style.remove();
      document.querySelectorAll('link[data-m77-preload]').forEach((l) => l.remove());
    },
  };
}
