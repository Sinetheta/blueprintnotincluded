import { describe, it, expect } from "vitest";
import { OniItem } from "../../../../../../lib/index";
import { buildingDlcLabels, buildingTooltip } from "./building-labels";

describe("buildingTooltip", () => {
  it("returns the building name for a vanilla building", () => {
    expect(buildingTooltip({ name: "Tile" } as OniItem)).toBe("Tile");
  });

  it("identifies the source mod for a modded building", () => {
    expect(
      buildingTooltip({
        name: "Filtered Gas Pump",
        mod: "1887986467",
        modTitle: "Smart Pumps",
      } as OniItem),
    ).toBe("Filtered Gas Pump — from Smart Pumps (mod)");
  });

  it("names the required pack for a DLC building", () => {
    expect(
      buildingTooltip({
        name: "Rocket Platform",
        dlcIds: ["EXPANSION1_ID"],
      } as OniItem),
    ).toBe("Rocket Platform — requires Spaced Out!");
  });

  it("lists every pack when a building needs more than one", () => {
    expect(
      buildingTooltip({
        name: "Bionic Rocket Thing",
        dlcIds: ["EXPANSION1_ID", "DLC3_ID"],
      } as OniItem),
    ).toBe(
      "Bionic Rocket Thing — requires Spaced Out!, The Bionic Booster Pack",
    );
  });

  it("keeps the mod suffix ahead of the DLC suffix", () => {
    expect(
      buildingTooltip({
        name: "Thing",
        mod: "1",
        modTitle: "Mod",
        dlcIds: ["DLC2_ID"],
      } as OniItem),
    ).toBe("Thing — from Mod (mod) — requires The Frosty Planet Pack");
  });
});

describe("buildingDlcLabels", () => {
  it("is empty for a base-game building, so no marker renders", () => {
    expect(buildingDlcLabels({ dlcIds: [] } as any)).toEqual([]);
    expect(buildingDlcLabels({} as any)).toEqual([]);
  });

  it("maps raw Klei ids to pack names, falling back to the raw id", () => {
    expect(
      buildingDlcLabels({ dlcIds: ["DLC5_ID", "DLC9_ID"] } as any),
    ).toEqual(["The Aquatic Planet Pack", "DLC9_ID"]);
  });
});
