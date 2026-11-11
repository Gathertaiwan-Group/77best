// walk with … — portrait mobile module, Phase 3: motion.
//
// Loaded after the first screen (dynamic import from app.js), so it never costs
// first-screen bytes. Everything that moves here is driven by the GSAP ticker's
// *time* (never frame counts), so iOS low-power mode (rAF capped at 30fps) only
// lowers smoothness, not speed. Only `transform` / `opacity` are animated.
//
//   - flower sway on the home scene (flowers.overrides amp_deg / period_s / startDir,
//     slow wave, wind gusts — the desktop formula), white flower slow spin + breathe
//   - contact clouds / door: enter slide (contact.enter) + float (contact.float / doorFloat)
//   - touch glow: a radial glow (cursor.blob.gradient) at every pointerdown, fades out in 0.4s
//   - tap on empty space: pollen (flowers.pollen) + flower ripple (flowers.click.ripple / spring)
//   - letters scatter when a scene is scrolled away and gather again when it comes back
//     (text.scatter, lighter: no blur)
//   - about: the stream (stream_mask) gets a slowly travelling light band (CSS, masked)
//   - long press = tap (and no system image / link menu)
//   - performance watchdog: mean frame time every 2s; > 22ms turns sway + particles
//     off for the rest of the session
//   - scenes that are not on screen (or are under an open sub page) are not ticked,
//     and their CSS animations are paused
//
// ctx: { root, scroller, scenes, data, manifest, gsap, still, lite, on, el, rel }

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const rndA = (r) => rnd(r[0], r[1]);
const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v));
const baseName = (f) => f.replace(/^.*\//, '').replace(/\.\w+$/, '');

export const FX_CSS = `
.m77-scene.m77-off *,.m77-subopen .m77-scene *,.m77-page:not(.is-cur) *,.m77-subs:not(.is-open) *{animation-play-state:paused!important}
.m77-lowfx .m77-sway{animation:none!important}
.m77-touch{position:absolute;left:0;top:0;z-index:8;width:var(--ts,92px);height:var(--ts,92px);margin:calc(var(--ts,92px) / -2) 0 0 calc(var(--ts,92px) / -2);border-radius:50%;pointer-events:none;opacity:0;mix-blend-mode:screen;will-change:transform,opacity}
.m77-pollen{position:absolute;inset:0;z-index:7;pointer-events:none;overflow:hidden}
.m77-pollen i{position:absolute;left:0;top:0;border-radius:50%;mix-blend-mode:screen;will-change:transform,opacity}
.m77-stream{position:absolute;inset:0;pointer-events:none;overflow:hidden;opacity:0;transition:opacity 1.2s ease;-webkit-mask-size:cover;mask-size:cover;-webkit-mask-position:50% 50%;mask-position:50% 50%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.m77-stream.is-on{opacity:1}
.m77-band{position:absolute;left:-40%;right:-40%;top:-40%;height:180%;rotate:var(--ang,-14deg);pointer-events:none}
.m77-band i{position:absolute;left:0;right:0;top:calc(var(--p) * -1);bottom:0;will-change:transform;mix-blend-mode:screen}
`;

export function createFx(ctx) {
  const { root, scroller, scenes, data, manifest, gsap, still, lite, on, el } = ctx;
  const cfg = data.config;
  const F = cfg.flowers;
  const P = F.pollen;
  const C = cfg.contact;
  const W = cfg.wind;
  const WF = cfg.whiteFlower;
  const S = cfg.text.scatter;
  const blob = cfg.cursor.blob;
  const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
  // the watchdog's verdict holds for the browser session (a reload in the same tab stays light)
  const LOWFX_KEY = 'm77:lowfx';
  let wasLow = false;
  try { wasLow = !!sessionStorage.getItem(LOWFX_KEY); } catch { /* ignore */ }

  const state = {
    sway: !still && !!gsap,
    float: !still && !!gsap,
    particles: !still && !lite && !!gsap,
    scatter: !still && !!gsap,
    degraded: false,
    avgFrame: 0,
    windows: 0,
    running: false,
    pollenCount: low ? [4, 6] : [6, 8],
    lastPollen: 0,
    lastRipple: 0,
    touches: 0,
  };
  const cleanups = [];
  const style = el('style', { 'data-m77': 'fx' });
  style.textContent = FX_CSS;
  document.head.append(style);
  cleanups.push(() => style.remove());

  /* ------------------------------------------------------------ scene state */
  const ratio = new Map(scenes.map((s) => [s, 0]));
  const byNode = new Map(scenes.map((s) => [s.node, s]));
  const subOpen = () => root.classList.contains('m77-subopen');
  const sceneScale = (s) => s.node.clientHeight / (s.spec.bg.tall.h || 1632);

  /* ------------------------------------------------------------ flowers */
  const home = scenes.find((s) => s.spec.id === 'home');
  const flowers = [];
  for (const o of home?.objs || []) {
    if (!o.spec.sway) continue;
    const name = baseName(o.spec.file);
    const ov = F.overrides[name] || {};
    const isWhite = name === 'white_flower';
    const f = {
      name, wrap: o.wrap, im: o.im, spec: o.spec, white: isWhite,
      amp: (ov.amp_deg ?? o.spec.sway.amp) * F.ampScale,
      period: (ov.period_s ?? o.spec.sway.period) * F.periodScale,
      phase: ((ov.startDir ?? 1) > 0 ? 0 : Math.PI) + rnd(-F.phaseJitter, F.phaseJitter),
      slowPhase: Math.random() * TAU,
      spin0: Math.random() * 360, spinExtra: { v: 0 },
      kick: 0, kickVel: 0, squash: { v: 1 },
      cx: 0.5,
    };
    if (isWhite) o.im.style.transformOrigin = `${WF.pivot[0] * 100}% ${WF.pivot[1] * 100}%`;
    else o.im.style.transformOrigin = o.spec.sway.origin || '50% 100%';
    flowers.push(f);
  }
  // wind gusts (desktop: every 6–10s a gust sweeps across the canvas, damped oscillation)
  const gusts = [];
  let nextGust = Infinity;
  const nw = TAU / W.oscPeriod;
  const nN = Math.atan(nw * W.decay) / nw;
  const nR = Math.exp(-nN / W.decay) * Math.sin(nw * nN);
  const Ni = (e) => (e <= 0 ? 0 : (Math.exp(-e / W.decay) * Math.sin(nw * e)) / nR);
  const wind = (xDesign, t) => gusts.reduce((a, g) => a + Ni(t - g.start - (xDesign / DESIGN_W) * W.sweep), 0);
  const DESIGN_W = data.stage?.design_width || 2912;

  function measureFlowers() {
    if (!home) return;
    const w = home.node.clientWidth || 1;
    const crop = home.spec.bg.tall;
    const r0 = home.node.getBoundingClientRect();
    for (const f of flowers) {
      const r = f.wrap.getBoundingClientRect();
      f.cx = (r.left + r.width / 2 - r0.left) / w; // 0..1 of the scene width
      f.xDesign = crop.x + f.cx * crop.w;
    }
  }

  /* ------------------------------------------------------------ contact clouds / door */
  const contact = scenes.find((s) => s.spec.id === 'contact');
  const clouds = [];
  for (const o of contact?.objs || []) {
    if (!o.spec.float && !o.spec.doorFloat) continue;
    const [vy, vx] = o.spec.anchor.split('-');
    const door = !!o.spec.doorFloat;
    const centre = vx === 'center';
    const group = centre ? 'doorClouds' : vy === 'top' ? 'topRight' : 'bottomLeft';
    const en = group === 'doorClouds' ? C.enter.doorClouds : C.enter[group];
    clouds.push({
      wrap: o.wrap, door, centre,
      side: vx === 'right' ? 1 : vx === 'left' ? -1 : 0,
      fx: door ? 0 : rndA(C.float.x), fy: door ? 0 : rndA(C.float.y),
      period: door ? C.doorFloat.period : rndA(C.float.period),
      phase: Math.random() * TAU,
      en, group, e: { v: 1 },
    });
  }
  // stagger inside each enter group, like the desktop
  for (const g of ['topRight', 'bottomLeft', 'doorClouds']) clouds.filter((c) => c.group === g).forEach((c, i) => { c.delay = (c.en.delay || 0) + i * (c.en.stagger || 0); });
  let contactIn = 'in';
  function contactEnter() {
    if (!state.float || contactIn === 'in') return;
    contactIn = 'in';
    for (const c of clouds) {
      gsap.killTweensOf(c.e);
      c.e.v = 0;
      gsap.to(c.e, { v: 1, duration: c.en.duration, delay: c.delay, ease: C.enter.ease });
    }
  }
  function contactReset() {
    if (!state.float) return;
    contactIn = 'out';
    for (const c of clouds) { gsap.killTweensOf(c.e); c.e.v = 0; }
    writeClouds(gsap.ticker.time);
  }

  /* ------------------------------------------------------------ ticker */
  let lastNow = 0, winSum = 0, winN = 0, winStart = 0, skip = 0;
  function tick(t) {
    const now = performance.now();
    if (skip > 0) skip--;
    else if (lastNow) {
      winSum += Math.min(100, now - lastNow); winN++;
      if (now - winStart >= 2000) {
        const avg = winSum / Math.max(1, winN);
        state.avgFrame = +avg.toFixed(2);
        state.windows++;
        winSum = 0; winN = 0; winStart = now;
        if (avg > 22 && !state.degraded) degrade(avg);
      }
    }
    if (!winStart) winStart = now;
    lastNow = now;
    if (t >= nextGust) {
      gusts.push({ start: t });
      while (gusts.length && t - gusts[0].start > W.sweep + W.decay * 6) gusts.shift();
      nextGust = t + rnd(W.intervalMin, W.intervalMax);
    }
    if (state.sway && (ratio.get(home) || 0) > 0 && !subOpen()) writeFlowers(t);
    if (state.float && (ratio.get(contact) || 0) > 0 && !subOpen()) writeClouds(t);
  }

  let stepAcc = 0, lastT = 0;
  function writeFlowers(t) {
    // the click spring is a per-frame model on the desktop: integrate it in fixed 60Hz steps
    stepAcc += Math.min(0.25, Math.max(0, t - (lastT || t)));
    lastT = t;
    const sp = F.click.spring;
    while (stepAcc >= 1 / 60) {
      stepAcc -= 1 / 60;
      for (const f of flowers) { f.kickVel = f.kickVel * (1 - sp.damping) - f.kick * sp.stiffness; f.kick += f.kickVel; }
    }
    for (const f of flowers) {
      let tr;
      if (f.white) {
        const spin = f.spin0 + (t / WF.spinPeriod) * 360 + f.spinExtra.v;
        const br = 1 + WF.breathe * Math.sin((TAU * t) / WF.breathePeriod);
        tr = `rotate(${spin.toFixed(2)}deg) scale(${(br * f.squash.v).toFixed(4)})`;
      } else {
        const a = f.amp;
        let ang = a * Math.sin((TAU * t) / f.period + f.phase) + a * F.slowWaveAmp * Math.sin((TAU * t) / (f.period * F.slowWavePeriod) + f.slowPhase);
        ang += a * W.ampFactor * wind(f.xDesign || 0, t);
        ang += clamp(-F.click.maxDeg, F.click.maxDeg, f.kick);
        tr = `rotate(${ang.toFixed(3)}deg) scale(${f.squash.v.toFixed(4)})`;
      }
      f.im.style.transform = tr;
    }
  }
  function resetFlowers() { for (const f of flowers) f.im.style.transform = ''; }

  function writeClouds(t) {
    const s = contact ? sceneScale(contact) : 0.5;
    for (const c of clouds) {
      const e = c.e.v;
      const sm = e * e * (3 - 2 * e);
      let x = 0, y = 0, r = 0;
      if (c.centre) y += (1 - e) * C.enter.doorClouds.dist * s;
      else x += c.side * (1 - e) * c.en.dist * s;
      const a = (TAU * t) / c.period + c.phase;
      if (c.door) y += sm * C.doorFloat.y * s * Math.sin(a);
      else {
        x += sm * c.fx * s * Math.sin(a);
        y += sm * c.fy * s * Math.sin(a * 0.77 + 1.3);
        r = sm * C.float.rotate * Math.sin(a * 0.61 + 0.4);
      }
      c.wrap.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${r.toFixed(3)}deg)`;
      const op = clamp(0, 1, e / C.enter.fadeShare);
      c.wrap.style.opacity = op >= 1 ? '' : op.toFixed(3);
    }
  }

  function wantTicker() {
    if (!gsap) return false;
    if (subOpen() || document.hidden) return false;
    return (state.sway && (ratio.get(home) || 0) > 0) || (state.float && (ratio.get(contact) || 0) > 0);
  }
  function syncTicker() {
    const want = wantTicker();
    if (want && !state.running) {
      state.running = true;
      lastNow = 0; winSum = 0; winN = 0; winStart = 0; skip = 2; lastT = 0;
      if (nextGust === Infinity) nextGust = gsap.ticker.time + rnd(W.intervalMin, W.intervalMax);
      measureFlowers();
      gsap.ticker.add(tick);
    } else if (!want && state.running) {
      state.running = false;
      gsap.ticker.remove(tick);
    }
    // stream band / CSS animations follow the same visibility
    for (const s of scenes) s.node.classList.toggle('m77-off', !((ratio.get(s) || 0) > 0) || subOpen());
    for (const tw of streamTweens) (wantStream() ? tw.resume() : tw.pause());
  }

  function degrade(avg) {
    state.degraded = true;
    try { sessionStorage.setItem(LOWFX_KEY, String(Math.round(avg))); } catch { /* ignore */ }
    state.sway = false;
    state.particles = false;
    root.classList.add('m77-lowfx');
    resetFlowers();
    pollenLayer.replaceChildren();
    syncTicker();
    root.dispatchEvent(new CustomEvent('m77:fx-degraded', { detail: { avgFrame: avg } }));
  }

  /* ------------------------------------------------------------ letters: scatter / gather */
  const winds = S.winds;
  const wsum = winds.reduce((a, w) => a + w.weight, 0);
  const pickWind = () => { let r = Math.random() * wsum; for (const w of winds) { r -= w.weight; if (r <= 0) return w; } return winds[0]; };
  function scatterVectors(s) {
    const w = pickWind();
    const k = sceneScale(s);
    const imgs = s.lines.flatMap((L) => L.imgs);
    const n = imgs.length;
    return imgs.map((im, i) => {
      let ang;
      if (w.angle == null) ang = Math.random() * 360;
      else ang = w.angle + rnd(-S.angleSpread, S.angleSpread);
      // never blow letters downward (into the next scene)
      const down = 90;
      let d = ((ang - down + 540) % 360) - 180;
      if (Math.abs(d) < S.noDownCone) ang = down + Math.sign(d || 1) * S.noDownCone;
      const dist = rnd(S.distMin, S.distMax) * k;
      const order = w.angle == null ? Math.random() : i / Math.max(1, n - 1);
      const lead = Math.cos((w.angle ?? 0) * Math.PI / 180) >= 0 ? 1 - order : order; // letters on the downwind side go first
      return {
        im,
        x: Math.cos((ang * Math.PI) / 180) * dist,
        y: Math.sin((ang * Math.PI) / 180) * dist,
        rotation: (Math.random() < 0.5 ? -1 : 1) * rnd(S.rotateMin, S.rotateMax),
        delay: (S.delayTrend * lead + (1 - S.delayTrend) * Math.random()) * S.delayMax,
      };
    });
  }
  const letterState = new Map(scenes.map((s) => [s, 'shown']));
  function scatter(s) {
    if (!state.scatter || !s.typed || letterState.get(s) !== 'shown') return;
    letterState.set(s, 'gone');
    for (const v of scatterVectors(s)) {
      gsap.killTweensOf(v.im);
      gsap.to(v.im, { x: v.x, y: v.y, rotation: v.rotation, scale: S.scaleTo, opacity: 0, duration: S.flight, delay: v.delay * 0.6, ease: S.ease });
    }
  }
  function gather(s) {
    if (letterState.get(s) !== 'gone') return;
    letterState.set(s, 'shown');
    const rs = cfg.text.typing.repeatSpeed || 2;
    for (const v of scatterVectors(s)) {
      gsap.killTweensOf(v.im);
      gsap.fromTo(v.im, { x: v.x * 0.6, y: v.y * 0.6, rotation: v.rotation * 0.6, scale: S.scaleTo, opacity: 0 },
        { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: (S.flight * 1.6) / rs * 1.4, delay: (v.delay / rs), ease: 'power2.out', clearProps: 'transform,opacity' });
    }
  }

  /* ------------------------------------------------------------ visibility */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const s = byNode.get(e.target);
      if (!s) continue;
      // a scene that only touches the viewport edge reports isIntersecting with a ~0 ratio: count it as gone
      const r = e.isIntersecting && e.intersectionRatio >= 0.02 ? e.intersectionRatio : 0;
      const prev = ratio.get(s) || 0;
      ratio.set(s, r);
      if (r < 0.3 && prev >= 0.3) scatter(s);
      if (r >= 0.6) gather(s);
      // reduced motion: no snap glide feel / letter flight — a scene that arrives just fades in
      if (still) {
        if (r < 0.05) s.fxLow = true;
        else if (r >= 0.6 && s.fxLow) { s.fxLow = false; s.box.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease-out' }); }
      }
      if (s === contact) {
        if (r === 0) contactReset();
        else if (r >= 0.35) contactEnter();
      }
    }
    syncTicker();
  }, { root: scroller, threshold: [0, 0.02, 0.3, 0.35, 0.6, 1] });
  scenes.forEach((s) => io.observe(s.node));
  cleanups.push(() => io.disconnect());
  on(document, 'visibilitychange', syncTicker);
  if (state.float) {
    // clouds start "out" unless contact is already on screen
    const r0 = contact?.node.getBoundingClientRect();
    if (r0 && (r0.bottom <= 0 || r0.top >= innerHeight)) contactReset();
  }

  /* ------------------------------------------------------------ stream band (about) */
  const streamTweens = [];
  const about = scenes.find((s) => s.spec.id === 'about');
  const wantStream = () => !still && (ratio.get(about) || 0) > 0 && !subOpen() && !document.hidden;
  function buildStream() {
    const m = manifest?.masks?.about;
    if (!about || !m || about.stream) return;
    const layer = el('div', { class: 'm77-stream', 'aria-hidden': 'true' });
    const css = el('style', { 'data-m77': 'fx-stream' });
    css.textContent = `.m77-stream{-webkit-mask-image:url(${m.tall.url});mask-image:url(${m.tall.url})}@media (min-aspect-ratio: 3/5){.m77-stream{-webkit-mask-image:url(${m.wide.url});mask-image:url(${m.wide.url})}}`;
    document.head.append(css);
    cleanups.push(() => css.remove());
    const st = cfg.shaders.stream;
    // direction [-0.25, 1]: mostly downhill, drifting left
    const ang = (Math.atan2(st.direction[0], st.direction[1]) * 180) / Math.PI;
    // two bands of soft highlights at different scales / speeds, like the shader's light + glint
    const bands = [
      { p: 150, speed: st.lightSpeed * 0.28, img: 'repeating-linear-gradient(180deg, rgba(255,255,245,0) 0px, rgba(255,255,245,0) 54px, rgba(255,255,240,.30) 74px, rgba(255,255,245,.06) 92px, rgba(255,255,245,0) 112px, rgba(255,255,245,0) 150px)', op: 0.9 },
      { p: 64, speed: st.glintSpeed * 0.32, img: 'repeating-linear-gradient(180deg, rgba(255,255,250,0) 0px, rgba(255,255,250,0) 40px, rgba(255,255,250,.32) 46px, rgba(255,255,250,0) 52px, rgba(255,255,250,0) 64px)', op: 0.55 },
    ];
    for (const b of bands) {
      const wrap = el('div', { class: 'm77-band', '--ang': `${(-ang).toFixed(1)}deg` });
      const i = el('i', { '--p': `${b.p}px`, style: { backgroundImage: b.img, opacity: String(b.op) } });
      wrap.append(i);
      layer.append(wrap);
      if (!still && gsap) {
        const tw = gsap.fromTo(i, { y: 0 }, { y: b.p, duration: b.p / b.speed, ease: 'none', repeat: -1, paused: true });
        streamTweens.push(tw);
      }
    }
    about.node.querySelector('.m77-shade')?.before(layer);
    about.stream = layer;
    requestAnimationFrame(() => layer.classList.add('is-on'));
    syncTicker();
  }
  if (about && !still) {
    const origLoad = about.load;
    about.load = () => { origLoad(); buildStream(); };
    if (about.isLoaded?.()) buildStream();
  }

  /* ------------------------------------------------------------ touch glow */
  const pool = [];
  let poolI = 0;
  for (let i = 0; i < 4; i++) {
    const g = el('span', { class: 'm77-touch', 'aria-hidden': 'true' });
    g.style.background = blob.gradient;
    root.append(g);
    pool.push(g);
  }
  function glow(x, y) {
    const g = pool[poolI++ % pool.length];
    g.getAnimations?.().forEach((a) => a.cancel());
    const at = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    const kf = still
      ? [{ opacity: 0.85, transform: `${at} scale(1)` }, { opacity: 0, transform: `${at} scale(1)` }]
      : [{ opacity: 1, transform: `${at} scale(.5)` }, { opacity: 0.85, transform: `${at} scale(1.05)`, offset: 0.3 }, { opacity: 0, transform: `${at} scale(1.35)` }];
    g.style.transform = at;
    if (g.animate) g.animate(kf, { duration: 400, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
    state.touches++;
  }
  on(root, 'pointerdown', (e) => { if (e.isPrimary !== false) glow(e.clientX, e.clientY); }, { passive: true, capture: true });

  /* ------------------------------------------------------------ pollen + ripple */
  const pollenLayer = el('div', { class: 'm77-pollen', 'aria-hidden': 'true' });
  root.append(pollenLayer);
  function pollen(x, y) {
    if (!state.particles) return;
    const n = Math.round(rnd(state.pollenCount[0], state.pollenCount[1]));
    const k = 0.75;
    for (let i = 0; i < n; i++) {
      const d = el('i');
      const sz = rndA(P.size) * 1.5; // finger-scale: a little larger than the desktop's cursor pollen
      const col = P.colors[i % P.colors.length];
      Object.assign(d.style, { width: `${sz.toFixed(1)}px`, height: `${sz.toFixed(1)}px`, background: `radial-gradient(circle closest-side, ${col}, rgba(255,250,230,0) 100%)` });
      pollenLayer.append(d);
      const a = Math.random() * TAU;
      const dist = rndA(P.dist) * k;
      const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist * 0.8;
      const tl = gsap.timeline({ onComplete: () => d.remove() });
      tl.set(d, { x: x - sz / 2, y: y - sz / 2, opacity: 1, scale: 1 });
      tl.to(d, { x: x - sz / 2 + dx, duration: P.duration, ease: 'power2.out' }, 0);
      tl.to(d, { y: y - sz / 2 + dy - P.rise * k, duration: P.duration * 0.4, ease: 'power2.out' }, 0);
      tl.to(d, { y: y - sz / 2 + dy - P.rise * k + P.fall * k, duration: P.duration * 0.6, ease: 'power1.in' }, P.duration * 0.4);
      tl.to(d, { opacity: 0, scale: 0.6, duration: P.duration * 0.55, ease: 'power1.in' }, P.duration * 0.45);
    }
    state.lastPollen = n;
  }
  function ripple(x, y) {
    if (!state.sway || !flowers.length) return;
    const k = sceneScale(home);
    const cl = F.click;
    const sq = Math.sqrt(cl.spring.stiffness);
    let hits = 0;
    for (const f of flowers) {
      const r = f.wrap.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      const dDesign = Math.hypot(cx - x, cy - y) / k;
      const sign = Math.sign(cx - x) || 1;
      if (inside) {
        const c = cl.deg[0] + (cl.deg[1] - cl.deg[0]) * Math.min(1, Math.hypot(cx - x, cy - y) / (Math.max(r.width, r.height) / 2));
        if (f.white) gsap.to(f.spinExtra, { v: `+=${360 * Math.round(rnd(WF.clickTurns[0], WF.clickTurns[1]))}`, duration: WF.clickDuration, ease: 'power2.out' });
        else f.kickVel += sign * c * sq * 1.45;
        gsap.timeline().to(f.squash, { v: cl.squash, duration: cl.squashIn, ease: 'power2.out' }).to(f.squash, { v: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        hits++;
      } else if (dDesign < cl.ripple.radius && !f.white) {
        const amp = sign * cl.deg[1] * cl.ripple.amp * (1 - dDesign / cl.ripple.radius) * sq * 1.45;
        gsap.delayedCall((dDesign / 100) * cl.ripple.delayPer100, () => { f.kickVel += amp; });
        hits++;
      }
    }
    state.lastRipple = hits;
  }
  on(scroller, 'click', (e) => {
    if (!gsap || still) return;
    if (e.target.closest?.('a,button,[role=button]')) return;
    const s = byNode.get(e.target.closest?.('.m77-scene'));
    if (!s) return;
    pollen(e.clientX, e.clientY);
    if (s === home) ripple(e.clientX, e.clientY);
  });

  /* ------------------------------------------------------------ long press = tap */
  let lp = null;
  const LP_MS = 450;
  const LP_MOVE = 10;
  const clearLp = () => { if (lp) clearTimeout(lp.timer); lp = null; };
  on(root, 'pointerdown', (e) => {
    clearLp();
    if (e.pointerType === 'mouse') return;
    const t = e.target.closest?.('a[href],button');
    if (!t || !root.contains(t)) return;
    lp = { t, x: e.clientX, y: e.clientY, armed: false, menu: false };
    lp.timer = setTimeout(() => { if (lp) lp.armed = true; }, LP_MS);
  }, { capture: true, passive: true });
  on(root, 'pointermove', (e) => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > LP_MOVE) clearLp(); }, { capture: true, passive: true });
  let suppress = null;
  const fire = (t) => { suppress = { t, until: performance.now() + 450 }; t.click(); suppress.fired = true; };
  on(root, 'pointerup', () => { if (lp?.armed) { const t = lp.t; clearLp(); fire(t); } else clearLp(); }, { capture: true });
  on(root, 'pointercancel', () => { if (lp?.armed && lp.menu) { const t = lp.t; clearLp(); fire(t); } else clearLp(); }, { capture: true });
  on(root, 'contextmenu', (e) => { e.preventDefault(); if (lp) lp.menu = true; });
  // the browser may still deliver its own click after a long press: swallow that one
  on(root, 'click', (e) => {
    if (!suppress || performance.now() > suppress.until) return;
    if (suppress.fired === true && e.isTrusted && (e.target === suppress.t || suppress.t.contains(e.target))) { e.stopImmediatePropagation(); e.preventDefault(); suppress = null; }
  }, { capture: true });

  on(window, 'resize', () => { measureFlowers(); });

  if (wasLow) degrade(0);
  else syncTicker();

  return {
    state,
    refresh: syncTicker,
    /** test hook: feed fake frame times into the watchdog */
    debugFrames(ms, n = 130) { skip = 0; for (let i = 0; i < n; i++) { winSum += ms; winN++; } winStart = performance.now() - 2001; lastNow = performance.now(); tick(gsap ? gsap.ticker.time : 0); },
    destroy() {
      gsap?.ticker.remove(tick);
      streamTweens.forEach((t) => t.kill());
      resetFlowers();
      clearLp();
      pool.forEach((g) => g.remove());
      pollenLayer.remove();
      about?.stream?.remove();
      cleanups.forEach((f) => f());
    },
  };
}
