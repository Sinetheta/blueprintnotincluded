import { describe, it, expect } from "vitest";
import {
  COMPACT_MAX_WIDTH,
  SLOT_MAX,
  SLOT_MIN,
  buildMenuLayout,
} from "./build-menu-layout";

describe("buildMenuLayout", () => {
  const NAV = 50;
  const BUTTONS = 16; // 15 categories and Paint Element

  it("uses full-size buttons on a 1080p screen", () => {
    const layout = buildMenuLayout({ width: 1920, height: 1080 }, NAV, BUTTONS);
    expect(layout.compact).toBe(false);
    expect(layout.slot).toBe(SLOT_MAX);
  });

  it("shrinks the buttons to fit a 768px-high laptop screen", () => {
    const layout = buildMenuLayout({ width: 1366, height: 768 }, NAV, BUTTONS);
    expect(layout.compact).toBe(false);
    expect(layout.slot).toBeGreaterThanOrEqual(SLOT_MIN);
    expect(layout.slot).toBeLessThan(SLOT_MAX);
    // The whole column fits between the nav and the bottom edge.
    const columnHeight = BUTTONS * layout.slot + 15 * 2 + 9 + 10;
    expect(columnHeight).toBeLessThanOrEqual(768 - NAV - 8 - 12);
  });

  it("reports the column's right edge, for the side panel to clear", () => {
    const layout = buildMenuLayout({ width: 1920, height: 1080 }, NAV, BUTTONS);
    expect(layout.columnWidth).toBe(12 + SLOT_MAX + 10);
  });

  it("turns into the sheet at phone width", () => {
    const layout = buildMenuLayout({ width: 390, height: 844 }, NAV, BUTTONS);
    expect(layout.compact).toBe(true);
    expect(layout.columnWidth).toBe(0);
    expect(
      buildMenuLayout({ width: COMPACT_MAX_WIDTH + 1, height: 900 }, NAV, 16)
        .compact,
    ).toBe(false);
  });

  it("turns into the sheet when the column can't fit the height", () => {
    // A phone on its side.
    expect(
      buildMenuLayout({ width: 844, height: 390 }, NAV, BUTTONS).compact,
    ).toBe(true);
  });
});
