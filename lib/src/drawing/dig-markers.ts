import { BniDigCommand } from '../io/bni/bni-blueprint';

// How dig commands become marks on the canvas. Pure and renderer-agnostic,
// like terrain-markers.ts and note-markers.ts, because three renderers need
// the same answer: the editor overlay, the client-side export/thumbnail
// snapshots, and the server-side preview worker.
//
// A dig command says "this cell gets dug out on paste", which is neither
// something you build nor something that is already there, so it gets a
// treatment of its own: a faint amber fill crossed by diagonal hatching, with
// a solid outline around each dug region (not each cell, so a capture's
// hundreds of digs read as one area rather than a second grid). That keeps it
// apart from the Planning Tool's solid coloured shapes and terrain's dashed
// cyan outlines. Amber, because the canvas is blue or grey and its grid lines
// are white.
export const DIG_COLOR = 0xffb340;
export const DIG_FILL_ALPHA = 0.16;
export const DIG_HATCH_ALPHA = 0.7;
export const DIG_EDGE_ALPHA = 0.95;

// The strength dig cells draw at when nobody is editing them: under the
// buildings in the editor, and in every export and preview. A capture digs
// every empty cell of its selection, so at full strength its card would be a
// hatched rectangle with the build somewhere inside. Full strength (1) is for
// the Dig tool, which draws them over the buildings while it is active.
export const DIG_AT_REST_ALPHA = 0.5;

// A cell that refuses a dig (one under a Planning Tool shape) previews in red.
export const DIG_BLOCKED_COLOR = 0xe5533d;

// Hatch lines per cell side. The spacing divides the cell exactly and every
// cell starts its lines at its own corner, so the stripes of neighbouring
// cells meet and a dug region reads as one hatched area.
const HATCH_LINES_PER_CELL = 3;

// [x0, y0, x1, y1] in screen pixels.
export type DigSegment = [number, number, number, number];

export interface DigCellBox {
  left: number;
  top: number;
}

export interface DigOverlayGeometry {
  // Side of every cell box, in pixels (the zoom).
  size: number;
  cells: DigCellBox[];
  hatch: DigSegment[];
  // The outline of the dug regions: every cell side whose neighbour is not dug.
  edges: DigSegment[];
}

function cellKey(x: number, y: number): string {
  return x + ',' + y;
}

// Where everything goes, for `digs` drawn at `zoom` pixels per cell with the
// top-left corner of cell (0, 0) at (originX, originY). Cell y is up, screen
// y is down, so a cell's top edge is originY - y * zoom — the convention of
// BlueprintItem.drawPixi with originX = offset.x * zoom, originY = offset.y * zoom.
// A repeated cell is drawn once.
export function digOverlayGeometry(
  digs: readonly BniDigCommand[] | null | undefined,
  zoom: number,
  originX: number = 0,
  originY: number = 0
): DigOverlayGeometry {
  const geometry: DigOverlayGeometry = { size: zoom, cells: [], hatch: [], edges: [] };
  if (digs == null || digs.length === 0) return geometry;

  const dug = new Set<string>();
  const unique: BniDigCommand[] = [];
  for (const dig of digs) {
    const key = cellKey(dig.x, dig.y);
    if (dug.has(key)) continue;
    dug.add(key);
    unique.push(dig);
  }

  const spacing = zoom / HATCH_LINES_PER_CELL;
  for (const dig of unique) {
    const left = originX + dig.x * zoom;
    const top = originY - dig.y * zoom;
    const right = left + zoom;
    const bottom = top + zoom;
    geometry.cells.push({ left, top });

    // "/" stripes: the lines (x - left) + (y - top) = k, clipped to the cell.
    for (let i = 1; i < 2 * HATCH_LINES_PER_CELL; i++) {
      const k = i * spacing;
      if (k <= zoom) geometry.hatch.push([left + k, top, left, top + k]);
      else geometry.hatch.push([right, top + k - zoom, left + k - zoom, bottom]);
    }

    if (!dug.has(cellKey(dig.x, dig.y + 1))) geometry.edges.push([left, top, right, top]);
    if (!dug.has(cellKey(dig.x + 1, dig.y))) geometry.edges.push([right, top, right, bottom]);
    if (!dug.has(cellKey(dig.x, dig.y - 1))) geometry.edges.push([left, bottom, right, bottom]);
    if (!dug.has(cellKey(dig.x - 1, dig.y))) geometry.edges.push([left, top, left, bottom]);
  }
  return geometry;
}

export function digHatchThickness(zoom: number): number {
  return Math.max(1, zoom * 0.04);
}

export function digEdgeThickness(zoom: number): number {
  return Math.max(1, zoom * 0.06);
}

// Draws dig cells onto a PIXI Graphics. `alpha` scales the whole treatment
// (the editor's hover preview draws fainter); `color` is for the blocked
// preview. One call, one Graphics — the caller owns clearing it.
export function drawDigCells(
  graphics: any,
  digs: readonly BniDigCommand[] | null | undefined,
  zoom: number,
  originX: number = 0,
  originY: number = 0,
  alpha: number = 1,
  color: number = DIG_COLOR
): void {
  const geometry = digOverlayGeometry(digs, zoom, originX, originY);
  if (geometry.cells.length === 0) return;

  graphics.lineStyle(0);
  graphics.beginFill(color, DIG_FILL_ALPHA * alpha);
  for (const cell of geometry.cells) graphics.drawRect(cell.left, cell.top, zoom, zoom);
  graphics.endFill();

  graphics.lineStyle(digHatchThickness(zoom), color, DIG_HATCH_ALPHA * alpha);
  for (const [x0, y0, x1, y1] of geometry.hatch) {
    graphics.moveTo(x0, y0);
    graphics.lineTo(x1, y1);
  }

  graphics.lineStyle(digEdgeThickness(zoom), color, DIG_EDGE_ALPHA * alpha);
  for (const [x0, y0, x1, y1] of geometry.edges) {
    graphics.moveTo(x0, y0);
    graphics.lineTo(x1, y1);
  }
  graphics.lineStyle(0);
}

// The dig tool's cursor for a click that adds nothing: the cell's outline
// crossed out — in the dig colour for the eraser, in DIG_BLOCKED_COLOR over a
// cell that refuses a dig.
export function drawCrossedDigCell(
  graphics: any,
  cell: BniDigCommand,
  zoom: number,
  originX: number = 0,
  originY: number = 0,
  color: number = DIG_BLOCKED_COLOR
): void {
  const left = originX + cell.x * zoom;
  const top = originY - cell.y * zoom;
  const inset = zoom * 0.2;
  graphics.lineStyle(digEdgeThickness(zoom), color, DIG_EDGE_ALPHA);
  graphics.drawRect(left, top, zoom, zoom);
  graphics.moveTo(left + inset, top + inset);
  graphics.lineTo(left + zoom - inset, top + zoom - inset);
  graphics.moveTo(left + zoom - inset, top + inset);
  graphics.lineTo(left + inset, top + zoom - inset);
  graphics.lineStyle(0);
}

// A signature of the cells, for overlays that cache their geometry: the same
// cells in the same order give the same key.
export function digCommandsKey(digs: readonly BniDigCommand[] | null | undefined): string {
  if (digs == null) return '';
  let key = '';
  for (const dig of digs) key += dig.x + ',' + dig.y + ';';
  return key;
}
