import { describe, it, expect } from "vitest";
import {
  BuildMenuEntry,
  UNCATEGORIZED_SUBCATEGORY,
  editDistanceWithin,
  groupBySubcategory,
  prepareSearch,
  searchBuildMenu,
} from "./build-menu-model";

let order = 0;
function entry(overrides: Partial<BuildMenuEntry>): BuildMenuEntry {
  return {
    prefabId: "Thing",
    name: "Thing",
    effect: "",
    description: "",
    categoryId: 1,
    categoryName: "Base",
    subcategory: "misc",
    subcategoryTitle: "Misc",
    order: order++,
    ...overrides,
  };
}

// A slice of the real menu, with the real wording where it matters: what the
// ranking has to get right is which of these a query puts first.
const PLUMBING = { categoryId: 5, categoryName: "Plumbing" };
const VENTILATION = { categoryId: 6, categoryName: "Ventilation" };
const MENU: BuildMenuEntry[] = [
  entry({
    prefabId: "Tile",
    name: "Tile",
    effect: "Used to build the walls and floors of rooms.",
    subcategory: "tiles",
    subcategoryTitle: "Tiles and Drywall",
  }),
  entry({
    prefabId: "ExteriorWall",
    name: "Drywall",
    effect: "Prevents Gas and Liquid from escaping into space.",
    subcategory: "tiles",
    subcategoryTitle: "Tiles and Drywall",
  }),
  entry({
    prefabId: "LogicTimerSensor",
    name: "Timer Sensor",
    effect: "Sends a signal on a timer.",
    subcategory: "sensors",
    subcategoryTitle: "Sensors",
  }),
  entry({
    ...PLUMBING,
    prefabId: "LiquidPumpingStation",
    name: "Pitcher Pump",
    effect: "Manually pumps Liquid into bottles.",
    subcategory: "pumps",
    subcategoryTitle: "Pumps",
  }),
  entry({
    ...PLUMBING,
    prefabId: "LiquidPump",
    name: "Liquid Pump",
    effect: "Draws in Liquid and runs it through Pipes.",
    description:
      "Piping a pump's output to a building's intake will send liquid to that building.",
    subcategory: "pumps",
    subcategoryTitle: "Pumps",
  }),
  entry({
    ...PLUMBING,
    prefabId: "LiquidMiniPump",
    name: "Mini Liquid Pump",
    effect: "Draws in a small amount of Liquid.",
    subcategory: "pumps",
    subcategoryTitle: "Pumps",
  }),
  entry({
    ...PLUMBING,
    prefabId: "LiquidVent",
    name: "Liquid Vent",
    effect: "Releases Liquid from Pipes.",
    description: "Vents are an exit point for liquids from plumbing systems.",
    subcategory: "pipes",
    subcategoryTitle: "Pipes",
  }),
  entry({
    ...PLUMBING,
    prefabId: "BottleEmptier",
    name: "Bottle Emptier",
    effect: "Unloads bottles onto the floor.",
    description:
      "A bottle emptier does the opposite of pumping a liquid into a bottle.",
    subcategory: "valves",
    subcategoryTitle: "Valves",
  }),
  entry({
    ...PLUMBING,
    prefabId: "PeterHan_FilteredLiquidPump",
    name: "Filtered Liquid Pump",
    subcategory: "pumps",
    subcategoryTitle: "Pumps",
  }),
  entry({
    ...VENTILATION,
    prefabId: "GasPump",
    name: "Gas Pump",
    effect: "Draws in Gas and runs it through Gas Pipes.",
    subcategory: "pumps",
    subcategoryTitle: "Pumps",
  }),
  entry({
    ...VENTILATION,
    prefabId: "GasMiniPump",
    name: "Mini Gas Pump",
    effect: "Draws in a small amount of Gas.",
    subcategory: "pumps",
    subcategoryTitle: "Pumps",
  }),
  entry({
    ...VENTILATION,
    prefabId: "GasVent",
    name: "Gas Vent",
    effect: "Releases Gas from Gas Pipes.",
    description:
      "Vents are an exit point for gases. A pump will push gas here.",
    subcategory: "pipes",
    subcategoryTitle: "Pipes",
  }),
  entry({
    prefabId: "Refrigerator",
    name: "Refrigerator",
    effect: "Stores food at an ideal temperature.",
    description: "Food spoils slower in the colony's coolest spots.",
    subcategory: "storage",
    subcategoryTitle: "Storage",
  }),
  entry({
    prefabId: "OxygenDiffuser",
    name: "Oxygen Diffuser",
    effect: "Converts Algae into Oxygen.",
    subcategory: "producers",
    subcategoryTitle: "Producers",
  }),
];

const INDEX = prepareSearch(MENU);
const search = (query: string) =>
  searchBuildMenu(INDEX, query).map((result) => result.entry.name);

describe("groupBySubcategory", () => {
  it("orders the groups by where each subcategory first appears", () => {
    const groups = groupBySubcategory([
      entry({ name: "Ladder", subcategory: "ladders" }),
      entry({ name: "Tile", subcategory: "tiles" }),
      entry({ name: "Fire Pole", subcategory: "ladders" }),
      entry({ name: "Door", subcategory: "doors" }),
      entry({ name: "Mesh Tile", subcategory: "tiles" }),
    ]);
    expect(groups.map((group) => group.subcategory)).toEqual([
      "ladders",
      "tiles",
      "doors",
    ]);
    // ... and keeps each group's entries in menu order.
    expect(groups[0].entries.map((e) => e.name)).toEqual([
      "Ladder",
      "Fire Pole",
    ]);
    expect(groups[1].entries.map((e) => e.name)).toEqual(["Tile", "Mesh Tile"]);
  });

  it("puts uncategorized last, wherever it first appears", () => {
    const groups = groupBySubcategory([
      entry({ name: "Odd One", subcategory: UNCATEGORIZED_SUBCATEGORY }),
      entry({ name: "Ladder", subcategory: "ladders" }),
      entry({ name: "Old Data", subcategory: "" }),
      entry({ name: "Tile", subcategory: "tiles" }),
    ]);
    expect(groups.map((group) => group.subcategory)).toEqual([
      "ladders",
      "tiles",
      UNCATEGORIZED_SUBCATEGORY,
    ]);
    // A database written before subcategories joins the same group.
    expect(groups[2].entries.map((e) => e.name)).toEqual([
      "Odd One",
      "Old Data",
    ]);
  });

  it("keys a group by category and subcategory", () => {
    const keys = groupBySubcategory([
      entry({ categoryId: 5, subcategory: "pipes" }),
      entry({ categoryId: 6, subcategory: "pipes" }),
    ]).map((group) => group.key);
    expect(keys).toEqual(["5:pipes", "6:pipes"]);
  });

  it("titles a group from its entries", () => {
    const [group] = groupBySubcategory([
      entry({ subcategory: "tiles", subcategoryTitle: "Tiles and Drywall" }),
    ]);
    expect(group.title).toBe("Tiles and Drywall");
  });
});

describe("searchBuildMenu", () => {
  it("finds nothing for an empty or blank query", () => {
    expect(search("")).toEqual([]);
    expect(search("   ")).toEqual([]);
    expect(search("-")).toEqual([]);
  });

  it("lists the pumps first for 'pump', not everything that mentions pumping", () => {
    const results = search("pump");
    const pumps = [
      "Pitcher Pump",
      "Liquid Pump",
      "Mini Liquid Pump",
      "Filtered Liquid Pump",
      "Gas Pump",
      "Mini Gas Pump",
    ];
    expect(results.slice(0, pumps.length)).toEqual(pumps);
    // The Gas Vent says "pump" only in its description and the Bottle Emptier
    // only "pumping" there: both still show, after every pump.
    expect(results.indexOf("Gas Vent")).toBeGreaterThan(pumps.length - 1);
    expect(results.indexOf("Bottle Emptier")).toBeGreaterThan(pumps.length - 1);
  });

  it("ranks a description-only match below every name match", () => {
    const ranked = searchBuildMenu(INDEX, "vent");
    const names = ranked.map((result) => result.entry.name);
    expect(names.slice(0, 2)).toEqual(["Liquid Vent", "Gas Vent"]);
    // Drywall mentions neither vents nor venting; nothing else should either.
    expect(names).not.toContain("Drywall");
  });

  it("puts a description-only match after a name match even when it comes first in the menu", () => {
    const index = prepareSearch([
      entry({
        name: "Cot",
        description: "A place for a sick duplicant to rest.",
      }),
      entry({ name: "Sick Bay" }),
    ]);
    expect(searchBuildMenu(index, "sick").map((r) => r.entry.name)).toEqual([
      "Sick Bay",
      "Cot",
    ]);
  });

  it("ranks name words, then name substrings, then the subcategory, then the effect", () => {
    const index = prepareSearch([
      entry({ name: "Effect Only", effect: "Moves ore along a rail." }),
      entry({ name: "Subcategory Only", subcategoryTitle: "Ore Handling" }),
      entry({ name: "Store Bin" }),
      entry({ name: "Ore Scrubber" }),
    ]);
    expect(searchBuildMenu(index, "ore").map((r) => r.entry.name)).toEqual([
      "Ore Scrubber",
      "Store Bin",
      "Subcategory Only",
      "Effect Only",
    ]);
  });

  it("matches the start of a word as the user types", () => {
    expect(search("refri")).toEqual(["Refrigerator"]);
    expect(search("diff")[0]).toBe("Oxygen Diffuser");
  });

  it("forgives a typo in the name", () => {
    expect(search("pupm").slice(0, 3)).toEqual([
      "Pitcher Pump",
      "Liquid Pump",
      "Mini Liquid Pump",
    ]);
    expect(search("refrigarator")).toEqual(["Refrigerator"]);
  });

  it("ranks a typo below a real match, so it never buries one", () => {
    // "tile" is one edit from "time(r)", so Timer Sensor matches, but after
    // the Tile and after everything in Tiles and Drywall.
    expect(search("tile")).toEqual(["Tile", "Drywall", "Timer Sensor"]);
  });

  it("does not guess at short words", () => {
    // Three letters is too short for a typo: "pmp" finds nothing.
    expect(search("pmp")).toEqual([]);
  });

  it("does not search prose with a one- or two-letter word", () => {
    // "co" would otherwise find "colony's" in the Refrigerator's description.
    expect(search("co")).toEqual([]);
  });

  it("needs every word to match, and ranks the closest name first", () => {
    expect(search("liquid pump").slice(0, 3)).toEqual([
      "Liquid Pump",
      "Mini Liquid Pump",
      "Filtered Liquid Pump",
    ]);
    expect(search("liquid pump")).not.toContain("Gas Pump");
  });

  it("puts an exact name ahead of names that contain it", () => {
    expect(search("gas pump").slice(0, 2)).toEqual([
      "Gas Pump",
      "Mini Gas Pump",
    ]);
  });

  it("finds a plural", () => {
    expect(search("pumps")[0]).toBe("Pitcher Pump");
  });

  it("matches the prefab id, below the name", () => {
    expect(search("peter")).toEqual(["Filtered Liquid Pump"]);
    // A pasted id finds itself.
    expect(search("PeterHan_FilteredLiquidPump")).toEqual([
      "Filtered Liquid Pump",
    ]);
    // Pitcher Pump is LiquidPumpingStation.
    expect(search("liquidpump")).toEqual([
      "Pitcher Pump",
      "Liquid Pump",
      "Filtered Liquid Pump",
    ]);
    // "ExteriorWall" is Drywall's id; its own name and effect don't say so.
    expect(search("exterior")).toEqual(["Drywall"]);
  });

  it("ignores case and accents", () => {
    expect(search("OXYGEN")[0]).toBe("Oxygen Diffuser");
    expect(search("Oxygén")[0]).toBe("Oxygen Diffuser");
  });

  it("keeps the menu's order between equal matches", () => {
    const results = searchBuildMenu(INDEX, "gas");
    const tied = results.filter((r) => r.score == results[0].score);
    const orders = tied.map((r) => r.entry.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe("editDistanceWithin", () => {
  it.each([
    ["pump", "pump", 0, true],
    ["pupm", "pump", 1, true],
    ["pmup", "pump", 1, true],
    ["mupp", "pump", 1, false],
    ["pump", "plump", 1, true],
    ["pump", "pum", 1, true],
    ["pump", "lamp", 1, false],
    ["refrigarator", "refrigerator", 1, true],
    ["", "ab", 1, false],
  ])("%s vs %s within %i: %s", (a, b, limit, expected) => {
    expect(editDistanceWithin(a, b, limit)).toBe(expected);
  });
});
