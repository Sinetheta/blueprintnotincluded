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

// How the template was aligned with the blueprint. 'station' is the real
// alignment; 'bounds' is the fallback when the blueprint has no control
// station or more than one (a cheated or hand-edited capture), in which case
// the template is simply centred on the blueprint's extent.
export type RocketInteriorAnchor = 'station' | 'bounds';

export interface RocketInteriorPlacement {
  module: RocketInteriorModule;
  layout: RocketInteriorLayout;
  // The world cell the template's (0, 0) lands on.
  origin: RocketInteriorCell;
  anchor: RocketInteriorAnchor;
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

// Math.round alone yields -0 for small negatives, which deep-equals nothing.
function roundCell(value: number): number {
  return Math.round(value) || 0;
}

export function placeRocketInterior(
  module: RocketInteriorModule,
  blueprint: Blueprint
): RocketInteriorPlacement {
  const layout = rocketInteriorLayout(module);
  const fromStation = rocketInteriorOriginFromStation(layout, blueprint.blueprintItems);
  if (fromStation != null) return { module, layout, origin: fromStation, anchor: 'station' };

  // getBoundingBox is a sentinel pair on an empty blueprint; the template then
  // sits on the origin, which is where a new blueprint starts anyway.
  const origin =
    blueprint.blueprintItems.length === 0 &&
    blueprint.worldNotes.length === 0 &&
    blueprint.terrainFeatures.length === 0 &&
    blueprint.planningToolShapes.length === 0
      ? { x: 0, y: 0 }
      : (() => {
          const [min, max] = blueprint.getBoundingBox();
          return rocketInteriorOriginCentred(layout, min, max);
        })();
  return { module, layout, origin, anchor: 'bounds' };
}

// Two placements draw the same scenery exactly when this key matches; lets a
// per-frame renderer keep its sprites while nothing moved.
export function rocketInteriorPlacementKey(placement: RocketInteriorPlacement): string {
  return `${placement.module}:${placement.origin.x},${placement.origin.y}`;
}

export function rocketInteriorWorldPieces(
  placement: RocketInteriorPlacement
): RocketInteriorPiece[] {
  return placement.layout.pieces.map(piece => ({
    id: piece.id,
    x: piece.x + placement.origin.x,
    y: piece.y + placement.origin.y,
  }));
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
// one wall, not the whole facade.
export function buildRocketInteriorScenery(placement: RocketInteriorPlacement): Blueprint {
  const scenery = new Blueprint();
  scenery.pauseChangeEvents();
  for (const piece of rocketInteriorWorldPieces(placement)) {
    const item = BlueprintHelpers.createInstance(piece.id);
    if (item == null) continue;
    item.importMdbBuilding({ id: piece.id, position: new Vector2(piece.x, piece.y) });
    scenery.addBlueprintItem(item);
  }
  scenery.resumeChangeEvents(false);
  for (const item of scenery.blueprintItems) item.updateTileables(scenery);
  return scenery;
}
