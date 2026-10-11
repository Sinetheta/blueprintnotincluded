import { Vector2 } from '../vector2';
import { Blueprint } from './blueprint';
import { BlueprintHelpers } from './blueprint-helpers';
import { ROCKET_INTERIOR_LAYOUT_SOURCES } from './rocket-interior-layouts';

// Rocket interiors: the fixed walls, windows, ports, control station and door
// of a habitat module, drawn as scenery under a blueprint that was built inside
// one.
//
// The Blueprints mod ignores the rocket entirely: a blueprint made inside a
// habitat holds the player's buildings, the RocketControlStation (captured even
// though the player never placed it) and dig commands for the non-solid cells
// of the selection. None of the hull is in it. So the hull is reconstructed
// here from the game's own interior templates (Klei's TemplateContainer YAML
// for HabitatModuleSmall and HabitatModuleMedium, carried over by hand into
// assets/manual/rocket-interior/ and tabled by scripts/gen-rocket-interior-
// layouts.js) and aligned on the one piece every rocket blueprint does carry:
// the control station, whose cell is fixed in both templates.
//
// Which module a blueprint was built in is not derivable from the file with
// certainty (the station is the same building in both), so for now it is a
// stored choice on the website's blueprint record (`rocketInterior`), picked
// by the author. Nothing here is blueprint content: the scenery is never a
// BlueprintItem of the blueprint, never costed, never exported.

export const ROCKET_INTERIOR_MODULES = ['small', 'medium'] as const;
export type RocketInteriorModule = (typeof ROCKET_INTERIOR_MODULES)[number];

export function isRocketInteriorModule(value: unknown): value is RocketInteriorModule {
  return (ROCKET_INTERIOR_MODULES as readonly unknown[]).includes(value);
}

export const ROCKET_CONTROL_STATION_ID = 'RocketControlStation';

// The door is an entity in the game, not a building, so it has no OniItem and
// no database entry — only its icon in the regular export. Drawn straight from
// the file as scenery (see ROCKET_INTERIOR_DOOR in rocket-backdrop.ts for where
// its art sits relative to the door cell).
export const ROCKET_INTERIOR_DOOR_ID = 'ClustercraftInteriorDoor';
export const ROCKET_INTERIOR_DOOR_URL = 'assets/ui_image/ClustercraftInteriorDoor.png';

// Glyph -> prefab id for the generated layout grids. Two characters per cell.
// 'CS' marks the station's *origin* cell: it is 2x2 and also covers the cell
// to the right and the row above, which the template lists as room cells.
export const ROCKET_INTERIOR_GLYPHS: Record<string, string> = {
  '##': 'RocketWallTile',
  '[]': 'RocketEnvelopeWindowTile',
  go: 'RocketInteriorGasOutputPort',
  gi: 'RocketInteriorGasInputPort',
  lo: 'RocketInteriorLiquidOutputPort',
  li: 'RocketInteriorLiquidInputPort',
  CS: ROCKET_CONTROL_STATION_ID,
};
const ROOM_GLYPH = '..';
const OUTSIDE_GLYPH = '  ';

// What the generator emits: a glyph grid in template coordinates (y up, origin
// at the template centre as the game defines it), rows from the top down.
export interface RocketInteriorLayoutSource {
  module: RocketInteriorModule;
  prefabId: string;
  // Template cell of the first glyph of the first row.
  left: number;
  top: number;
  rows: string[];
  door: RocketInteriorCell;
}

export interface RocketInteriorCell {
  x: number;
  y: number;
}

// Shape check for a stored origin coming off the wire: a pair of integer cells.
export function isRocketInteriorCell(value: unknown): value is RocketInteriorCell {
  if (value == null || typeof value !== 'object') return false;
  const { x, y } = value as { x?: unknown; y?: unknown };
  return Number.isInteger(x) && Number.isInteger(y);
}

export interface RocketInteriorPiece extends RocketInteriorCell {
  id: string;
}

export interface RocketInteriorBounds {
  // Inclusive cell extents.
  left: number;
  right: number;
  bottom: number;
  top: number;
}

export interface RocketInteriorLayout {
  module: RocketInteriorModule;
  prefabId: string;
  width: number;
  height: number;
  bounds: RocketInteriorBounds;
  // Where the control station's origin cell is, in template coordinates.
  stationOrigin: RocketInteriorCell;
  // Every building of the template, station included, in template coordinates.
  pieces: RocketInteriorPiece[];
  // The non-solid cells of the template (the room), the station's cells
  // included. Not drawn; kept for the alignment tests and for a future
  // auto-detector, which can match a blueprint's dig commands against them.
  room: RocketInteriorCell[];
  door: RocketInteriorCell;
}

export function parseRocketInteriorLayout(
  source: RocketInteriorLayoutSource
): RocketInteriorLayout {
  const pieces: RocketInteriorPiece[] = [];
  const room: RocketInteriorCell[] = [];
  let stationOrigin: RocketInteriorCell | null = null;
  let width = 0;

  source.rows.forEach((row, rowIndex) => {
    if (row.length % 2 !== 0)
      throw new Error(`rocket interior ${source.module}: row ${rowIndex} has an odd length`);
    width = Math.max(width, row.length / 2);
    const y = source.top - rowIndex;
    for (let column = 0; column < row.length / 2; column++) {
      const glyph = row.substr(column * 2, 2);
      const x = source.left + column;
      if (glyph === OUTSIDE_GLYPH) continue;
      if (glyph === ROOM_GLYPH) {
        room.push({ x, y });
        continue;
      }
      const id = ROCKET_INTERIOR_GLYPHS[glyph];
      if (id == null)
        throw new Error(`rocket interior ${source.module}: unknown glyph '${glyph}' at ${x},${y}`);
      if (id === ROCKET_CONTROL_STATION_ID) {
        if (stationOrigin != null)
          throw new Error(`rocket interior ${source.module}: more than one control station`);
        stationOrigin = { x, y };
        // The station stands on room cells; it is not a solid.
        room.push({ x, y });
      }
      pieces.push({ id, x, y });
    }
  });

  if (stationOrigin == null)
    throw new Error(`rocket interior ${source.module}: no control station in the layout`);

  const height = source.rows.length;
  return {
    module: source.module,
    prefabId: source.prefabId,
    width,
    height,
    bounds: {
      left: source.left,
      right: source.left + width - 1,
      top: source.top,
      bottom: source.top - height + 1,
    },
    stationOrigin,
    pieces,
    room,
    door: { ...source.door },
  };
}

const layouts = new Map<RocketInteriorModule, RocketInteriorLayout>();
for (const source of ROCKET_INTERIOR_LAYOUT_SOURCES)
  layouts.set(source.module, parseRocketInteriorLayout(source));

export function rocketInteriorLayout(module: RocketInteriorModule): RocketInteriorLayout {
  const layout = layouts.get(module);
  if (layout == null) throw new Error(`no rocket interior layout for module '${module}'`);
  return layout;
}

// Which building draws each hull piece. The rocket window's own art is a
// small rounded pane that joins only to other rocket windows, so a lone window
// between two walls reads as an undersized square; the plain Window Tile is
// edge-to-edge glass and reads as the game's does. Rendering only — the
// layout, the alignment and the tests still speak of the real prefab ids.
export const ROCKET_INTERIOR_ART: Record<string, string> = {
  RocketEnvelopeWindowTile: 'GlassTile',
};

// How the template was aligned with the blueprint. 'station' is the real
// alignment, read from the blueprint every time; 'stored' is an origin fixed
// earlier and kept on the record; 'bounds' is the last resort when there is
// neither — the template centred on the blueprint's extent *as it is now*,
// which moves whenever the blueprint grows, so the editor resolves it once
// and stores it rather than living with a hull that follows the bricks.
export type RocketInteriorAnchor = 'station' | 'stored' | 'bounds';

export interface RocketInteriorPlacement {
  module: RocketInteriorModule;
  layout: RocketInteriorLayout;
  // The world cell the template's (0, 0) lands on.
  origin: RocketInteriorCell;
  anchor: RocketInteriorAnchor;
  // Hull pieces the blueprint itself says are gone, as world cells: the mod
  // writes a dig command for every non-solid cell of the selection, so a dig
  // on a wall or window cell means the player had blown it out when the
  // capture was taken. Sorted, deduplicated.
  removed: RocketInteriorCell[];
}

// The subset of BlueprintItem the alignment reads, so plain records can be
// aligned too (tests, a future batch detector).
export interface RocketInteriorAnchorItem {
  id: string;
  position: { x: number; y: number };
}

// The template origin that puts the layout's station on the blueprint's, or
// null when the blueprint does not have exactly one control station.
//
// Mod offsets and site cells are the same space with the same sign: the
// BlueprintsV2 importer copies `offset` into `position` verbatim and both are
// y-up, so the template's y-up coordinates add directly.
export function rocketInteriorOriginFromStation(
  layout: RocketInteriorLayout,
  items: RocketInteriorAnchorItem[]
): RocketInteriorCell | null {
  const stations = items.filter(item => item.id === ROCKET_CONTROL_STATION_ID);
  if (stations.length !== 1) return null;
  const station = stations[0].position;
  return {
    x: station.x - layout.stationOrigin.x,
    y: station.y - layout.stationOrigin.y,
  };
}

// The template origin that centres the hull on an inclusive cell extent
// (Blueprint.getBoundingBox's [min, max] pair). Rounded so the hull stays on
// the grid; a half-cell tie rounds up, which is as good as any choice.
export function rocketInteriorOriginCentred(
  layout: RocketInteriorLayout,
  min: { x: number; y: number },
  max: { x: number; y: number }
): RocketInteriorCell {
  const b = layout.bounds;
  return {
    x: roundCell((min.x + max.x) / 2 - (b.left + b.right) / 2),
    y: roundCell((min.y + max.y) / 2 - (b.bottom + b.top) / 2),
  };
}

// The template origin that centres the hull on a world point (cell units,
// fractional allowed) — what an empty blueprint gets: the middle of whatever
// the author is looking at, instead of the world origin, which with the hull
// spanning negative cells sits wherever the camera happens to have left it.
export function rocketInteriorOriginCentredOnPoint(
  layout: RocketInteriorLayout,
  point: { x: number; y: number }
): RocketInteriorCell {
  const b = layout.bounds;
  return {
    x: roundCell(point.x - (b.left + b.right + 1) / 2),
    y: roundCell(point.y - (b.bottom + b.top + 1) / 2),
  };
}

// Math.round alone yields -0 for small negatives, which deep-equals nothing.
function roundCell(value: number): number {
  return Math.round(value) || 0;
}

// `storedOrigin` is the record's rocketInteriorOrigin: the origin the editor
// resolved when the module was chosen. A single control station still wins —
// it is the one fact the blueprint itself carries — so a stored origin only
// matters for a blueprint without one.
// Whether a blueprint has anything to centre a hull on.
export function isBlueprintEmpty(blueprint: Blueprint): boolean {
  return (
    blueprint.blueprintItems.length === 0 &&
    blueprint.worldNotes.length === 0 &&
    blueprint.terrainFeatures.length === 0 &&
    blueprint.planningToolShapes.length === 0 &&
    blueprint.digCommands.length === 0
  );
}

export function placeRocketInterior(
  module: RocketInteriorModule,
  blueprint: Blueprint,
  storedOrigin?: RocketInteriorCell | null
): RocketInteriorPlacement {
  const layout = rocketInteriorLayout(module);
  const place = (origin: RocketInteriorCell, anchor: RocketInteriorAnchor) => ({
    module,
    layout,
    origin,
    anchor,
    removed: dugHullCells(layout, origin, blueprint.digCommands),
  });

  const fromStation = rocketInteriorOriginFromStation(layout, blueprint.blueprintItems);
  if (fromStation != null) return place(fromStation, 'station');
  if (storedOrigin != null) return place({ x: storedOrigin.x, y: storedOrigin.y }, 'stored');

  // getBoundingBox is a sentinel pair on an empty blueprint; the template then
  // sits on the origin, which is where a new blueprint starts anyway.
  const origin = isBlueprintEmpty(blueprint)
    ? { x: 0, y: 0 }
    : (() => {
        const [min, max] = blueprint.getBoundingBox();
        return rocketInteriorOriginCentred(layout, min, max);
      })();
  return place(origin, 'bounds');
}

// The hull cells a blueprint's dig commands land on. Dig commands only cover
// the player's selection rectangle, so a wall outside it is simply unknown
// and stays; one inside it that was dug is a hole the player made.
function dugHullCells(
  layout: RocketInteriorLayout,
  origin: RocketInteriorCell,
  digCommands: { x: number; y: number }[] | null | undefined
): RocketInteriorCell[] {
  if (digCommands == null || digCommands.length === 0) return [];
  const dug = new Set(digCommands.map(dig => `${dig.x},${dig.y}`));
  const removed: RocketInteriorCell[] = [];
  for (const piece of layout.pieces) {
    const x = piece.x + origin.x;
    const y = piece.y + origin.y;
    if (dug.has(`${x},${y}`)) removed.push({ x, y });
  }
  return removed.sort((a, b) => a.x - b.x || a.y - b.y);
}

// Two placements draw the same scenery exactly when this key matches; lets a
// per-frame renderer keep its sprites while nothing moved.
export function rocketInteriorPlacementKey(placement: RocketInteriorPlacement): string {
  const removed = placement.removed.map(cell => `${cell.x},${cell.y}`).join(';');
  return `${placement.module}:${placement.origin.x},${placement.origin.y}:${removed}`;
}

// The hull's pieces as world cells, less the ones the blueprint dug out.
export function rocketInteriorWorldPieces(
  placement: RocketInteriorPlacement
): RocketInteriorPiece[] {
  const removed = new Set(placement.removed.map(cell => `${cell.x},${cell.y}`));
  const pieces: RocketInteriorPiece[] = [];
  for (const piece of placement.layout.pieces) {
    const x = piece.x + placement.origin.x;
    const y = piece.y + placement.origin.y;
    if (!removed.has(`${x},${y}`)) pieces.push({ id: piece.id, x, y });
  }
  return pieces;
}

export function rocketInteriorWorldDoor(placement: RocketInteriorPlacement): RocketInteriorCell {
  return {
    x: placement.layout.door.x + placement.origin.x,
    y: placement.layout.door.y + placement.origin.y,
  };
}

export function rocketInteriorWorldBounds(
  placement: RocketInteriorPlacement
): RocketInteriorBounds {
  const b = placement.layout.bounds;
  return {
    left: b.left + placement.origin.x,
    right: b.right + placement.origin.x,
    bottom: b.bottom + placement.origin.y,
    top: b.top + placement.origin.y,
  };
}

// A blueprint's bounding box widened to take in the whole hull, so framing
// (thumbnails, previews, exports) never crops the interior the blueprint sits
// in. Same [min, max] shape as Blueprint.getBoundingBox.
export function expandBoundsForRocketInterior(
  box: Vector2[],
  placement: RocketInteriorPlacement | null
): Vector2[] {
  if (placement == null) return box;
  const hull = rocketInteriorWorldBounds(placement);
  const [min, max] = box;
  return [
    new Vector2(Math.min(min.x, hull.left), Math.min(min.y, hull.bottom)),
    new Vector2(Math.max(max.x, hull.right), Math.max(max.y, hull.top)),
  ];
}

// The hull as drawable items: a throwaway Blueprint holding one BlueprintItem
// per template piece, so the same drawPixi pipeline that renders the
// blueprint renders the scenery with the real building art — and the wall and
// window tiles join to their neighbours, since updateTileables reads this
// blueprint. The door is not a building and is not in here.
//
// Pieces the loaded database does not know are skipped rather than failing:
// the scenery is flavour, and a database that predates a prefab should lose
// one wall, not the whole facade. Pieces draw as ROCKET_INTERIOR_ART says.
export function buildRocketInteriorScenery(placement: RocketInteriorPlacement): Blueprint {
  const scenery = new Blueprint();
  scenery.pauseChangeEvents();
  for (const piece of rocketInteriorWorldPieces(placement)) {
    const artId = ROCKET_INTERIOR_ART[piece.id] ?? piece.id;
    const item = BlueprintHelpers.createInstance(artId);
    if (item == null) continue;
    item.importMdbBuilding({ id: artId, position: new Vector2(piece.x, piece.y) });
    scenery.addBlueprintItem(item);
  }
  scenery.resumeChangeEvents(false);
  for (const item of scenery.blueprintItems) item.updateTileables(scenery);
  return scenery;
}
