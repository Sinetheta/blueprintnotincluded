// How the build menu fits the screen: a column of category buttons sized to
// the height between the nav and the bottom edge, or, where none fits, the
// small-screen sheet. Pure, so the geometry is testable without a browser.

// The column's buttons: as big as the toolbar's at most, and never so small
// that a category is hard to hit. Below the minimum the menu turns into the
// small-screen sheet instead.
export const SLOT_MAX = 44;
export const SLOT_MIN = 30;
const SLOT_GAP = 2;
// Room the column keeps from the viewport's left and bottom edges, the nav,
// and the rule between Paint Element and the categories.
export const EDGE_GAP = 12;
export const NAV_GAP = 8;
const COLUMN_PADDING = 4;
const COLUMN_BORDER = 1;
const RULE_HEIGHT = 9;
// Phone width: the column would eat a quarter of the canvas.
export const COMPACT_MAX_WIDTH = 640;

export interface BuildMenuLayout {
  compact: boolean;
  slot: number;
  columnWidth: number;
}

// How big the column's buttons can be, and whether a column fits at all.
export function buildMenuLayout(
  viewport: { width: number; height: number },
  navBottom: number,
  buttons: number,
): BuildMenuLayout {
  const available =
    viewport.height -
    navBottom -
    NAV_GAP -
    EDGE_GAP -
    2 * (COLUMN_PADDING + COLUMN_BORDER) -
    RULE_HEIGHT -
    (buttons - 1) * SLOT_GAP;
  const slot = Math.min(SLOT_MAX, Math.floor(available / Math.max(1, buttons)));
  const compact = viewport.width <= COMPACT_MAX_WIDTH || slot < SLOT_MIN;
  return {
    compact,
    slot,
    // The column's right edge: its left offset, the button, padding, border.
    columnWidth: compact
      ? 0
      : EDGE_GAP + slot + 2 * (COLUMN_PADDING + COLUMN_BORDER),
  };
}
