// walk with … — portrait mobile module, Phase 3: background music.
//
// Same behaviour and time curves as the desktop player (main bundle, grep `__wa`):
//   master volume config.music.volume (0.3); first start fades in over `fadeIn`,
//   toggle on / off over `toggleIn` / `toggleOut`, a playing video ducks the music
//   to 0 over `duckOut` and pauses it, the video pausing (or the sub page closing)
//   restores it over `restore`, a hidden tab fades out over `hiddenFade` and comes
//   back over `toggleIn`; two <audio> elements cross-fade (sine.inOut) for
//   `loopCrossfade` seconds at the end of the track. All ramps are linear like the
//   desktop's `ease:"none"` tween.
//
// Mobile differences (docs/mobile-plan.md §3.4):
//   - off by default: it only starts when the visitor turns it on (or has turned it
//     on before: localStorage `config.music.storageKey`, shared with the desktop),
//     and nothing is fetched before that (zero audio requests until then)
//   - volume goes through Web Audio (MediaElementSource → GainNode), because iOS
//     ignores HTMLMediaElement.volume. The AudioContext is created and resumed
//     synchronously inside the toggle's gesture. Ramps are scheduled on the audio
//     clock (AudioParam automation), so they also complete in a background tab.
//     Without an AudioContext it falls back to .volume (timer-driven).
//   - a 64kbps AAC copy (/m/audio/bgm.m4a, ~1.4MB); mp3 fallback = the desktop file.

// desktop toggle art (main bundle: the `music` / `on` / `off` hand-written words, source px)
const ART = {
  height: 212,
  music: [{ file: 'music-0.png', x: 3, w: 143 }, { file: 'music-1.png', x: 171, w: 81 }, { file: 'music-2.png', x: 277, w: 80 }, { file: 'music-3.png', x: 382, w: 33 }, { file: 'music-4.png', x: 439, w: 91 }],
  on: [{ file: 'on-0.png', x: 709, w: 95 }, { file: 'on-1.png', x: 827, w: 113 }],
  off: [{ file: 'off-0.png', x: 709, w: 95 }, { file: 'off-1.png', x: 827, w: 81 }, { file: 'off-2.png', x: 932, w: 81 }],
  width: { on: 943, off: 1016 },
};
const H = 22; // CSS px height of the words on a phone (desktop: 26)

export const MUSIC_CSS = `
.m77-music{position:absolute;z-index:9;top:calc(env(safe-area-inset-top,0px) + 4px);right:max(4px,env(safe-area-inset-right,0px));width:calc(var(--mw) + 28px);height:48px;padding:0;margin:0;border:0;background:none;cursor:pointer;touch-action:manipulation;outline:none;opacity:0;transition:opacity .5s ease;-webkit-tap-highlight-color:transparent}
.m77-music.is-ready{opacity:1}
.m77-music::after{content:"";position:absolute;inset:4px 2px;border-radius:50%;background:radial-gradient(closest-side,rgba(28,48,30,.32) 20%,rgba(28,48,30,0) 100%);pointer-events:none;z-index:-1}
.m77-mwords{position:absolute;left:14px;top:calc(50% - ${H / 2}px);width:var(--mw);height:${H}px;filter:drop-shadow(0 0 3px rgba(25,45,35,.55));transition:transform .2s ease-out}
.m77-mword{position:absolute;inset:0}
.m77-mword img{position:absolute;top:0;height:${H}px;max-width:none;pointer-events:none}
.m77-mword.is-on,.m77-mword.is-off{opacity:0;transition:opacity .2s ease}
.m77-mword.is-shown{opacity:1}
.m77-music:active .m77-mwords{transform:scale(1.08)}
.m77-music:focus-visible .m77-mwords{filter:drop-shadow(0 0 3px rgba(25,45,35,.55)) drop-shadow(0 0 6px rgba(255,247,205,.95))}
.m77-music:focus-visible::after{background:radial-gradient(closest-side,rgba(255,247,205,.35) 20%,rgba(255,247,205,0) 100%)}
.m77-subopen .m77-music::after{background:radial-gradient(closest-side,rgba(60,35,30,.4) 20%,rgba(60,35,30,0) 100%)}
`;

export function createMusic(ctx) {
  const { root, data, el, on, rel } = ctx;
  const X = data.config.music;
  const store = {
    get: () => { try { return localStorage.getItem(X.storageKey); } catch { return null; } },
    set: (v) => { try { localStorage.setItem(X.storageKey, v); } catch { /* private mode */ } },
  };

  const st = {
    pref: store.get() === 'on', // mobile: off unless the visitor turned it on
    started: false, // playback has been started by a gesture at least once (desktop `av`)
    everStarted: false,
    hidden: document.hidden,
    ducks: new Map(),
    cur: 0,
    xfading: false,
    mode: null, // 'webaudio' | 'volume'
  };
  const els = [];
  let ac = null, acFailed = false, master = null;
  const xg = [null, null];
  const lv = [1, 0];
  const model = { from: 0, to: 0, t0: 0, dur: 0 };
  let volTimer = 0, pauseTimer = 0, xfTimer = 0, xfVolTimer = 0;
  let src = null;
  const cleanups = [];

  const style = el('style', { 'data-m77': 'music' });
  style.textContent = MUSIC_CSS;
  document.head.append(style);
  cleanups.push(() => style.remove());

  /* ------------------------------------------------------------ toggle UI */
  const k = H / ART.height;
  const btn = el('button', { class: 'm77-music', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Music off (tap to turn on)', 'data-m77-music': '' });
  btn.style.setProperty('--mw', `${Math.ceil(Math.max(ART.width.on, ART.width.off) * k)}px`);
  const words = el('span', { class: 'm77-mwords', 'aria-hidden': 'true' });
  const imgs = [];
  const word = (name) => {
    const w = el('span', { class: `m77-mword is-${name}` });
    for (const l of ART[name]) {
      const im = el('img', { alt: '', decoding: 'async', draggable: 'false' });
      im.dataset.src = data.assets[`assets/ui/music/${l.file}`];
      Object.assign(im.style, { left: `${(l.x * k).toFixed(2)}px`, width: `${(l.w * k).toFixed(2)}px` });
      w.append(im);
      imgs.push(im);
    }
    return w;
  };
  const wOn = word('on'), wOff = word('off');
  words.append(word('music'), wOn, wOff);
  btn.append(words);
  root.append(btn);
  const ui = () => {
    const onNow = st.pref && st.started;
    wOn.classList.toggle('is-shown', onNow);
    wOff.classList.toggle('is-shown', !onNow);
    btn.setAttribute('aria-pressed', String(onNow));
    btn.setAttribute('aria-label', onNow ? 'Music on (tap to turn off)' : 'Music off (tap to turn on)');
  };
  ui();
  /** Show the toggle (its art is loaded only now, after the first screen). */
  function reveal() {
    for (const im of imgs) if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; }
    Promise.all(imgs.map((im) => im.decode().catch(() => null))).then(() => btn.classList.add('is-ready'));
  }

  /* ------------------------------------------------------------ audio graph */
  function ensureCtx() {
    if (ac || acFailed) return ac;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('no AudioContext');
      ac = new AC();
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* ignore */ }
      master = ac.createGain();
      master.gain.value = 0;
      master.connect(ac.destination);
      st.mode = 'webaudio';
    } catch {
      acFailed = true;
      ac = null;
      st.mode = 'volume';
    }
    return ac;
  }
  function resume() {
    if (ac && ac.state !== 'running' && ac.state !== 'closed') {
      try { ac.resume().catch(() => {}); } catch { /* ignore */ }
    }
  }
  const pickSrc = () => {
    if (src) return src;
    const probe = new Audio();
    src = probe.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? rel('audio/bgm.m4a') : X.src.mp3;
    return src;
  };
  function audio(i) {
    if (!els[i]) {
      const a = new Audio();
      a.preload = 'none';
      els[i] = a;
      on(a, 'timeupdate', () => checkLoop(i));
      on(a, 'ended', () => { if (i === st.cur && !st.xfading && want()) { a.currentTime = 0; a.play().catch(() => {}); } });
      if (ac) {
        try {
          const s = ac.createMediaElementSource(a);
          const g = ac.createGain();
          g.gain.value = lv[i];
          s.connect(g);
          g.connect(master);
          xg[i] = g;
          a.volume = 1;
        } catch { xg[i] = null; }
      } else a.volume = 0;
    }
    if (!els[i].getAttribute('src')) els[i].src = pickSrc();
    return els[i];
  }
  const clock = () => (ac ? ac.currentTime : performance.now() / 1000);
  const masterAt = (t) => (model.dur <= 0 ? model.to : model.from + (model.to - model.from) * Math.min(1, Math.max(0, (t - model.t0) / model.dur)));
  /** fallback (.volume) writes: element volume = master × cross-fade weight */
  const writeVolumes = () => {
    if (ac) return;
    const v = masterAt(clock());
    els.forEach((a, i) => { if (a) a.volume = Math.max(0, Math.min(1, v * lv[i])); });
  };

  /** Ramp the master volume to `target` linearly over `dur` seconds (desktop `xv`). */
  function ramp(target, dur, keepPlaying = false) {
    const now = clock();
    const from = masterAt(now);
    if (Math.abs(from - target) < 1e-4) dur = 0;
    Object.assign(model, { from, to: target, t0: now, dur });
    if (ac && master) {
      const g = master.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(from, now);
      if (dur > 0) g.linearRampToValueAtTime(target, now + dur);
      else g.setValueAtTime(target, now);
    } else {
      clearInterval(volTimer);
      writeVolumes();
      if (dur > 0) volTimer = setInterval(() => { writeVolumes(); if (clock() >= model.t0 + model.dur) clearInterval(volTimer); }, 16);
    }
    clearTimeout(pauseTimer);
    if (target === 0 && !keepPlaying) {
      pauseTimer = setTimeout(() => { if (model.to === 0) pauseAll(); }, dur * 1000 + 40);
    }
  }
  const playing = () => els.some((a) => a && !a.paused);
  function play() {
    const a = audio(st.cur);
    if (!ac) writeVolumes();
    const p = a.play();
    return p && p.then ? p.then(() => true, () => false) : Promise.resolve(true);
  }
  function pauseAll() {
    if (st.xfading) finishXfade();
    for (const a of els) if (a && !a.paused) a.pause();
  }
  const want = () => st.pref && st.started && !st.hidden && st.ducks.size === 0;
  /** Bring the volume to where it should be (desktop `xv`). */
  function apply(dur) {
    const target = want() ? X.volume : 0;
    if (target > 0 && !playing()) play();
    ramp(target, dur);
  }

  /* ------------------------------------------------------------ loop cross-fade */
  const N = 64;
  const sineUp = new Float32Array(N), sineDown = new Float32Array(N);
  for (let i = 0; i < N; i++) { const t = i / (N - 1); sineUp[i] = -(Math.cos(Math.PI * t) - 1) / 2; sineDown[i] = 1 - sineUp[i]; }
  function setX(i, v) {
    lv[i] = v;
    const g = xg[i];
    if (g) { g.gain.cancelScheduledValues(ac.currentTime); g.gain.setValueAtTime(v, ac.currentTime); }
  }
  function checkLoop(i) {
    const a = els[i];
    if (i !== st.cur || st.xfading || !a || a.paused || !a.duration || !isFinite(a.duration)) return;
    if (a.currentTime < a.duration - X.loopCrossfade) return;
    st.xfading = true;
    const from = st.cur, to = 1 - st.cur;
    const b = audio(to);
    b.currentTime = 0;
    setX(to, 0);
    b.play().catch(() => {});
    const d = X.loopCrossfade;
    if (ac && xg[from] && xg[to]) {
      const now = ac.currentTime;
      for (const [g, curve] of [[xg[from], sineDown], [xg[to], sineUp]]) { g.gain.cancelScheduledValues(now); g.gain.setValueCurveAtTime(curve, now, d); }
    } else {
      const t0 = performance.now();
      clearInterval(xfVolTimer);
      xfVolTimer = setInterval(() => {
        const t = Math.min(1, (performance.now() - t0) / (d * 1000));
        const u = -(Math.cos(Math.PI * t) - 1) / 2;
        lv[from] = 1 - u; lv[to] = u;
        writeVolumes();
        if (t >= 1) clearInterval(xfVolTimer);
      }, 16);
    }
    xfTimer = setTimeout(finishXfade, d * 1000 + 30);
  }
  function finishXfade() {
    if (!st.xfading) return;
    clearTimeout(xfTimer);
    clearInterval(xfVolTimer);
    const from = st.cur, to = 1 - st.cur;
    const a = els[from];
    if (a) { a.pause(); a.currentTime = 0; }
    setX(from, 0);
    setX(to, 1);
    st.cur = to;
    st.xfading = false;
    writeVolumes();
  }

  /* ------------------------------------------------------------ gestures */
  function toggle() {
    ensureCtx();
    resume();
    const turnOn = !(st.pref && st.started);
    st.pref = turnOn;
    store.set(turnOn ? 'on' : 'off');
    if (!turnOn) { ui(); apply(X.toggleOut); return; }
    const first = !st.everStarted;
    if (st.ducks.size) { st.started = true; st.everStarted = true; ui(); return; }
    // the first start of the session uses the long fade-in, later ones the toggle fade
    if (first) ramp(0, 0, true); // start silent: the fade-in comes once play() resolves
    play().then((ok) => {
      if (!ok) { st.pref = false; ui(); return; }
      st.started = true;
      st.everStarted = true;
      ui();
      apply(first ? X.fadeIn : X.toggleIn);
    });
  }
  on(btn, 'click', toggle);

  // remembered "on": start on the first gesture anywhere (like the desktop), never before
  const gestureTypes = ['pointerdown', 'touchend', 'click', 'keydown'];
  function onGesture(e) {
    if (st.started || !st.pref) return;
    if (e.target?.closest?.('[data-m77-music]')) return; // the toggle handles itself
    if (e.type === 'pointerdown' && e.pointerType !== 'mouse') return; // iOS: audio unlock needs touchend/click
    ensureCtx();
    resume();
    if (e.target?.closest?.('.m77-vbtn')) { st.started = true; st.everStarted = true; ui(); return; } // the video takes over
    st.started = true; // claim it now so the follow-up click of this tap does not start twice
    ramp(0, 0, true);
    play().then((ok) => {
      if (!ok) { st.started = false; return; }
      st.everStarted = true;
      ui();
      apply(X.fadeIn);
    });
  }
  if (st.pref) for (const t of gestureTypes) on(window, t, onGesture, { capture: true, passive: true });

  /* ------------------------------------------------------------ duck / restore / visibility */
  on(window, 'm:video-play', (e) => {
    const id = e.detail?.id ?? 'video';
    st.ducks.set(id, e.detail?.video || null);
    if (masterAt(clock()) <= 0) { clearTimeout(pauseTimer); ramp(0, 0); pauseAll(); return; }
    ramp(0, X.duckOut);
  });
  const release = (id) => {
    if (!st.ducks.delete(id)) return;
    if (want()) apply(X.restore);
  };
  on(window, 'm:video-pause', (e) => release(e.detail?.id ?? 'video'));
  // leaving a sub page: any duck whose video is no longer playing is released
  on(window, 'hashchange', () => {
    for (const [id, v] of [...st.ducks]) if (!v || v.paused || !v.isConnected) release(id);
  });
  on(document, 'visibilitychange', () => {
    st.hidden = document.hidden;
    if (!st.hidden) resume();
    if (!st.started) return;
    apply(st.hidden ? X.hiddenFade : X.toggleIn);
  });

  return {
    button: btn,
    reveal,
    toggle,
    get state() {
      return {
        pref: st.pref, started: st.started, hidden: st.hidden, ducks: [...st.ducks.keys()], mode: st.mode,
        ctx: ac?.state ?? null, master: +masterAt(clock()).toFixed(4), playing: playing(), src: src, elements: els.length,
      };
    },
    destroy() {
      clearInterval(volTimer); clearTimeout(pauseTimer); clearTimeout(xfTimer); clearInterval(xfVolTimer);
      for (const a of els) if (a) { a.pause(); a.removeAttribute('src'); a.load(); }
      try { ac?.close(); } catch { /* ignore */ }
      btn.remove();
      cleanups.forEach((f) => f());
    },
  };
}
