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

/** Output name of an object image, sized for its largest CSS width × 2. */
export const objName = (file, width) => `${file.replace(/^.*\//, '').replace(/\.\w+$/, '')}-${width}`;
export const objWidth = (o, origW) => Math.min(origW, Math.ceil(o.maxW * 2));
