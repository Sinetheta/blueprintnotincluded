import {
  RocketInteriorModule,
  RocketInteriorPlacement,
  ROCKET_INTERIOR_DOOR_URL,
  rocketInteriorWorldBounds,
  rocketInteriorWorldDoor,
} from '../blueprint/rocket-interior';

// Everything about how a rocket interior *looks* that is not the building art
// itself: the landed backdrop (star field, moon), the vignette, and where the
// door's art hangs. Pure geometry, renderer-agnostic, because three renderers
// draw the same thing — the editor canvas, the client-side thumbnail/export
// snapshots, and the server-side preview worker.
//
// THIS IS THE TUNING SURFACE. Every number the eye might want changed lives in
// ROCKET_BACKDROP below; the two renderers only place sprites where
// rocketBackdropGeometry() tells them to. The in-game reference is the pair of
// screenshots in the handoff (a landed rocket, by day); the starting values
// were read off them by eye.
//
// Layering, back to front: star field -> moon -> vignette -> the hull
// (walls, windows, ports, station; door under the walls) -> the blueprint.
// The vignette sits *under* the hull and the blueprint on purpose: in the game
// it fades the whole scene, but here it must never hide something the author
// placed outside the hull.

export const ROCKET_INTERIOR_ASSET_DIR = 'assets/images/rocket-interior/';

export interface BackdropTextureSize {
  width: number;
  height: number;
}

export interface StarLayerConfig {
  url: string;
  texture: BackdropTextureSize;
  // How much larger than "just covers the viewport" the layer is drawn; the
  // slack is what parallax can move within.
  scale: number;
  // Fraction of the hull's on-screen displacement the layer follows. 0 pins it
  // to the viewport; the game uses 0.01 / 0.02 for its two moving layers.
  parallax: number;
  alpha: number;
}

export interface PerModule<T> {
  small: T;
  medium: T;
}

export const ROCKET_BACKDROP = {
  // The game's `stars_landed` day set, composited with normal alpha blending.
  // The base is opaque; the two overlays carry their shape in alpha.
  stars: [
    {
      url: ROCKET_INTERIOR_ASSET_DIR + 'space_day_00.png',
      texture: { width: 1024, height: 1024 },
      scale: 1,
      parallax: 0,
      alpha: 1,
    },
    {
      url: ROCKET_INTERIOR_ASSET_DIR + 'space_day_01.png',
      texture: { width: 1024, height: 1024 },
      scale: 1.25,
      parallax: 0.01,
      alpha: 1,
    },
    {
      url: ROCKET_INTERIOR_ASSET_DIR + 'space_day_02.png',
      texture: { width: 1024, height: 1024 },
      scale: 1.15,
      parallax: 0.02,
      alpha: 1,
    },
  ] as StarLayerConfig[],

  moon: {
    url: ROCKET_INTERIOR_ASSET_DIR + 'moon_landed.png',
    texture: { width: 1024, height: 512 },
    // Where the art is inside the PNG (the rest is transparent), and the
    // crest of the horizon within it — the one point of the art that is
    // placed deliberately. Measured from the file.
    art: { x: 0, y: 81, width: 750, height: 413 },
    horizon: { x: 350, y: 83 },
    // On-screen width of the art, in cells. The game draws the moon at a
    // fixed world size; read off the screenshots, it spans ~29 hull-cells of
    // the small interior and ~35 of the medium.
    widthInCells: { small: 29, medium: 35 } as PerModule<number>,
    // The crest sits this many cells above the hull's floor (the bottom edge
    // of its bottom row) ...
    crestAboveFloorCells: { small: 1.9, medium: 2.1 } as PerModule<number>,
    // ... and this many cells right of the hull's centre line (negative =
    // left).
    crestOffsetCells: { small: -1.4, medium: -0.8 } as PerModule<number>,
  },

  // Not a game asset: the game fades the scene to black in an oval whose size
  // differs between the two modules. The PNG (scripts/gen-rocket-vignette.js)
  // is clear in the middle and fully black at its edges; outside it, the
  // renderers fill plain black. The radii are the sprite's half-sizes.
  vignette: {
    url: ROCKET_INTERIOR_ASSET_DIR + 'vignette.png',
    texture: { width: 1024, height: 1024 },
    radiiCells: { small: { x: 12.5, y: 11.5 }, medium: { x: 15, y: 14 } } as PerModule<{
      x: number;
      y: number;
    }>,
    // Shift of the oval's centre from the hull's centre, in cells.
    centreOffsetCells: { small: { x: 0, y: 0 }, medium: { x: 0, y: 0 } } as PerModule<{
      x: number;
      y: number;
    }>,
    alpha: 1,
  },

  // The door's art is near-square and hangs out through the left wall: this
  // rectangle, in cells relative to the door cell's bottom-left corner, is
  // where the PNG is stretched. Drawn under the wall tiles so they overlap it.
  door: {
    url: ROCKET_INTERIOR_DOOR_URL,
    rect: { x: -0.55, y: 0, width: 2.1, height: 2.1 },
    alpha: 1,
  },
};

// Cells -> pixels, as BlueprintItem.drawPixi and the overlays do it. A cell
// (x, y) spans world points [x, x+1] x [y, y+1]; screen y runs down.
export interface BackdropCamera {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function worldPointToScreen(
  px: number,
  py: number,
  camera: BackdropCamera
): { x: number; y: number } {
  return {
    x: (px + camera.offsetX) * camera.zoom,
    y: (camera.offsetY + 1 - py) * camera.zoom,
  };
}

// A rectangle of world points given by its bottom-left corner and size, as a
// screen rect given by its top-left corner.
export function worldRectToScreen(
  left: number,
  bottom: number,
  width: number,
  height: number,
  camera: BackdropCamera
): ScreenRect {
  const topLeft = worldPointToScreen(left, bottom + height, camera);
  return { x: topLeft.x, y: topLeft.y, width: width * camera.zoom, height: height * camera.zoom };
}

export interface PlacedSprite {
  url: string;
  rect: ScreenRect;
  alpha: number;
}

export interface RocketBackdropGeometry {
  stars: PlacedSprite[];
  moon: PlacedSprite;
  vignette: PlacedSprite;
  // Plain black rectangles covering whatever of the viewport the vignette
  // sprite does not: its edge is fully opaque, so these continue it.
  vignetteBands: ScreenRect[];
  door: PlacedSprite;
}

// A rect of a texture's aspect that covers the viewport (like CSS
// `background-size: cover`), enlarged by `scale`, centred, then shifted by
// `shift` as far as it can go while still covering.
export function coverViewport(
  texture: BackdropTextureSize,
  viewport: Viewport,
  scale: number,
  shift: { x: number; y: number }
): ScreenRect {
  const factor =
    Math.max(viewport.width / texture.width, viewport.height / texture.height) * Math.max(scale, 1);
  const width = texture.width * factor;
  const height = texture.height * factor;
  const slackX = Math.max(0, width - viewport.width);
  const slackY = Math.max(0, height - viewport.height);
  const x = (viewport.width - width) / 2 + clamp(shift.x, -slackX / 2, slackX / 2);
  const y = (viewport.height - height) / 2 + clamp(shift.y, -slackY / 2, slackY / 2);
  return { x, y, width, height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// The parts of `viewport` outside `inner`, as up to four rects.
export function bandsAround(inner: ScreenRect, viewport: Viewport): ScreenRect[] {
  const bands: ScreenRect[] = [];
  const innerTop = inner.y;
  const innerBottom = inner.y + inner.height;
  const innerLeft = inner.x;
  const innerRight = inner.x + inner.width;
  if (innerTop > 0) bands.push({ x: 0, y: 0, width: viewport.width, height: innerTop });
  if (innerBottom < viewport.height)
    bands.push({
      x: 0,
      y: innerBottom,
      width: viewport.width,
      height: viewport.height - innerBottom,
    });
  const midTop = Math.max(0, innerTop);
  const midHeight = Math.min(viewport.height, innerBottom) - midTop;
  if (midHeight > 0) {
    if (innerLeft > 0) bands.push({ x: 0, y: midTop, width: innerLeft, height: midHeight });
    if (innerRight < viewport.width)
      bands.push({
        x: innerRight,
        y: midTop,
        width: viewport.width - innerRight,
        height: midHeight,
      });
  }
  return bands;
}

export function rocketBackdropGeometry(
  placement: RocketInteriorPlacement,
  camera: BackdropCamera,
  viewport: Viewport
): RocketBackdropGeometry {
  const module: RocketInteriorModule = placement.module;
  const hull = rocketInteriorWorldBounds(placement);
  // World points: the hull's centre and its floor line.
  const hullCentreX = (hull.left + hull.right + 1) / 2;
  const hullCentreY = (hull.bottom + hull.top + 1) / 2;
  const hullFloorY = hull.bottom;
  const hullCentreScreen = worldPointToScreen(hullCentreX, hullCentreY, camera);
  // How far the hull sits from the middle of the viewport: what parallax
  // follows.
  const displacement = {
    x: hullCentreScreen.x - viewport.width / 2,
    y: hullCentreScreen.y - viewport.height / 2,
  };

  const stars = ROCKET_BACKDROP.stars.map(layer => ({
    url: layer.url,
    rect: coverViewport(layer.texture, viewport, layer.scale, {
      x: displacement.x * layer.parallax,
      y: displacement.y * layer.parallax,
    }),
    alpha: layer.alpha,
  }));

  const moonConfig = ROCKET_BACKDROP.moon;
  const moonScale = (moonConfig.widthInCells[module] * camera.zoom) / moonConfig.art.width;
  const crest = worldPointToScreen(
    hullCentreX + moonConfig.crestOffsetCells[module],
    hullFloorY + moonConfig.crestAboveFloorCells[module],
    camera
  );
  const moon: PlacedSprite = {
    url: moonConfig.url,
    rect: {
      x: crest.x - moonConfig.horizon.x * moonScale,
      y: crest.y - moonConfig.horizon.y * moonScale,
      width: moonConfig.texture.width * moonScale,
      height: moonConfig.texture.height * moonScale,
    },
    alpha: 1,
  };

  const vignetteConfig = ROCKET_BACKDROP.vignette;
  const radii = vignetteConfig.radiiCells[module];
  const centreOffset = vignetteConfig.centreOffsetCells[module];
  const vignetteRect = worldRectToScreen(
    hullCentreX + centreOffset.x - radii.x,
    hullCentreY + centreOffset.y - radii.y,
    radii.x * 2,
    radii.y * 2,
    camera
  );
  const vignette: PlacedSprite = {
    url: vignetteConfig.url,
    rect: vignetteRect,
    alpha: vignetteConfig.alpha,
  };

  const doorCell = rocketInteriorWorldDoor(placement);
  const doorConfig = ROCKET_BACKDROP.door;
  const door: PlacedSprite = {
    url: doorConfig.url,
    rect: worldRectToScreen(
      doorCell.x + doorConfig.rect.x,
      doorCell.y + doorConfig.rect.y,
      doorConfig.rect.width,
      doorConfig.rect.height,
      camera
    ),
    alpha: doorConfig.alpha,
  };

  return {
    stars,
    moon,
    vignette,
    vignetteBands: bandsAround(vignetteRect, viewport),
    door,
  };
}

// Every image the backdrop can ask for, for renderers that must preload.
export function rocketBackdropImageUrls(): string[] {
  return [
    ...ROCKET_BACKDROP.stars.map(layer => layer.url),
    ROCKET_BACKDROP.moon.url,
    ROCKET_BACKDROP.vignette.url,
    ROCKET_BACKDROP.door.url,
  ];
}

// Positions and sizes an already-created, top-left-anchored sprite.
export function placeSprite(sprite: any, placed: PlacedSprite): void {
  sprite.x = placed.rect.x;
  sprite.y = placed.rect.y;
  sprite.width = placed.rect.width;
  sprite.height = placed.rect.height;
  sprite.alpha = placed.alpha;
}

// Draws the black bands on a PIXI Graphics (any renderer).
export function drawVignetteBands(graphics: any, bands: ScreenRect[], alpha: number): void {
  graphics.clear();
  if (bands.length === 0) return;
  graphics.lineStyle(0);
  graphics.beginFill(0x000000, alpha);
  for (const band of bands) graphics.drawRect(band.x, band.y, band.width, band.height);
  graphics.endFill();
}
