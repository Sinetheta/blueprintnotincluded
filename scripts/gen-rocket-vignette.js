#!/usr/bin/env node
// Generates frontend/src/assets/images/rocket-interior/vignette.png: the black
// oval fade drawn around a rocket interior (lib/src/drawing/rocket-backdrop.ts).
//
// The game has no such asset; its screenshots show a soft black oval. This
// writes a square RGBA image that is fully transparent inside a central
// ellipse, ramps to opaque black at the image's edge, and is black in the
// corners — so a renderer can stretch it to the oval it wants and fill plain
// black outside it with no visible seam. Only the *curve* is baked in here;
// the oval's size and position per module are code (ROCKET_BACKDROP.vignette).
//
//   node scripts/gen-rocket-vignette.js
//
// Needs sharp (a root dependency), so run it inside the app container.
'use strict';

const path = require('path');
const sharp = require('sharp');

const SIZE = 1024;
// Normalised radius (1 = the inscribed ellipse's edge) inside which the
// vignette is fully clear.
const CLEAR_RADIUS = 0.55;
// Alpha reaches 1 at this normalised radius; the ring between here and the
// edge is solid black, which is what keeps the edge seamless with the bands.
const OPAQUE_RADIUS = 0.98;

function smoothstep(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

const pixels = Buffer.alloc(SIZE * SIZE * 4);
const half = SIZE / 2;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const nx = (x + 0.5 - half) / half;
    const ny = (y + 0.5 - half) / half;
    const r = Math.sqrt(nx * nx + ny * ny);
    const t = (r - CLEAR_RADIUS) / (OPAQUE_RADIUS - CLEAR_RADIUS);
    const alpha = Math.round(255 * smoothstep(t));
    const offset = (y * SIZE + x) * 4;
    pixels[offset] = 0;
    pixels[offset + 1] = 0;
    pixels[offset + 2] = 0;
    pixels[offset + 3] = alpha;
  }
}

const target = path.resolve(
  __dirname,
  '../frontend/src/assets/images/rocket-interior/vignette.png'
);
sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(target)
  .then(info => console.log(`wrote ${path.relative(process.cwd(), target)} (${info.size} bytes)`));
