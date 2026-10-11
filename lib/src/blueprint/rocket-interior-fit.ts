import { BuildLocationRule } from '../enums/build-location-rule';
import { OniItem } from '../oni-item';
import {
  ROCKET_CONTROL_STATION_ID,
  ROCKET_INTERIOR_MODULES,
  RocketInteriorAnchorItem,
  RocketInteriorCell,
  RocketInteriorLayout,
  RocketInteriorModule,
  rocketInteriorLayout,
  rocketInteriorOriginFromStation,
} from './rocket-interior';

// Which habitat a blueprint was built in, and where its hull sits — read off
// the blueprint itself, for the many rocket blueprints stored before an
// author could say so.
//
// The corpus has two kinds, and the station alone serves only the first:
//
// - **Captures** from the game. The station is where the template puts it and
//   the dig commands cover the selection's non-solid cells, so the station
//   gives the origin and the digs tell the modules apart: under the wrong
//   template a real wall of the right one is a solid, undug, unoccupied room
//   cell, and a real room cell is a "blown-out" wall.
// - **Drawings** made on the site before the facade existed (most of what is
//   stored): the author drew the hull out of ordinary tiles — Metal, Glass,
//   Insulation, a Door for the hatch — and put the station wherever they
//   liked, often rows above the floor. The station would put the hull in the
//   wrong place; the drawn walls give the right one.
//
// Only a blueprint with a control station is considered, and only an
// unambiguous answer is returned. A blueprint that fits either module equally
// well, holds several interiors, or spills far past the hull gets null: no
// facade beats a wrong one.

export type RocketInteriorFitEvidence = 'capture' | 'hull' | 'station';

export interface RocketInteriorFit {
  module: RocketInteriorModule;
  // The world cell the template's (0, 0) lands on — what rocketInteriorOrigin stores.
  origin: RocketInteriorCell;
  evidence: RocketInteriorFitEvidence;
  // Share of the template's hull cells (walls, windows, ports) the blueprint
  // has a wall-like building on. 0 for a capture, which carries no hull.
  hullCoverage: number;
  // Item cells outside the hull (not counting the pipe leaving a port).
  strays: number;
}

export interface RocketInteriorFitOptions {
  // Whether a building can stand in for a hull piece in a drawing. Defaults to
  // the loaded database's Tile build rule (isRocketHullMaterial).
  isWall?: (id: string) => boolean;
}

// A drawn hull must cover this share of the template's walls to count. A
// one-cell shift keeps most of the side walls but loses the top and bottom
// rows, which lands near half; a real drawing missing only the four-cell cap
// of the medium habitat is above 90%.
export const HULL_COVERAGE_MIN = 0.6;

// Parts outside the hull a fit tolerates: a power plug left in a corner of the
// sheet, a stray wire. More than this and the blueprint is something else that
// happens to contain a station — typically a sheet with an empty hull and the
// parts laid out beside it, where a facade would frame the wrong thing.
export function strayLimit(itemCells: number): number {
  return Math.max(4, Math.round(itemCells * 0.03));
}

// And they must lie next to the hull. Previews and exports frame the hull and
// the blueprint together, so one part left twenty cells away shrinks the
// rocket into a corner of its own thumbnail, with the backdrop's vignette
// blacking out the rest. Such a blueprint keeps its category and goes without
// the facade.
export const STRAY_REACH = 2;

// A wall-like building, by the game's own build rule: every tile, the window
// and airflow tiles, doors and the hull's own pieces are Tile-rule buildings.
// False for an id the database does not know (or with no database loaded).
export function isRocketHullMaterial(id: string): boolean {
  const item = OniItem.oniItemsMap?.get(id);
  return item != null && item.buildLocationRule === BuildLocationRule.Tile;
}

interface Candidate {
  module: RocketInteriorModule;
  origin: RocketInteriorCell;
  coverage: number;
  strays: number;
  // How many cells the blueprint reaches past the hull's bounds, on its worst side.
  spill: number;
  stationMatch: boolean;
}

// The blueprint's occupied cells, and their extent.
interface ItemIndex {
  cells: Map<string, string[]>;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const key = (x: number, y: number) => `${x},${y}`;

// The cells just outside a template's ports. Authors draw the pipe that leaves
// a port, so a part there belongs to the hull rather than straying from it.
const portMouths = new Map<RocketInteriorModule, RocketInteriorCell[]>();
function portMouthCells(layout: RocketInteriorLayout): RocketInteriorCell[] {
  let cells = portMouths.get(layout.module);
  if (cells != null) return cells;
  const taken = new Set([...layout.pieces, ...layout.room].map(c => key(c.x, c.y)));
  const found = new Map<string, RocketInteriorCell>();
  for (const piece of layout.pieces) {
    if (!piece.id.endsWith('Port')) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cell = { x: piece.x + dx, y: piece.y + dy };
      if (!taken.has(key(cell.x, cell.y))) found.set(key(cell.x, cell.y), cell);
    }
  }
  cells = [...found.values()];
  portMouths.set(layout.module, cells);
  return cells;
}

// What one template placement explains about the blueprint.
function evaluate(
  layout: RocketInteriorLayout,
  origin: RocketInteriorCell,
  index: ItemIndex,
  isWall: (id: string) => boolean,
  station: RocketInteriorCell | null
): Candidate {
  const itemCells = index.cells;
  let hullCells = 0;
  let covered = 0;
  let inside = 0;
  for (const piece of layout.pieces) {
    if (piece.id === ROCKET_CONTROL_STATION_ID) continue;
    hullCells++;
    const ids = itemCells.get(key(piece.x + origin.x, piece.y + origin.y));
    if (ids == null) continue;
    inside++;
    if (ids.some(isWall)) covered++;
  }
  for (const cell of [...layout.room, ...portMouthCells(layout)])
    if (itemCells.has(key(cell.x + origin.x, cell.y + origin.y))) inside++;

  return {
    module: layout.module,
    origin,
    coverage: hullCells === 0 ? 0 : covered / hullCells,
    strays: itemCells.size - inside,
    spill: Math.max(
      0,
      layout.bounds.left + origin.x - index.minX,
      index.maxX - (layout.bounds.right + origin.x),
      layout.bounds.bottom + origin.y - index.minY,
      index.maxY - (layout.bounds.top + origin.y)
    ),
    stationMatch:
      station != null &&
      station.x === origin.x + layout.stationOrigin.x &&
      station.y === origin.y + layout.stationOrigin.y,
  };
}

// For a capture: how badly a station-aligned template disagrees with the
// digs. Inside the selection (the digs' extent), a template room cell that is
// neither dug nor occupied was solid in the game, so it is a wall this
// template does not have; a dig on a template wall is a wall the game did not
// have there. The right module scores (near) zero; the station holds still
// between the two, so their walls disagree wherever the shapes differ.
function captureMismatch(
  layout: RocketInteriorLayout,
  origin: RocketInteriorCell,
  digs: Set<string>,
  digBounds: { minX: number; maxX: number; minY: number; maxY: number },
  itemCells: Map<string, string[]>
): number {
  const inSelection = (x: number, y: number) =>
    x >= digBounds.minX && x <= digBounds.maxX && y >= digBounds.minY && y <= digBounds.maxY;
  let mismatch = 0;
  for (const cell of layout.room) {
    const x = cell.x + origin.x;
    const y = cell.y + origin.y;
    if (!inSelection(x, y)) continue;
    const k = key(x, y);
    if (!digs.has(k) && !itemCells.has(k)) mismatch++;
  }
  for (const piece of layout.pieces) {
    if (piece.id === ROCKET_CONTROL_STATION_ID) continue;
    if (digs.has(key(piece.x + origin.x, piece.y + origin.y))) mismatch++;
  }
  return mismatch;
}

function better(a: Candidate, b: Candidate): number {
  return (
    b.coverage - a.coverage ||
    a.strays - b.strays ||
    Number(b.stationMatch) - Number(a.stationMatch)
  );
}

// How many item cells one placement of a template can account for.
function templateCapacity(layout: RocketInteriorLayout): number {
  return layout.pieces.length + layout.room.length + portMouthCells(layout).length;
}

function indexItems(items: RocketInteriorAnchorItem[]): ItemIndex {
  const index: ItemIndex = {
    cells: new Map<string, string[]>(),
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  };
  for (const { id, position } of items) {
    const k = key(position.x, position.y);
    const ids = index.cells.get(k);
    if (ids == null) index.cells.set(k, [id]);
    else ids.push(id);
    index.minX = Math.min(index.minX, position.x);
    index.maxX = Math.max(index.maxX, position.x);
    index.minY = Math.min(index.minY, position.y);
    index.maxY = Math.max(index.maxY, position.y);
  }
  return index;
}

function acceptable(candidate: Candidate, limit: number): boolean {
  return candidate.strays <= limit && candidate.spill <= STRAY_REACH;
}

function soleStation(items: RocketInteriorAnchorItem[]): RocketInteriorCell | null {
  const stations = items.filter(item => item.id === ROCKET_CONTROL_STATION_ID);
  return stations.length === 1 ? stations[0].position : null;
}

// Every placement of a template that puts some wall-like building on some hull
// piece (any placement with coverage above zero is one of these) and passes as
// a drawing of it.
function drawnCandidates(
  layout: RocketInteriorLayout,
  index: ItemIndex,
  isWall: (id: string) => boolean,
  station: RocketInteriorCell | null,
  limit: number
): Candidate[] {
  const wallCells: RocketInteriorCell[] = [];
  for (const [k, ids] of index.cells) {
    if (!ids.some(isWall)) continue;
    const [x, y] = k.split(',').map(Number);
    wallCells.push({ x, y });
  }
  const candidates: Candidate[] = [];
  const tried = new Set<string>();
  for (const piece of layout.pieces) {
    if (piece.id === ROCKET_CONTROL_STATION_ID) continue;
    for (const cell of wallCells) {
      const origin = { x: cell.x - piece.x, y: cell.y - piece.y };
      const k = key(origin.x, origin.y);
      if (tried.has(k)) continue;
      tried.add(k);
      const candidate = evaluate(layout, origin, index, isWall, station);
      if (candidate.coverage >= HULL_COVERAGE_MIN && acceptable(candidate, limit))
        candidates.push(candidate);
    }
  }
  return candidates;
}

function toFit(candidate: Candidate, evidence: RocketInteriorFitEvidence): RocketInteriorFit {
  return {
    module: candidate.module,
    origin: candidate.origin,
    evidence,
    hullCoverage: candidate.coverage,
    strays: candidate.strays,
  };
}

export function fitRocketInterior(
  items: RocketInteriorAnchorItem[],
  digCommands: { x: number; y: number }[] | null | undefined,
  options: RocketInteriorFitOptions = {}
): RocketInteriorFit | null {
  // The station is what makes a blueprint a rocket interior at all; without
  // one, any tile-walled room of the right size would pass as a drawn hull.
  if (!items.some(item => item.id === ROCKET_CONTROL_STATION_ID)) return null;
  const isWall = options.isWall ?? isRocketHullMaterial;
  const index = indexItems(items);
  const itemCells = index.cells;

  const layouts = ROCKET_INTERIOR_MODULES.map(rocketInteriorLayout);
  const limit = strayLimit(itemCells.size);
  // More occupied cells than the biggest template has: no placement can hold
  // them. Keeps a base-sized blueprint from enumerating thousands of origins.
  const capacity = Math.max(...layouts.map(templateCapacity));
  if (itemCells.size - limit > capacity) return null;

  const station = soleStation(items);
  const digs = digCommands ?? [];

  // A capture: the station is authoritative and the digs pick the module.
  if (station != null && digs.length > 0) {
    const digSet = new Set(digs.map(d => key(d.x, d.y)));
    const digBounds = {
      minX: Math.min(...digs.map(d => d.x)),
      maxX: Math.max(...digs.map(d => d.x)),
      minY: Math.min(...digs.map(d => d.y)),
      maxY: Math.max(...digs.map(d => d.y)),
    };
    const scored = layouts.map(layout => {
      const origin = rocketInteriorOriginFromStation(layout, items)!;
      return {
        candidate: evaluate(layout, origin, index, isWall, station),
        mismatch: captureMismatch(layout, origin, digSet, digBounds, itemCells),
      };
    });
    scored.sort((a, b) => a.mismatch - b.mismatch);
    if (scored.length > 1 && scored[0].mismatch === scored[1].mismatch) return null;
    return toFit(scored[0].candidate, 'capture');
  }

  // A drawing: the placement whose walls the blueprint draws best.
  const drawn = layouts.flatMap(layout => drawnCandidates(layout, index, isWall, station, limit));
  if (drawn.length > 0) {
    drawn.sort(better);
    if (drawn.length > 1 && better(drawn[0], drawn[1]) === 0) return null;
    return toFit(drawn[0], 'hull');
  }

  // No hull drawn and no digs: the station, if everything sits in the room
  // around it. A build small enough for either module says nothing about which.
  if (station == null) return null;
  const aligned = layouts
    .map(layout =>
      evaluate(layout, rocketInteriorOriginFromStation(layout, items)!, index, isWall, station)
    )
    .filter(candidate => acceptable(candidate, limit))
    .sort((a, b) => a.strays - b.strays);
  if (aligned.length === 0) return null;
  if (aligned.length > 1 && aligned[0].strays === aligned[1].strays) return null;
  return toFit(aligned[0], 'station');
}

// The best drawn-hull placement of one given module, for an author who has
// already picked it; null without a drawn hull (the caller falls back to the
// station or the bounding box, as placeRocketInterior does).
export function fitRocketInteriorModule(
  module: RocketInteriorModule,
  items: RocketInteriorAnchorItem[],
  options: RocketInteriorFitOptions = {}
): RocketInteriorCell | null {
  const isWall = options.isWall ?? isRocketHullMaterial;
  const layout = rocketInteriorLayout(module);
  const index = indexItems(items);
  const limit = strayLimit(index.cells.size);
  if (index.cells.size - limit > templateCapacity(layout)) return null;
  const drawn = drawnCandidates(layout, index, isWall, soleStation(items), limit);
  if (drawn.length === 0) return null;
  drawn.sort(better);
  return { ...drawn[0].origin };
}
