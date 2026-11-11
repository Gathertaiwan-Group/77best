// Portrait layout tables for the mobile module (single source of truth).
// Imported by the browser app (/m/app.js) AND by tools/build-mobile-images.mjs.
//
// Units
//  - bg crops: source pixels of the 2912-wide desktop backgrounds.
//    `tall` is the phone crop (aspect 1:2), `wide` the tablet-portrait crop (3:4).
//  - lines: x / y are % of the scene's *content box* (safe area minus gutters,
//    max 720px wide, centred). y is the vertical centre of the line.
//    align: where x anchors the line box (left | center | right).
//    scale multiplies the scene's base scale `k` (content px per source px at a
//    390px-wide content box). Words keep their letters' original relative
//    coordinates; each word is straightened (baseline fitted from its letters)
//    and then turned by `rotate`. A line flows its words left→right, so a name
//    with 4, 5 or 6 letters (or more) lays out by itself; `maxW` (% of content
//    width) shrinks a line that would get too wide.
//  - `with`: doodles that ride along with a word at their original offset
//    (e.g. the flower over the name's "i", the smiley after "about").
//  - words are addressed by `${page}-${NN}` (the word index), never by text,
//    so renaming "Kiara" does not break the table.
//  - objects: decorative images. x / y / w in % of the *scene* (full bleed);
//    `anchor` = which corner x/y measure from (`top-center` centres horizontally,
//    x then shifts); maxW caps the CSS width (px).

export const BASE_WIDTH = 390; // reference content width for `k`
export const CONTENT_MAX = 720;

export const SCENES = [
  {
    id: 'home',
    page: 'main',
    typing: 'title',
    theme: '#1f3a1c',
    bg: {
      src: 'bg/bg_s1.webp',
      tall: { x: 1010, y: 0, w: 726, h: 1452 },
      wide: { x: 830, y: 0, w: 1089, h: 1452 },
      position: '50% 50%',
    },
    k: 0.25,
    lines: [
      { words: ['main-00'], x: 5, y: 9, align: 'left', rotate: -5, scale: 1 },
      { words: ['main-01'], x: 4, y: 25, align: 'left', rotate: 3, scale: 1 },
      { words: [{ id: 'main-02', with: ['main-03'] }], x: 96, y: 41, align: 'right', rotate: -4, scale: 1, maxW: 78 },
    ],
    objects: [
      { file: 'flowers/white_flower.webp', anchor: 'top-right', x: -6, y: 46, w: 24, maxW: 190, rotate: 8, sway: { amp: 2, period: 5.6 } },
      { file: 'flowers/yellow.webp', anchor: 'bottom-left', x: -6, y: 22, w: 30, maxW: 230, sway: { amp: 3.2, period: 4.3, origin: '55% 100%' } },
      { file: 'flowers/daisy_bottom.webp', anchor: 'bottom-left', x: 0, y: -3, w: 20, maxW: 150, sway: { amp: 2, period: 7.2, origin: '0% 70%' } },
      { file: 'flowers/peony_bottom.webp', anchor: 'bottom-right', x: 0, y: -2, w: 22, maxW: 170, sway: { amp: 2, period: 6.4, origin: '100% 60%' } },
      { file: 'flowers/rose.webp', anchor: 'bottom-right', x: 12, y: -6, w: 32, maxW: 250, sway: { amp: 2.4, period: 4.9, origin: '50% 100%' } },
    ],
    hint: true,
  },
  {
    id: 'about',
    page: 'about',
    typing: 'small',
    theme: '#26381f',
    bg: {
      src: 'bg/bg_s2.webp',
      // Phase 3: the desktop stream shader's mask, cropped like the background and
      // turned into an alpha mask for the CSS light band (fx.js)
      mask: 'bg/stream_mask.webp',
      tall: { x: 930, y: 0, w: 906, h: 1812 },
      wide: { x: 600, y: 0, w: 1359, h: 1812 },
      position: '50% 50%',
    },
    k: 0.62,
    lines: [
      { words: [{ id: 'about-00', with: ['about-01'] }], x: 50, y: 17, align: 'center', rotate: -6, scale: 1.25 },
      { words: [{ id: 'about-02', turn: 60 }, 'about-03', 'about-04'], x: 10, y: 37, align: 'left', rotate: -3, scale: 1 },
      { words: ['about-05', 'about-06', 'about-07'], x: 92, y: 47, align: 'right', rotate: 2, scale: 1 },
      { words: ['about-08', 'about-09', { id: 'about-10', with: ['about-11'] }], x: 50, y: 58, align: 'center', rotate: -2, scale: 1, maxW: 92 },
    ],
    objects: [],
  },
  {
    id: 'work',
    page: 'work',
    typing: 'small',
    theme: '#4c6a45',
    bg: {
      // bg_s3 with the curtain tail stacked under it (see build-mobile-images)
      src: 'bg/bg_s3.webp',
      stackTail: 'bg/curtain_tail.webp',
      tall: { x: 1580, y: 0, w: 860, h: 1720 },
      wide: { x: 1150, y: 0, w: 1290, h: 1720 },
      position: '50% 50%',
    },
    k: 0.62,
    lines: [
      { words: [{ id: 'work-01', with: ['work-00'] }], x: 50, y: 22, align: 'center', rotate: -4, scale: 1.2 },
      { words: ['work-02', 'work-03', 'work-04'], x: 94, y: 56, align: 'right', rotate: -3, scale: 0.92 },
      { words: ['work-05', 'work-06'], x: 92, y: 70, align: 'right', rotate: 2, scale: 1 },
    ],
    objects: [],
  },
  {
    id: 'contact',
    page: 'contact',
    typing: 'small',
    theme: '#3f5a37',
    bg: {
      src: 'bg/contact_base.webp',
      tall: { x: 1050, y: 0, w: 816, h: 1632 },
      wide: { x: 740, y: 0, w: 1224, h: 1632 },
      position: '50% 50%',
    },
    k: 0.66,
    lines: [
      { words: ['contact-00', 'contact-01'], x: 6, y: 10, align: 'left', rotate: -3, scale: 1 },
      { words: ['contact-02', { id: 'contact-03', with: ['contact-04'], straight: false }], x: 92, y: 24, align: 'right', rotate: 2, scale: 1.15 },
      { words: ['contact-06'], x: 50, y: 70, align: 'center', rotate: -2, scale: 1 },
      { words: ['contact-07'], x: 50, y: 79, align: 'center', rotate: 0, scale: 1 },
      { words: ['contact-05'], x: 50, y: 88, align: 'center', rotate: 2, scale: 1 },
    ],
    objects: [
      { file: 'elements/cloud1.webp', anchor: 'top-right', x: -36, y: -7, w: 92, maxW: 620, back: true, float: true, filter: 'brightness(0.86) contrast(1.3) saturate(0.84)' },
      { file: 'elements/cloud2.webp', anchor: 'top-right', x: -30, y: -1, w: 60, maxW: 460, float: true, filter: 'brightness(0.79) contrast(1.8) saturate(0.65)' },
      { file: 'elements/exit-door.webp', anchor: 'top-center', x: 0, y: 35, w: 24, maxW: 170, doorFloat: true },
      { file: 'elements/cloud2.webp', anchor: 'top-center', x: 0, y: 51, w: 64, maxW: 460, float: true, filter: 'brightness(0.78) contrast(1.9) saturate(0.64)' },
      { file: 'elements/cloud1.webp', anchor: 'bottom-left', x: -34, y: -6, w: 90, maxW: 600, back: true, float: true, filter: 'brightness(0.86) contrast(1.3) saturate(0.84)' },
    ],
  },
];

/** Output name of a scene background (no extension). */
export const bgName = (scene, variant, width) => `${scene.id}-${variant}-${width}`;
export const BG_WIDTHS = { tall: [780, 1170], wide: [1170] };
/** Effect masks are soft (blurred): a small file is enough. */
export const MASK_WIDTHS = { tall: 300, wide: 450 };

/** Output name of an object image, sized for its largest CSS width × 2. */
export const objName = (file, width) => `${file.replace(/^.*\//, '').replace(/\.\w+$/, '')}-${width}`;
export const objWidth = (o, origW) => Math.min(origW, Math.ceil(o.maxW * 2));

/* ------------------------------------------------------------------ sub pages
 * Phase 2: the overview pages (#/about, #/work) and the detail pages
 * (#/work/<id>, #/about/<id>). Routes, parents, objects, easel canvases and
 * links come from data.json (`subpages`); this table only holds the portrait
 * arrangement.
 *
 *  - bg: portrait crops of the desktop sub-page backgrounds (source px), built
 *    like the scene backgrounds into /m/img/sub-{name}-{tall|wide}-{w}.webp.
 *  - objects: desktop element images used by sub pages → largest CSS width (px);
 *    the builder writes them at ×2.
 *  - pieces: crops of the desktop hand-written composites (text.png, the hot
 *    labels). `src` = 'static' (the page's text.png) or a hot id; `words` (ids
 *    from tools/sub-letters.json) limits the crop to those words' bounding box.
 *    maxW = largest CSS width (px) the piece is shown at (output = ×2).
 *  - pages: `text` = the words of the hand-written pieces (read out instead of the images).
 *    blocks in reading order. w = % of the content column, x = inset (%)
 *    from the aligned side, mt = margin-top (px at 390 wide, scales with width),
 *    rotate in deg. `hot` makes the piece the page's link (data `link` / `route`).
 */
export const SUB = {
  bg: {
    curtain: { src: 'bg/curtain.webp', tall: { x: 1000, y: 0, w: 816, h: 1632 }, wide: { x: 800, y: 0, w: 1224, h: 1632 } },
    meadow: { src: 'bg/meadow.webp', tall: { x: 260, y: 0, w: 816, h: 1632 }, wide: { x: 120, y: 0, w: 1224, h: 1632 } },
  },
  objects: {
    'elements/easel-portrait.webp': 520,
    'elements/easel-landscape.webp': 720,
    'elements/teapot.webp': 280,
    'elements/mailbox.webp': 220,
    'elements/candle.webp': 100,
    'elements/balloon.webp': 180,
    'elements/music-box-2.webp': 225,
    'elements/lantern.webp': 150,
    'elements/gramophone.webp': 170,
    'elements/kite2.webp': 150,
    'elements/cloud2.webp': 460,
  },
  pieces: {
    // work overview labels (whole hot composites)
    'work-hackathon': { page: 'work', src: 'hackathon', maxW: 295 },
    'work-huhuu': { page: 'work', src: 'huhuu', maxW: 170 },
    'work-bedazzling': { page: 'work', src: 'bedazzling', maxW: 280 },
    'work-mist-story': { page: 'work', src: 'mist-story', maxW: 255 },
    'work-dream-gallery': { page: 'work', src: 'dream-gallery', maxW: 225 },
    // about overview
    'about-from': { page: 'about', src: 'static', words: ['w0'], maxW: 110 },
    'about-to': { page: 'about', src: 'static', words: ['w2'], maxW: 70 },
    'about-chongqing': { page: 'about', src: 'chongqing', maxW: 400 },
    'about-new-york': { page: 'about', src: 'new-york', maxW: 330 },
    // portrait video pages
    'hackathon-title': { page: 'hackathon', src: 'static', maxW: 560 },
    'hackathon-credits': { page: 'hackathon', src: 'credits', maxW: 330 },
    'huhuu-text': { page: 'huhuu', src: 'static', maxW: 440 },
    'huhuu-try': { page: 'huhuu', src: 'try-it', maxW: 230 },
    'bedazzling-text': { page: 'bedazzling', src: 'static', maxW: 420 },
    'bedazzling-try': { page: 'bedazzling', src: 'try-it', maxW: 260 },
    'mist-story-text': { page: 'mist-story', src: 'static', maxW: 420 },
    'mist-story-try': { page: 'mist-story', src: 'try-it', maxW: 260 },
    'dream-title': { page: 'dream-gallery', src: 'static', words: ['w0', 'w1'], maxW: 300 },
    'dream-soon': { page: 'dream-gallery', src: 'static', words: ['w2', 'w3'], maxW: 260 },
    'dream-join': { page: 'dream-gallery', src: 'join-event', maxW: 200 },
    // landscape video pages
    'cq-title': { page: 'chongqing', src: 'static', words: ['w0'], maxW: 330 },
    'cq-1': { page: 'chongqing', src: 'static', words: ['w1', 'w2', 'w3', 'w4'], maxW: 290 },
    'cq-2': { page: 'chongqing', src: 'static', words: ['w5', 'w6'], maxW: 230 },
    'cq-3': { page: 'chongqing', src: 'static', words: ['w7', 'w8', 'w9'], maxW: 420 },
    'ny-and': { page: 'new-york', src: 'static', words: ['w0'], maxW: 110 },
    'ny-1': { page: 'new-york', src: 'static', words: ['w1', 'w2', 'w3', 'w4'], maxW: 380 },
    'ny-2': { page: 'new-york', src: 'static', words: ['w5', 'w6'], maxW: 170 },
    'ny-3': { page: 'new-york', src: 'static', words: ['w9', 'w10'], maxW: 100 },
    'ny-4': { page: 'new-york', src: 'static', words: ['w7', 'w8', 'w11'], maxW: 380 },
  },
  pages: {
    about: { kind: 'about', bg: 'meadow' },
    work: { kind: 'work', bg: 'curtain' },
    hackathon: {
      kind: 'video', bg: 'curtain', easel: 'portrait',
      text: 'Hackathon winner.', // what the hand-written pieces say (screen readers)
      blocks: [
        { piece: 'hackathon-title', w: 90, align: 'center', mt: 14, rotate: -2 },
        { piece: 'hackathon-credits', hot: 'credits', w: 60, align: 'center', mt: 14, rotate: 1 },
      ],
    },
    huhuu: {
      kind: 'video', bg: 'curtain', easel: 'portrait',
      text: 'App: HuHuu. Bedtime audio based on your mood.', // what the hand-written pieces say (screen readers)
      blocks: [
        { piece: 'huhuu-text', w: 68, align: 'left', x: 8, mt: 14, rotate: -2 },
        { piece: 'huhuu-try', hot: 'try-it', w: 44, align: 'right', x: 10, mt: -6, rotate: 2 },
      ],
    },
    bedazzling: {
      kind: 'video', bg: 'curtain', easel: 'portrait',
      text: 'Bedazzling: bedazzle anything you like.', // what the hand-written pieces say (screen readers)
      blocks: [
        { piece: 'bedazzling-text', w: 74, align: 'left', x: 6, mt: 14, rotate: -2 },
        { piece: 'bedazzling-try', hot: 'try-it', w: 54, align: 'right', x: 6, mt: 16, rotate: 2 },
      ],
    },
    'mist-story': {
      kind: 'video', bg: 'curtain', easel: 'portrait',
      text: 'Mist-story: draw on your mist canvas.', // what the hand-written pieces say (screen readers)
      blocks: [
        { piece: 'mist-story-text', w: 74, align: 'left', x: 6, mt: 14, rotate: -2 },
        { piece: 'mist-story-try', hot: 'try-it', w: 54, align: 'right', x: 6, mt: 16, rotate: 2 },
      ],
    },
    'dream-gallery': {
      kind: 'video', bg: 'curtain', easel: 'portrait', onCanvas: { piece: 'dream-soon', w: 62 },
      text: 'Dream gallery. Coming soon…', // what the hand-written pieces say (screen readers)
      blocks: [
        { piece: 'dream-title', w: 50, align: 'left', x: 6, mt: 10, rotate: -3 },
        { piece: 'dream-join', hot: 'join-event', w: 34, align: 'right', x: 4, mt: -96, rotate: 3 },
      ],
    },
    chongqing: {
      kind: 'video', bg: 'meadow', easel: 'landscape',
      text: 'Chongqing is where she found her love for documenting.', // what the hand-written pieces say (screen readers)
      // pieces / objects laid over the easel box (% of the easel image)
      over: [
        { piece: 'cq-title', top: 2.5, right: 0, w: 44, rotate: -3 },
        { object: 'elements/gramophone.webp', bottom: 1, right: -1, w: 23, sway: { amp: 1.5, period: 6.5, origin: '50% 100%' }, ground: true },
      ],
      blocks: [
        { piece: 'cq-1', w: 60, align: 'left', x: 6, mt: 6, rotate: -4 },
        { piece: 'cq-2', w: 44, align: 'right', x: 8, mt: 6, rotate: 3 },
        { piece: 'cq-3', w: 80, align: 'center', mt: 14, rotate: -3 },
      ],
    },
    'new-york': {
      kind: 'video', bg: 'meadow', easel: 'landscape',
      text: 'And she realized who she wants to be in New York…', // what the hand-written pieces say (screen readers)
      over: [
        { object: 'elements/kite2.webp', top: 2, right: 3, w: 19, rotate: 92.2, flip: true, float: true },
      ],
      blocks: [
        { piece: 'ny-and', w: 15, align: 'left', x: 8, mt: 4, rotate: -2 },
        { piece: 'ny-1', w: 76, align: 'left', x: 4, mt: 6, rotate: 4 },
        { piece: 'ny-2', w: 34, align: 'right', x: 14, mt: 10, rotate: -2 },
        { piece: 'ny-3', w: 18, align: 'right', x: 34, mt: 4, rotate: 0 },
        { piece: 'ny-4', w: 74, align: 'center', mt: 4, rotate: -3 },
      ],
    },
  },
};
export const subBgName = (name, variant, width) => `sub-${name}-${variant}-${width}`;
export const pieceName = (id, width) => `p-${id}-${width}`;
