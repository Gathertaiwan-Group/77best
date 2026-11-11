// walk with … — portrait mobile module, Phase 2: sub pages and videos.
//
//   #/about           about overview (Chongqing / New York)
//   #/work            work overview (5 pieces, free scroll, objects rise in order)
//   #/work/<id>       hackathon, huhuu, bedazzling, mist-story (9:16 video), dream-gallery (no video)
//   #/about/<id>      chongqing, new-york (16:9 video + full-screen button)
//
// Routes / parents / objects / easel canvases / links come from data.json
// (`subpages`, `config.links`, `config.videos`); the portrait arrangement from
// layout.js (`SUB`); image files from /m/img/manifest.json (`sub`, `objects`).
//
// Videos announce themselves on window:
//   m:video-play  / m:video-pause   detail: { id, video }
// (Phase 3 uses them to duck the music.)

import { SUB, BG_WIDTHS, subBgName } from './layout.js';

const TALL_MQ = 'not all and (min-aspect-ratio: 3/5)';
const WIDE_MQ = '(min-aspect-ratio: 3/5)';
const TWO_COL_MQ = '(min-width: 768px)';
const SECTION_SCENE = { about: 'about', work: 'work' };

const PLAY_SVG = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.4 11.2 Q15.1 10.6 15.2 12.3 L15.9 36.4 Q16 37.9 17.3 37.1 L36.6 25.3 Q37.8 24.4 36.5 23.6 Z" fill="rgba(255,255,255,0.14)"/></svg>`;
const FS_SVG = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M27.5 10.8 L37.6 10.4 L37.2 20.6"/><path d="M36.9 11.1 L26.4 21.3"/><path d="M20.4 37.4 L10.3 37.6 L10.8 27.4"/><path d="M11.2 36.8 L21.6 26.6"/></svg>`;

export const SUB_CSS = `
.m77-subs{position:absolute;inset:0;z-index:5;visibility:hidden;pointer-events:none;transition:visibility 0s linear .4s}
.m77-subs.is-open{visibility:visible;pointer-events:auto;transition:none}
.m77-subopen .m77-scroller{visibility:hidden;transition:visibility 0s linear .4s}
.m77-page{position:absolute;inset:0;overflow:hidden;background:var(--bgfill,#1f3a1c);opacity:0;visibility:hidden;transform:scale(1.03);transition:opacity .4s ease,transform .5s ease,visibility 0s linear .4s}
.m77-page.is-cur{opacity:1;visibility:visible;transform:none;transition:opacity .4s ease,transform .5s ease;z-index:1}
.m77-page .m77-bg img{opacity:1}
.m77-pscroll{position:absolute;inset:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.m77-pscroll::-webkit-scrollbar{display:none}
.m77-clipx{display:flex;flex-direction:column;min-height:100%;overflow-x:clip}
.m77-clipx>.m77-col{flex:1 0 auto}
.m77-col{--u:calc(min(100vw,760px) / 390);position:relative;width:calc(100% - 2 * max(16px,env(safe-area-inset-left,0px)));max-width:720px;margin:0 auto;padding:calc(env(safe-area-inset-top,0px) + 40px) 0 calc(env(safe-area-inset-bottom,0px) + 40px)}
.m77-page .m77-back{z-index:3}
/* Phase 4 QA: the hand-written links (try it / credits / join) read as buttons: a soft paint smudge under them */
.m77-col>.m77-hot.m77-ph .m77-inner::before{content:"";position:absolute;inset:-8% -7%;border-radius:999px;background:rgba(var(--ink-rgb),.34);filter:blur(7px);pointer-events:none}
.m77-col>.m77-hot.m77-ph .m77-inner>.m77-wipe{position:relative}
.m77-pc{position:relative;display:block;height:auto;rotate:var(--rot,0deg)}
.m77-pc>img,.m77-pc .m77-inner>img{display:block;width:100%;height:auto}
.m77-ink{filter:drop-shadow(0 0 5px rgba(var(--ink-rgb),var(--ink-a,.5))) drop-shadow(0 0 1.5px rgba(var(--ink-rgb),var(--ink-b,.25)))}
.m77-hot.m77-ph{min-width:44px;min-height:44px}
.m77-hot.m77-ph .m77-inner{position:relative;inset:auto;display:block}
.m77-easel{position:relative;margin:0 auto}
.m77-easel>.m77-easel-img{display:block;width:100%;height:auto}
.m77-easel.is-portrait{width:min(92%,520px);width:min(92%,520px,calc((100vh - 150px) * .6));width:min(92%,520px,calc((100svh - 150px) * .6))}
.m77-easel.is-landscape{width:min(100vw,720px);left:50%;translate:-50% 0}
.m77-canvas{position:absolute}
.m77-vbtn{position:absolute;padding:0;margin:0;border:0;background:#2b241d;border-radius:2px;overflow:hidden;cursor:pointer;touch-action:manipulation;outline:none;box-shadow:0 1px 3px rgba(60,45,30,.18)}
.m77-vbtn video{display:block;width:100%;height:100%;object-fit:cover;background:#2b241d}
.m77-vbtn:focus-visible{box-shadow:0 0 0 3px rgba(255,247,205,.9)}
.m77-vshade{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 6px rgba(60,45,30,.35),inset 0 0 1.5px rgba(60,45,30,.45)}
.m77-vplay{position:absolute;left:50%;top:50%;width:min(28%,72px);aspect-ratio:1;translate:-50% -50%;color:#fff;opacity:.92;filter:drop-shadow(0 0 4px rgba(40,30,20,.45));pointer-events:none;transition:opacity .3s,scale .2s ease-out}
.m77-vplay svg{display:block;width:100%;height:100%}
.m77-vbtn:active .m77-vplay{scale:1.12}
.m77-vbtn[data-state=playing] .m77-vplay,.m77-vbtn[data-state=loading] .m77-vplay{opacity:0}
.m77-vlite{position:absolute;left:50%;bottom:10%;translate:-50% 0;padding:5px 11px;border-radius:999px;background:rgba(30,22,15,.74);text-align:center;font:600 13px/1.2 system-ui,sans-serif;letter-spacing:.04em;color:#fff;white-space:nowrap;pointer-events:none}
.m77-vbtn[data-state=playing] .m77-vlite,.m77-vbtn[data-state=loading] .m77-vlite{opacity:0}
.m77-vspin{position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:2.5px solid rgba(255,255,255,.25);border-top-color:rgba(255,255,255,.9);opacity:0;pointer-events:none;animation:m77-spin 1s linear infinite;transition:opacity .2s}
.m77-vbtn[data-state=loading] .m77-vspin{opacity:1;transition-delay:.25s}
@keyframes m77-spin{to{transform:rotate(360deg)}}
.m77-vtex{position:absolute;inset:0;overflow:hidden;pointer-events:none;mix-blend-mode:multiply;opacity:var(--tex,.25)}
.m77-vtex img{position:absolute;max-width:none}
.m77-fs{position:absolute;display:flex;align-items:center;gap:6px;height:44px;min-width:44px;padding:0 12px 0 8px;border:0;border-radius:22px;background:rgba(43,36,29,.74);color:#fff;font:600 13px/1 system-ui,sans-serif;letter-spacing:.03em;cursor:pointer;touch-action:manipulation;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);outline:none}
.m77-fs svg{width:26px;height:26px;filter:drop-shadow(0 0 2px rgba(30,20,10,.5))}
.m77-fs:focus-visible{box-shadow:0 0 0 3px rgba(255,247,205,.9)}
.m77-fs:active{scale:1.06}
.m77-over{position:absolute;pointer-events:none}
.m77-over img{display:block;width:100%;height:auto}
.m77-ground img{filter:drop-shadow(0 8px 6px rgba(22,40,16,.55))}
.m77-oncanvas{position:absolute;left:50%;top:50%;translate:-50% -50%;pointer-events:none;filter:drop-shadow(0 0 3px rgba(90,70,50,.45))}
.m77-oncanvas img{display:block;width:100%;height:auto;filter:brightness(.55) sepia(.35)}
.m77-wipe,.m77-wipe-m{display:block;overflow:hidden}
.m77-wipe-m{overflow:visible}
.m77-wipe img{display:block;width:100%;height:auto}
/* work overview */
.m77-groups{position:relative}
.m77-group{position:relative;display:block;text-decoration:none;color:inherit;outline:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.m77-group+.m77-group{margin-top:calc(var(--u) * 46)}
.m77-group:nth-child(odd){margin-right:auto;margin-left:calc(var(--u) * 6)}
.m77-group:nth-child(even){margin-left:auto;margin-right:calc(var(--u) * 6)}
.m77-gpart{position:absolute;transform-origin:0 0}
.m77-gpart img{display:block;width:100%;height:100%}
.m77-rise{position:absolute;inset:0;opacity:0;translate:0 var(--rise,30px);transition:opacity .33s ease-out,translate .55s cubic-bezier(.22,.8,.36,1)}
.m77-rise.is-label{transition-delay:.25s}
.m77-group.is-in .m77-rise{opacity:1;translate:0 0}
.m77-floaty{position:absolute;inset:0;animation:m77-bobble var(--period,5s) ease-in-out var(--delay,0s) infinite}
@keyframes m77-bobble{0%,100%{translate:0 0}50%{translate:0 calc(var(--amp,8px) * -1)}}
.m77-group .m77-glow{position:absolute;inset:-12%;border-radius:50%;background:radial-gradient(closest-side,var(--glow) 0%,var(--glow-mid) 45%,transparent 100%);opacity:0;pointer-events:none;transition:opacity .2s}
.m77-group.is-pressed .m77-glow{opacity:1}
.m77-group.is-pressed .m77-gscale{scale:1.05}
.m77-gscale{position:absolute;inset:0;transition:scale .12s ease-out}
.m77-group:focus-visible .m77-glow{opacity:1}
.m77-clouds{position:relative;height:calc(var(--u) * 120);max-height:200px;margin-top:calc(var(--u) * 40);pointer-events:none}
.m77-clouds img{position:absolute;bottom:0;max-width:none;height:auto}
@media (min-width: 768px){
  .m77-groups{display:grid;grid-template-columns:1fr 1fr;column-gap:24px;align-items:start}
  .m77-group+.m77-group{margin-top:0}
  .m77-group:nth-child(n){margin-left:auto;margin-right:auto}
  .m77-group:nth-child(even){margin-top:calc(var(--u) * 140)}
  .m77-group:nth-child(n+3){margin-top:calc(var(--u) * -20)}
  .m77-group:nth-child(4){margin-top:calc(var(--u) * 40)}
}
/* about overview */
.m77-about{max-width:560px;display:flex;flex-direction:column;justify-content:center;min-height:100%;gap:min(9vh,90px)}
.m77-agroup{position:relative;display:block;width:100%;outline:none;touch-action:manipulation;text-decoration:none;color:inherit}
.m77-agroup .m77-apart{position:absolute}
.m77-agroup .m77-apart img{display:block;width:100%;height:auto}
.m77-agroup .m77-hot{position:absolute;pointer-events:none}
.m77-agroup.is-pressed .m77-inner{transform:scale(var(--press,1.09))}
.m77-agroup.is-pressed .m77-glow,.m77-agroup:focus-visible .m77-glow{opacity:1;animation:none}
.m77-candle{position:absolute;border-radius:50%;mix-blend-mode:screen;pointer-events:none;background:radial-gradient(circle closest-side,rgba(255,214,140,.9),rgba(255,190,110,0) 100%);animation:m77-flicker 3.2s ease-in-out infinite alternate}
@keyframes m77-flicker{0%{opacity:.25}35%{opacity:.5}60%{opacity:.32}100%{opacity:.55}}
`;

/**
 * ctx: { data, manifest, root, el, on, rel, still, saveData, hoverCfg, rgbMix, onClose }
 */
export function createSubpages(ctx) {
  const { data, manifest, root, el, on, rel, still, saveData, hoverCfg, rgbMix } = ctx;
  const getGsap = ctx.getGsap || (() => window.gsap || null);
  const pages = data.subpages.pages;
  const byRoute = new Map(Object.values(pages).map((p) => [p.route, p]));
  const links = data.config.links;
  const videosCfg = data.config.videos;
  const vcfg = data.config.sub.video;
  const ov = data.config.sub.overview;
  const flt = data.config.sub.float;
  const asset = (file) => data.assets[`assets/sub/${file}`];
  const lite = saveData();

  const layer = el('div', { class: 'm77-subs', 'aria-hidden': 'true' });
  root.append(layer);

  const built = new Map();
  let cur = null;
  const trail = (ctx.seed || []).map((h) => (!h || h === '#' || h === '#/' ? '#/' : h));
  const norm = (h) => (!h || h === '#' || h === '#/' ? '#/' : h);
  const depth = (h) => (h === '#/' ? 0 : h.split('/').length - 1);

  /* ---------------------------------------------------------- helpers */
  function hotVars(node, glow, i = 0) {
    node.style.setProperty('--glow', rgbMix(glow, hoverCfg.glowOuterAlpha));
    node.style.setProperty('--glow-mid', rgbMix(glow, hoverCfg.glowOuterAlpha * 0.35));
    node.style.setProperty('--press', hoverCfg.scale);
    node.style.setProperty('--idle-scale', hoverCfg.idle.scale);
    node.style.setProperty('--lo', hoverCfg.idle.low * 0.6);
    node.style.setProperty('--hi', hoverCfg.idle.high);
    node.style.setProperty('--period', `${hoverCfg.idle.period}s`);
    node.style.setProperty('--delay', `${hoverCfg.idle.delay + hoverCfg.idle.stagger * hoverCfg.idle.period * i}s`);
  }

  /** Press feedback; internal routes navigate 120ms later (like the main hotwords). */
  function bindPress(node, route) {
    let t = 0;
    const press = () => { node.classList.add('is-pressed'); clearTimeout(t); };
    const release = () => { clearTimeout(t); t = setTimeout(() => node.classList.remove('is-pressed'), 160); };
    on(node, 'pointerdown', press);
    on(node, 'pointerup', release);
    on(node, 'pointercancel', release);
    on(node, 'pointerleave', release);
    on(node, 'click', (e) => {
      press();
      if (route) {
        e.preventDefault();
        setTimeout(() => { location.hash = route; release(); }, 120);
      } else release();
    });
  }

  function lazyImg(attrs, list) {
    const im = el('img', { alt: '', decoding: 'async', draggable: 'false', ...attrs, src: null, srcset: null });
    if (attrs.src) im.dataset.src = attrs.src;
    if (attrs.srcset) im.dataset.srcset = attrs.srcset;
    list.push(im);
    return im;
  }
  function objImg(file, list, sizes) {
    const mo = manifest?.objects?.[file];
    if (lite && mo?.small) return lazyImg({ src: mo.small.url, width: mo?.w, height: mo?.h }, list);
    return lazyImg({ src: mo?.url || `/assets/${file}`, srcset: mo?.srcset, sizes: mo?.srcset ? sizes : null, width: mo?.w, height: mo?.h }, list);
  }
  function pieceImg(id, list) {
    const mp = manifest?.sub?.pieces?.[id];
    if (!mp) throw new Error(`m77: piece ${id} missing from manifest (run tools/build-mobile-images.mjs)`);
    return lazyImg({ src: mp.url, width: mp.w, height: mp.h }, list);
  }
  const pieceMax = (id) => SUB.pieces[id]?.maxW;

  function blockStyle(node, b) {
    node.style.width = `${b.w}%`;
    const mw = pieceMax(b.piece);
    if (mw) node.style.maxWidth = `${mw}px`;
    const x = `${b.x ?? 0}%`;
    if (b.align === 'left') { node.style.marginLeft = x; node.style.marginRight = 'auto'; }
    else if (b.align === 'right') { node.style.marginRight = x; node.style.marginLeft = 'auto'; }
    else { node.style.marginLeft = 'auto'; node.style.marginRight = 'auto'; }
    if (b.mt) node.style.marginTop = `calc(var(--u) * ${b.mt})`;
    if (b.rotate) node.style.setProperty('--rot', `${b.rotate}deg`);
  }

  /* ---------------------------------------------------------- page shell */
  function shell(spec, m) {
    const imgs = [];
    const node = el('section', { class: 'm77-page', 'data-page': spec.id, 'aria-hidden': 'true' });
    const bgm = manifest?.sub?.bg?.[m.bg];
    const ink = m.bg === 'curtain' ? '110,62,48' : '22,38,18';
    node.style.setProperty('--ink-rgb', ink);
    if (m.bg === 'curtain') { node.style.setProperty('--ink-a', '.6'); node.style.setProperty('--ink-b', '.45'); }
    // meadow: white daisies in the (fixed) background pass under the words while scrolling
    else { node.style.setProperty('--ink-a', '.75'); node.style.setProperty('--ink-b', '.5'); }
    if (bgm) node.style.setProperty('--bgfill', `linear-gradient(180deg, ${bgm.tall.top}, ${bgm.tall.bottom})`);
    const srcset = (variant) => BG_WIDTHS[variant].slice(0, lite ? 1 : undefined).map((w) => `${bgm?.[variant]?.files?.[w]?.url ?? rel(`img/${subBgName(m.bg, variant, w)}.webp`)} ${w}w`).join(', ');
    const bimg = lazyImg({ srcset: srcset('tall'), sizes: '100vw' }, imgs);
    const bsrc = el('source', { media: WIDE_MQ, sizes: '100vw' });
    bsrc.dataset.srcset = srcset('wide');
    const picture = el('picture', { class: 'm77-bg' }, bsrc, bimg);
    const scroller = el('div', { class: 'm77-pscroll' });
    const col = el('div', { class: 'm77-col' });
    // full-width clip box: glows / objects that reach past the screen edge must not make the page pan sideways
    scroller.append(el('div', { class: 'm77-clipx' }, col));
    const back = el('button', { class: 'm77-back', type: 'button', 'aria-label': 'back' }, el('img', { alt: '', src: asset(spec.arrow?.file || 'arrow.png') || data.assets['assets/sub/arrow.png'] }));
    on(back, 'click', () => goUp(spec));
    const title = el('h1', { class: 'm77-vh' });
    const shade = el('div', { class: 'm77-shade', style: { '--shade-top': '.16', '--shade-bottom': '.08' } });
    // meadow (fixed while the words scroll over it): dim the lower half a little so its white daisies do not compete with the words
    if (m.bg === 'meadow') shade.style.background = 'linear-gradient(180deg,rgba(0,0,0,.16) 0%,rgba(0,0,0,0) 30%,rgba(10,22,8,.1) 50%,rgba(10,22,8,.3) 100%)';
    node.append(picture, shade, scroller, back, title);
    layer.append(node);
    const load = () => {
      if (bsrc.dataset.srcset) { bsrc.srcset = bsrc.dataset.srcset; delete bsrc.dataset.srcset; }
      for (const im of imgs) {
        if (im.dataset.srcset) { im.srcset = im.dataset.srcset; delete im.dataset.srcset; }
        if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; }
      }
    };
    return { id: spec.id, spec, m, node, scroller, col, back, title, imgs, load, videos: [], wipes: [], visits: 0, enter() {}, leave() {}, layout() {} };
  }

  /* ---------------------------------------------------------- hand-writing reveal
   * The sub page text is a whole hand-written image (text.png crops), so it cannot be
   * typed letter by letter like the main scenes. Instead each piece is revealed by a
   * wipe along its own baseline (a clip box whose mover and content slide in opposite
   * directions: transforms only), in reading order, when the page is entered. */
  function wipe(P, im, label) {
    const m = el('span', { class: 'm77-wipe-m' }, im);
    const w = el('span', { class: 'm77-wipe' }, m);
    P.wipes.push({ w, m, im, label });
    return w;
  }
  function reveal(P) {
    const gsap = getGsap();
    P.visits++;
    if (still || !gsap || !P.wipes.length) return;
    const speed = P.visits > 1 ? data.config.text.typing.repeatSpeed || 2 : 1;
    const tl = gsap.timeline({ delay: 0.25 / speed });
    let t = 0;
    for (const x of P.wipes) {
      gsap.killTweensOf([x.m, x.im]);
      const wpx = x.w.getBoundingClientRect().width || 200;
      // ~ the small typing speed: one hand-written letter ≈ 22px, 0.042s
      const d = Math.min(1.5, Math.max(0.45, (wpx / 22) * data.config.text.typing.small.letter * 1.15)) / speed;
      tl.fromTo(x.m, { xPercent: -101 }, { xPercent: 0, duration: d, ease: 'power1.inOut' }, t);
      tl.fromTo(x.im, { xPercent: 101, opacity: 0.2 }, { xPercent: 0, opacity: 1, duration: d, ease: 'power1.inOut' }, t);
      t += d * (x.label ? 0.55 : 0.8);
    }
    tl.eventCallback('onComplete', () => gsap.set(P.wipes.flatMap((x) => [x.m, x.im]), { clearProps: 'transform,opacity' }));
    P.revealTl = tl;
  }

  /* ---------------------------------------------------------- pieces */
  function piece(P, b) {
    const im = pieceImg(b.piece, P.imgs);
    if (b.hot) {
      const h = P.spec.hot.find((x) => x.id === b.hot);
      const href = h.link ? links[h.link] : h.route;
      const a = el('a', { class: 'm77-pc m77-hot m77-ph m77-ink', href, target: h.link ? '_blank' : null, rel: h.link ? 'noopener' : null, 'aria-label': h.label, 'data-hot': h.id });
      hotVars(a, hoverCfg.glowColor, 1);
      const inner = el('span', { class: 'm77-inner' });
      inner.append(el('span', { class: 'm77-glow' }), wipe(P, im, true));
      a.append(inner);
      blockStyle(a, b);
      bindPress(a, h.link ? null : h.route);
      return a;
    }
    const d = el('div', { class: 'm77-pc m77-ink', 'aria-hidden': 'true' }, wipe(P, im));
    blockStyle(d, b);
    return d;
  }

  /* ---------------------------------------------------------- video */
  function makeVideo(P, key, frame) {
    const spec = videosCfg[key];
    const src = rel(`video/${spec.src.split('/').pop()}`);
    const btn = el('button', { class: 'm77-vbtn', type: 'button', 'aria-label': `${P.spec.id}: play video`, 'aria-pressed': 'false', 'data-state': 'paused' });
    Object.assign(btn.style, frame);
    const v = el('video', { playsinline: '', 'webkit-playsinline': '', preload: 'none', poster: spec.poster, disableremoteplayback: '' });
    v.playsInline = true;
    v.preload = 'none';
    btn.append(v, el('div', { class: 'm77-vshade' }), el('span', { class: 'm77-vplay' }), el('span', { class: 'm77-vspin' }));
    btn.querySelector('.m77-vplay').innerHTML = PLAY_SVG;
    if (lite) btn.append(el('span', { class: 'm77-vlite' }, 'tap to load'));
    let want = false;
    const state = (s) => {
      btn.dataset.state = s;
      btn.setAttribute('aria-pressed', String(s !== 'paused'));
      btn.setAttribute('aria-label', `${P.spec.id}: ${s === 'paused' ? 'play' : 'pause'} video`);
    };
    const emit = (type) => window.dispatchEvent(new CustomEvent(type, { detail: { id: P.spec.id, video: v } }));
    on(v, 'playing', () => { if (want) state('playing'); });
    on(v, 'waiting', () => { if (want) state('loading'); });
    on(v, 'play', () => emit('m:video-play'));
    on(v, 'pause', () => { emit('m:video-pause'); if (!want) state('paused'); });
    on(v, 'ended', () => { want = false; state('paused'); v.currentTime = spec.posterAt || 0; });
    const play = () => {
      want = true;
      if (!v.getAttribute('src')) v.src = src;
      state(v.readyState >= 3 ? 'playing' : 'loading');
      const p = v.play();
      if (p && p.catch) p.catch(() => { want = false; state('paused'); });
    };
    const pause = () => { want = false; v.pause(); state('paused'); };
    const stop = () => {
      pause();
      if (v.getAttribute('src')) { v.removeAttribute('src'); v.load(); }
    };
    on(btn, 'click', () => (want ? pause() : play()));
    const isFull = () => document.fullscreenElement === v || document.webkitFullscreenElement === v || v.webkitDisplayingFullscreen;
    const api = { key, video: v, btn, play, pause, stop, isFull, playing: () => want };
    P.videos.push(api);
    return api;
  }

  function fullscreenButton(api) {
    const b = el('button', { class: 'm77-fs', type: 'button', 'aria-label': 'full screen' });
    b.innerHTML = `${FS_SVG}<span>full screen</span>`;
    const v = api.video;
    on(b, 'click', () => {
      api.play();
      // iPhone Safari: only the native video player can go full screen
      if (typeof v.webkitEnterFullscreen === 'function' && !document.fullscreenEnabled) {
        try { v.webkitEnterFullscreen(); } catch { /* not ready yet: playing inline is fine */ }
        return;
      }
      const req = v.requestFullscreen || v.webkitRequestFullscreen;
      if (!req) return;
      Promise.resolve(req.call(v)).then(() => {
        v.controls = true;
        screen.orientation?.lock?.('landscape').catch(() => {});
      }).catch(() => {});
    });
    return b;
  }
  const onFsChange = () => {
    const fe = document.fullscreenElement || document.webkitFullscreenElement;
    for (const P of built.values()) for (const api of P.videos) {
      if (fe !== api.video && api.video.controls) {
        api.video.controls = false;
        try { screen.orientation?.unlock?.(); } catch { /* ignore */ }
      }
    }
  };
  on(document, 'fullscreenchange', onFsChange);
  on(document, 'webkitfullscreenchange', onFsChange);

  /* ---------------------------------------------------------- easel */
  function easel(P, kind) {
    const spec = P.spec;
    const eo = spec.objects.find((o) => o.id.startsWith('easel'));
    const c = spec.canvas;
    const wrap = el('div', { class: `m77-easel is-${kind}` });
    const file = `elements/${eo.file.replace(/\.png$/, '.webp')}`;
    const sizes = kind === 'portrait' ? 'min(92vw, 520px)' : 'min(100vw, 720px)';
    const img = objImg(file, P.imgs, sizes);
    img.className = 'm77-easel-img';
    img.setAttribute('aria-hidden', 'true');
    wrap.append(img);
    const pct = (v) => `${(v * 100).toFixed(3)}%`;
    const box = { left: pct((c.x - eo.x) / eo.w), top: pct((c.y - eo.y) / eo.h), width: pct(c.w / eo.w), height: pct(c.h / eo.h) };
    const canvas = el('div', { class: 'm77-canvas', style: box });
    wrap.append(canvas);
    let api = null;
    if (spec.video) {
      const asp = videosCfg[spec.video].aspect;
      const a = Math.min(c.w, c.h) * vcfg.inset;
      const fw = Math.min(c.w - 2 * a, (c.h - 2 * a) * asp), fh = fw / asp;
      api = makeVideo(P, spec.video, { left: pct((c.w - fw) / 2 / c.w), top: pct((c.h - fh) / 2 / c.h), width: pct(fw / c.w), height: pct(fh / c.h) });
      canvas.append(api.btn);
      // paper texture over the picture (the easel image, multiplied), like the desktop
      const tex = el('div', { class: 'm77-vtex', 'aria-hidden': 'true', style: { '--tex': vcfg.texture } });
      const timg = el('img', { alt: '' });
      timg.dataset.tex = '1';
      Object.assign(timg.style, { width: pct(eo.w / c.w), height: pct(eo.h / c.h), left: pct(-(c.x - eo.x) / c.w), top: pct(-(c.y - eo.y) / c.h) });
      tex.append(timg);
      canvas.append(tex);
      P.tex = timg;
      if (kind === 'landscape') {
        const fs = fullscreenButton(api);
        Object.assign(fs.style, { top: `calc(${pct((c.y - eo.y + c.h) / eo.h)} + 4px)` });
        if (P.m.fs === 'left') fs.style.left = pct((c.x - eo.x) / eo.w);
        else fs.style.right = pct((eo.x + eo.w - c.x - c.w) / eo.w);
        wrap.append(fs);
      }
    }
    if (P.m.onCanvas) {
      const oc = el('div', { class: 'm77-oncanvas', 'aria-hidden': 'true', style: { width: `${P.m.onCanvas.w}%` } }, pieceImg(P.m.onCanvas.piece, P.imgs));
      canvas.append(oc);
    }
    for (const o of P.m.over || []) wrap.append(overItem(P, o));
    return { wrap, api, img };
  }

  function overItem(P, o) {
    const d = el('div', { class: `m77-over${o.ground ? ' m77-ground' : ''}${o.piece ? ' m77-ink' : ''}`, 'aria-hidden': 'true' });
    for (const k of ['top', 'right', 'bottom', 'left']) if (o[k] != null) d.style[k] = `${o[k]}%`;
    d.style.width = `${o.w}%`;
    const im = o.piece ? pieceImg(o.piece, P.imgs) : objImg(o.object, P.imgs);
    let inner = im;
    if (o.rotate || o.flip) im.style.transform = `rotate(${o.rotate || 0}deg)${o.flip ? ' scaleX(-1)' : ''}`;
    if (o.piece && o.rotate) { im.style.transform = ''; d.style.rotate = `${o.rotate}deg`; }
    if (!still && o.sway) {
      im.classList.add('m77-sway');
      im.style.setProperty('--amp', o.sway.amp);
      im.style.setProperty('--half', `${o.sway.period / 2}s`);
      im.style.transformOrigin = o.sway.origin || '50% 100%';
    }
    if (!still && o.float) {
      inner = el('div', { class: 'm77-floaty', style: { position: 'relative', inset: 'auto', '--amp': `${flt.amp * 1.5}px`, '--period': '7s' } }, im);
    }
    d.append(inner);
    return d;
  }

  /* ---------------------------------------------------------- page kinds */
  function buildVideoPage(spec, m) {
    const P = shell(spec, m);
    const e = easel(P, m.easel);
    P.col.classList.add(`is-${m.easel}`);
    // landscape easels are full width: start below the music toggle (top right)
    if (m.easel === 'landscape') P.col.style.paddingTop = 'calc(env(safe-area-inset-top,0px) + 50px)';
    else P.col.style.paddingTop = 'calc(env(safe-area-inset-top,0px) + 30px)';
    P.col.append(e.wrap);
    for (const b of m.blocks) P.col.append(piece(P, b));
    // the hand-written text is an image: its words go to the heading (+ a hidden paragraph)
    const [head, ...rest] = (m.text || '').split(/(?<=\.) /);
    P.title.textContent = head || spec.hot?.[0]?.label?.replace(/ \(opens.*$/, '') || spec.id;
    if (rest.length) P.title.after(el('p', { class: 'm77-vh' }, rest.join(' ')));
    if (P.videos.length) {
      const io = new IntersectionObserver((entries) => {
        for (const en of entries) {
          const api = P.videos.find((x) => x.btn === en.target);
          if (api && en.intersectionRatio < 0.3 && api.playing() && !api.isFull()) api.pause();
        }
      }, { root: P.scroller, threshold: [0, 0.3] });
      P.videos.forEach((api) => io.observe(api.btn));
    }
    P.enter = (dir) => { if (dir !== 'up') reveal(P); };
    P.leave = () => { P.videos.forEach((api) => api.stop()); P.revealTl?.progress(1); };
    P.load = ((load) => () => { load(); if (P.tex) P.tex.src = e.img.currentSrc || e.img.src || e.img.dataset.src || ''; })(P.load);
    if (P.tex) on(e.img, 'load', () => { P.tex.src = e.img.currentSrc || e.img.src; });
    return P;
  }

  function buildWork(spec, m) {
    const P = shell(spec, m);
    P.title.textContent = 'work';
    P.col.style.paddingTop = 'calc(env(safe-area-inset-top,0px) + 64px)';
    const groups = el('div', { class: 'm77-groups' });
    const objById = new Map(spec.objects.map((o) => [o.id, o]));
    const G = [];
    spec.hot.forEach((h, i) => {
      const objs = h.objects.map((id) => objById.get(id)).filter(Boolean);
      // union of the label and its (rotated about top-left) objects, page coords
      let x0 = h.x, y0 = h.y, x1 = h.x + h.w, y1 = h.y + h.h;
      for (const o of objs) {
        const r = (o.rot * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
        for (const [px, py] of [[0, 0], [o.w, 0], [0, o.h], [o.w, o.h]]) {
          const X = o.x + px * cs - py * sn, Y = o.y + px * sn + py * cs;
          x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
        }
      }
      const uw = x1 - x0, uh = y1 - y0;
      const a = el('a', { class: 'm77-group', href: h.route, 'aria-label': h.label, 'data-hot': h.id });
      a.style.width = `calc(var(--gs, .45) * ${uw.toFixed(1)}px)`;
      a.style.aspectRatio = `${uw.toFixed(1)} / ${uh.toFixed(1)}`;
      hotVars(a, hoverCfg.glowColor, i);
      const scale = el('span', { class: 'm77-gscale' });
      scale.append(el('span', { class: 'm77-glow' }));
      const part = (x, y, w, hh) => {
        const s = el('span', { class: 'm77-gpart' });
        Object.assign(s.style, { left: `${((x - x0) / uw) * 100}%`, top: `${((y - y0) / uh) * 100}%`, width: `${(w / uw) * 100}%`, height: `${(hh / uh) * 100}%` });
        return s;
      };
      for (const o of objs) {
        const rise = el('span', { class: 'm77-rise', style: { '--rise': `${ov.riseDist}px` } });
        const fl = el('span', { class: 'm77-floaty' });
        if (!still) {
          fl.style.setProperty('--amp', `${o.id === 'balloon' ? flt.balloon : flt.amp}px`);
          fl.style.setProperty('--period', `${(flt.period[0] + Math.random() * (flt.period[1] - flt.period[0])).toFixed(2)}s`);
          fl.style.setProperty('--delay', `${(-Math.random() * 5).toFixed(2)}s`);
        } else fl.style.animation = 'none';
        const p = part(o.x, o.y, o.w, o.h);
        p.style.transform = `rotate(${o.rot}deg)${o.flip ? ' translateX(100%) scaleX(-1)' : ''}`;
        p.append(objImg(`elements/${o.file.replace(/\.png$/, '.webp')}`, P.imgs));
        fl.append(p);
        rise.append(fl);
        scale.append(rise);
      }
      const lrise = el('span', { class: 'm77-rise is-label m77-ink', style: { '--rise': `${ov.riseDist * 0.5}px` } });
      const lp = part(h.x, h.y, h.w, h.h);
      lp.append(pieceImg(`work-${h.id}`, P.imgs));
      lrise.append(lp);
      scale.append(lrise);
      a.append(scale);
      bindPress(a, h.route);
      groups.append(a);
      G.push(a);
    });
    P.col.append(groups);
    // a band of clouds to close the page, like the desktop floor
    const clouds = el('div', { class: 'm77-clouds', 'aria-hidden': 'true' });
    for (const [i, o] of spec.objects.filter((o) => o.id.startsWith('cloud')).slice(0, 2).entries()) {
      const im = objImg('elements/cloud2.webp', P.imgs);
      Object.assign(im.style, { width: i ? 'min(46%, 300px)' : 'min(64%, 420px)', [i ? 'right' : 'left']: i ? '-8%' : '-14%', bottom: i ? '4%' : '-14%', filter: o.filter ? `brightness(${o.filter[0]}) contrast(${o.filter[1]}) saturate(${o.filter[2]})` : '', transform: o.flip ? 'scaleX(-1)' : '' });
      clouds.append(im);
    }
    P.col.append(clouds);
    P.col.style.paddingBottom = '0';

    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) en.target.classList.add('is-in');
    }, { root: P.scroller, threshold: 0.25 });
    G.forEach((g) => io.observe(g));
    P.enter = (dir) => {
      if (dir === 'down') {
        // replay the rise in order when entering from the main page
        G.forEach((g) => { g.classList.remove('is-in'); io.unobserve(g); });
        requestAnimationFrame(() => G.forEach((g, i) => setTimeout(() => io.observe(g), still ? 0 : i * ov.groupGap * 1000 * 0.5)));
      }
    };
    P.layout = () => {
      const w = P.col.clientWidth;
      if (!w) return;
      const two = matchMedia(TWO_COL_MQ).matches;
      const per = two ? (w - 24) / 2 : w;
      const gs = Math.min(0.62, (per * (two ? 0.8 : 0.62)) / 480);
      P.col.style.setProperty('--gs', gs.toFixed(4));
    };
    return P;
  }

  function buildAbout(spec, m) {
    const P = shell(spec, m);
    P.title.textContent = 'about';
    P.col.classList.add('m77-about');
    P.col.style.paddingTop = 'calc(env(safe-area-inset-top,0px) + 58px)';
    P.col.style.paddingBottom = 'calc(env(safe-area-inset-bottom,0px) + 24px)';
    P.col.style.minHeight = '100%';
    const hot = (id) => spec.hot.find((h) => h.id === id);
    const apart = (img, st, cls = 'm77-apart') => {
      const d = el('span', { class: cls });
      Object.assign(d.style, st);
      d.append(img);
      return d;
    };
    const group = (id, i, parts) => {
      const h = hot(id);
      const a = el('a', { class: 'm77-agroup', href: h.route, 'aria-label': h.label, 'data-hot': h.id });
      hotVars(a, hoverCfg.glowColor, i);
      a.append(...parts);
      bindPress(a, h.route);
      return a;
    };
    const label = (id, st) => {
      const s = el('span', { class: 'm77-hot m77-ink' });
      Object.assign(s.style, st);
      const inner = el('span', { class: 'm77-inner', style: { position: 'relative', inset: 'auto', display: 'block' } });
      const im = pieceImg(id, P.imgs);
      im.style.cssText = 'display:block;width:100%;height:auto';
      inner.append(el('span', { class: 'm77-glow' }), wipe(P, im, true));
      s.append(inner);
      return s;
    };
    // Chongqing: "from ⌂Chongqing" + the lantern (with its candle glow)
    const lantern = objImg('elements/lantern.webp', P.imgs);
    const lw = apart(lantern, { right: '7%', top: '24%', width: '27%', maxWidth: '150px' }, 'm77-apart m77-ground');
    if (!still) {
      lantern.classList.add('m77-sway');
      lantern.style.setProperty('--amp', 1.2);
      lantern.style.setProperty('--half', '3.2s');
      lantern.style.transformOrigin = '50% 100%';
    }
    const candleCfg = data.config.sub.candle;
    const candle = el('span', { class: 'm77-candle' });
    Object.assign(candle.style, { left: `${(candleCfg.at[0] - candleCfg.size / 2) * 100}%`, top: `calc(${candleCfg.at[1] * 100}% - ${candleCfg.size * 50 * (430 / 849)}%)`, width: `${candleCfg.size * 100}%`, aspectRatio: '1' });
    if (still) candle.style.animation = 'none';
    lw.append(candle);
    const g1 = group('chongqing', 0, [
      apart(wipe(P, pieceImg('about-from', P.imgs)), { left: '8%', top: '0', width: '20%', maxWidth: '110px' }, 'm77-apart m77-ink'),
      label('about-chongqing', { left: '0', top: '15%', width: '68%', maxWidth: '400px' }),
      lw,
    ]);
    g1.style.height = 'min(46vw, 330px)';
    g1.style.minHeight = '170px';
    // New York: gramophone + "to New York ☺"
    const g2 = group('new-york', 1, [
      apart(objImg('elements/gramophone.webp', P.imgs), { left: '4%', top: '18%', width: '28%', maxWidth: '170px' }, 'm77-apart m77-ground'),
      apart(wipe(P, pieceImg('about-to', P.imgs)), { left: '40%', top: '0', width: '11%', maxWidth: '70px' }, 'm77-apart m77-ink'),
      label('about-new-york', { right: '0', top: '22%', width: '60%', maxWidth: '330px' }),
    ]);
    g2.style.height = 'min(44vw, 320px)';
    g2.style.minHeight = '160px';
    P.col.append(g1, g2);
    P.enter = (dir) => { if (dir !== 'up') reveal(P); };
    P.leave = () => P.revealTl?.progress(1);
    return P;
  }

  function build(spec) {
    if (built.has(spec.id)) return built.get(spec.id);
    const m = SUB.pages[spec.id];
    if (!m) throw new Error(`m77: no portrait layout for sub page ${spec.id}`);
    const P = m.kind === 'work' ? buildWork(spec, m) : m.kind === 'about' ? buildAbout(spec, m) : buildVideoPage(spec, m);
    built.set(spec.id, P);
    return P;
  }

  /* ---------------------------------------------------------- routing */
  function goUp(spec) {
    const parent = norm(spec.parent);
    if (trail.length > 1 && trail[trail.length - 2] === parent) history.back();
    else location.hash = parent;
  }

  /** Show the page for `hash` (or close the layer for the main page). Returns the page id or null. */
  function route(hashIn) {
    const hash = norm(hashIn);
    let dir = 'down';
    const prev = trail[trail.length - 1];
    if (prev === hash) dir = 'same';
    else if (trail.length > 1 && trail[trail.length - 2] === hash) { trail.pop(); dir = 'up'; }
    else { if (prev && depth(hash) < depth(prev)) dir = 'up'; trail.push(hash); }
    if (trail.length > 50) trail.splice(0, trail.length - 50);

    const spec = byRoute.get(hash);
    if (!spec) { close(); return null; }
    const P = build(spec);
    P.load();
    if (cur && cur !== P) { cur.leave(); cur.node.classList.remove('is-cur'); cur.node.setAttribute('aria-hidden', 'true'); }
    if (dir === 'down' || cur === null) P.scroller.scrollTop = 0;
    const changed = cur !== P;
    cur = P;
    P.node.classList.add('is-cur');
    P.node.setAttribute('aria-hidden', 'false');
    layer.classList.add('is-open');
    layer.setAttribute('aria-hidden', 'false');
    root.classList.add('m77-subopen');
    P.layout();
    if (changed) {
      P.enter(dir);
      setTimeout(() => P.back.focus({ preventScroll: true }), 60);
    }
    return spec.id;
  }

  function close() {
    if (cur) { cur.leave(); cur.node.classList.remove('is-cur'); cur.node.setAttribute('aria-hidden', 'true'); }
    cur = null;
    layer.classList.remove('is-open');
    layer.setAttribute('aria-hidden', 'true');
    root.classList.remove('m77-subopen');
  }

  const pauseAll = () => { for (const P of built.values()) for (const api of P.videos) if (api.playing() && !api.isFull()) api.pause(); };
  on(document, 'visibilitychange', () => { if (document.hidden) pauseAll(); });
  on(window, 'pagehide', pauseAll);
  on(window, 'keydown', (e) => { if (e.key === 'Escape' && cur && !document.fullscreenElement) goUp(cur.spec); });

  /** Section of the main page under a sub route ('about' | 'work' | null). */
  const sectionOf = (hash) => {
    const m = norm(hash).match(/^#\/(about|work)(\/|$)/);
    return m ? SECTION_SCENE[m[1]] : null;
  };

  return {
    layer,
    route,
    close,
    pauseAll,
    sectionOf,
    current: () => cur?.spec.id ?? null,
    layout: () => { for (const P of built.values()) P.layout(); },
    pages: built,
  };
}
