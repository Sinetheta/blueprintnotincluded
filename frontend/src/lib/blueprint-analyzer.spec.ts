import { describe, it, expect } from "vitest";
import db from "../assets/database/database-2024.json";
import {
  deriveModded,
  deriveBlueprintMods,
  deriveCategory,
  buildCategoryLookup,
  CATEGORIES,
  CategoryLookup,
  SIGNATURE_PREFABS,
  CategoryContext,
} from "../../../lib/index";

describe("deriveModded", () => {
  const knownIds = new Set(["WireRefinedHighWattage", "GasPipe", "LiquidPipe"]);
  const noMods = new Map<string, string>();

  it("returns false when all building IDs are known", () => {
    expect(
      deriveModded(["WireRefinedHighWattage", "GasPipe"], knownIds, noMods),
    ).toBe(false);
  });

  it("returns true when any building ID is unknown", () => {
    expect(
      deriveModded(
        ["WireRefinedHighWattage", "ModdedSuperFurnace"],
        knownIds,
        noMods,
      ),
    ).toBe(true);
  });

  it("returns false for an empty blueprint", () => {
    expect(deriveModded([], knownIds, noMods)).toBe(false);
  });

  it("returns true when a known-mod building is present and all ids are known", () => {
    const modByPrefabId = new Map([["PAirlockDoor", "2094698134"]]);
    const withModBuilding = new Set([...knownIds, "PAirlockDoor"]);
    expect(
      deriveModded(["GasPipe", "PAirlockDoor"], withModBuilding, modByPrefabId),
    ).toBe(true);
  });
});

describe("deriveBlueprintMods", () => {
  const modByPrefabId = new Map([
    ["PAirlockDoor", "2094698134"],
    ["PAirlockDoorInsulated", "2094698134"],
    ["Drain", "1866754178"],
  ]);

  it("returns [] for a vanilla-only blueprint", () => {
    expect(
      deriveBlueprintMods(["GasPipe", "LiquidPipe"], modByPrefabId),
    ).toEqual([]);
  });

  it("returns the sorted distinct mod ids for a mixed blueprint", () => {
    expect(
      deriveBlueprintMods(["GasPipe", "PAirlockDoor", "Drain"], modByPrefabId),
    ).toEqual(["1866754178", "2094698134"]);
  });

  it("collapses duplicate buildings from the same mod", () => {
    expect(
      deriveBlueprintMods(
        ["PAirlockDoor", "PAirlockDoor", "PAirlockDoorInsulated"],
        modByPrefabId,
      ),
    ).toEqual(["2094698134"]);
  });

  it("ignores ids unknown to the mod map", () => {
    expect(deriveBlueprintMods(["Unknown123"], modByPrefabId)).toEqual([]);
  });
});

describe("deriveCategory", () => {
  // Real database-2024.json — signature prefabs are verified against it below
  // so a future export rename shows up as a failing test, not a silent miss.
  const buildingIds = new Set<string>(db.buildings.map((b: any) => b.prefabId));
  const lookup: CategoryLookup = buildCategoryLookup(
    db.buildMenuCategories,
    db.buildMenuItems,
  );

  // Fixture: one signature building per category that has a signature entry,
  // two fallback-game-category buildings for the categories that don't
  // (automation, decor — "fallback only" per the spec), and the context
  // signal for the two categories no building can name (tamer, boiler).
  const FIXTURE_BY_CATEGORY: Record<
    (typeof CATEGORIES)[number],
    { prefabIds: string[]; context?: CategoryContext }
  > = {
    oxygenGen: { prefabIds: ["Electrolyzer"] },
    power: { prefabIds: ["Generator"] },
    // A tamer is a cooling loop on a geyser: the annotation is the signal.
    tamer: {
      prefabIds: ["AirConditioner"],
      context: { terrainFeatureIds: ["GeyserGeneric_steam"] },
    },
    // No boiler prefab exists; the title carries it.
    boiler: {
      prefabIds: ["MetalTile", "AirConditioner"],
      context: { title: "Petroleum boiler" },
    },
    water: { prefabIds: ["WaterPurifier"] },
    storage: { prefabIds: ["LiquidReservoir", "GasReservoir"] },
    cooling: { prefabIds: ["AirConditioner"] },
    food: { prefabIds: ["CookingStation"] },
    ranching: { prefabIds: ["RanchStation"] },
    automation: { prefabIds: ["LogicSwitch", "LogicDuplicantSensor"] },
    transit: { prefabIds: ["TravelTube"] },
    refining: { prefabIds: ["MetalRefinery"] },
    rooms: { prefabIds: ["Bed"] },
    decor: { prefabIds: ["FloorLamp", "CeilingLight"] },
    // The station outranks every function vote: a cabin with beds is a rocket.
    rocketInterior: {
      prefabIds: ["RocketControlStation", "Bed", "LuxuryBed"],
    },
  };

  it("the rocket control station is a real prefab", () => {
    expect(buildingIds.has("RocketControlStation")).toBe(true);
  });

  it("every signature prefab in the analyzer's table exists in the real database", () => {
    // Covers the full SIGNATURE_PREFABS table (not just the fixture below) so
    // a mistyped or renamed prefab id in a future export fails loudly here
    // instead of silently dropping out of category scoring.
    for (const id of Object.keys(SIGNATURE_PREFABS)) {
      expect(buildingIds.has(id), `${id} missing from database-2024.json`).toBe(
        true,
      );
    }
  });

  for (const category of CATEGORIES) {
    it(`derives ${category} from its representative fixture`, () => {
      const fixture = FIXTURE_BY_CATEGORY[category];
      expect(deriveCategory(fixture.prefabIds, lookup, fixture.context)).toBe(
        category,
      );
    });
  }

  it("signature beats the fallback game-category vote", () => {
    // Pipes carry no functional signal (plumbing isn't fallback-mapped);
    // a single AirConditioner is the only real signal, and it's cooling
    // even though the game files it under "utilities".
    const prefabIds = ["GasPipe", "LiquidPipe", "GasPipe", "AirConditioner"];
    expect(deriveCategory(prefabIds, lookup)).toBe("cooling");
  });

  it("dedupes repeated prefabs instead of inflating the score", () => {
    const many = Array(4).fill("Electrolyzer");
    const once = ["Electrolyzer"];
    expect(deriveCategory(many, lookup)).toBe(deriveCategory(once, lookup));
    expect(deriveCategory(many, lookup)).toBe("oxygenGen");
  });

  it("returns null for a tile/pipe-only blueprint with no signal", () => {
    expect(
      deriveCategory(["Tile", "GasPipe", "LiquidPipe"], lookup),
    ).toBeNull();
  });

  it("returns null for an empty blueprint", () => {
    expect(deriveCategory([], lookup)).toBeNull();
  });

  it("a single weak fallback vote alone is not enough to tag a blueprint", () => {
    // LogicSwitch alone is one automation fallback vote (weight 1) — below
    // the MIN_CATEGORY_SCORE threshold on its own.
    expect(deriveCategory(["LogicSwitch", "Tile"], lookup)).toBeNull();
  });

  const MANY_LOGIC_PREFABS = [
    "LogicSwitch",
    "LogicGateAND",
    "LogicGateOR",
    "LogicGateNOT",
    "LogicRibbon",
    "LogicTimerSensor",
    "LogicDuplicantSensor",
    "LogicTemperatureSensor",
  ];

  it("incidental automation cannot out-vote a signature building", () => {
    // Fallback votes are 1 per unique prefab and used to accumulate without
    // limit, so eight distinct logic pieces scored 8 and beat the generator's
    // signature 3 — which is why automation and transit were the two largest
    // categories on the live corpus. The cap makes a real appliance win.
    expect(
      deriveCategory([...MANY_LOGIC_PREFABS, "PetroleumGenerator"], lookup),
    ).toBe("power");
  });

  it("still tags a genuinely fallback-only blueprint", () => {
    // The cap must not make fallback-only categories underivable: with no
    // signature building anywhere, the capped automation score still clears
    // MIN_CATEGORY_SCORE.
    expect(deriveCategory(MANY_LOGIC_PREFABS, lookup)).toBe("automation");
  });

  it("caps fallback per category rather than globally", () => {
    // Conveyance (transit) and automation each cap independently, so a build
    // that is mostly logic with a couple of tubes still reads as automation
    // via its own capped score, not as a tie broken by category order.
    const prefabIds = [...MANY_LOGIC_PREFABS, "Ladder"];
    expect(deriveCategory(prefabIds, lookup)).toBe("automation");
  });

  describe("conveyor logistics is support, not purpose", () => {
    // The auto-sweeper and conveyor rail feed whatever build they're attached
    // to, so they must not decide the category. Before this, transit was the
    // largest bucket on the site and contained paku farms, boilers, ranches
    // and geyser tamers.
    const LOGISTICS = ["SolidTransferArm", "SolidConduit", "SolidConduitInbox"];

    it("a swept ranch is ranching", () => {
      expect(deriveCategory([...LOGISTICS, "RanchStation"], lookup)).toBe(
        "ranching",
      );
    });

    it("a swept steam turbine build is cooling", () => {
      expect(deriveCategory([...LOGISTICS, "SteamTurbine2"], lookup)).toBe(
        "cooling",
      );
    });

    it("a swept refinery is refining", () => {
      expect(deriveCategory([...LOGISTICS, "MetalRefinery"], lookup)).toBe(
        "refining",
      );
    });

    it("still tags a blueprint that is nothing but logistics", () => {
      // The conveyance fallback survives at the capped 2, so a pure rail
      // network is transit — it just can't outrank an appliance any more.
      expect(deriveCategory(LOGISTICS, lookup)).toBe("transit");
    });

    it("keeps duplicant transit as a strong signal", () => {
      // Travel tubes are the build's purpose, not plumbing for someone else's,
      // so a tube network outranks an appliance outright rather than winning a
      // tie on CATEGORIES order.
      expect(
        deriveCategory(
          ["TravelTube", "TravelTubeEntrance", "MetalRefinery"],
          lookup,
        ),
      ).toBe("transit");
    });
  });

  it("ranching signature overrides the game's food-tab placement", () => {
    // EggIncubator/FishFeeder/etc. are filed under the game's "food" build
    // tab but are unambiguously ranching buildings in blueprint terms.
    expect(deriveCategory(["EggIncubator"], lookup)).toBe("ranching");
  });

  it("game category with no fallback mapping contributes nothing", () => {
    // Ladder/Tile are "base"; RanchStation is equipment in-game but has a
    // signature entry — the base-category building shouldn't sway the vote.
    expect(deriveCategory(["Ladder", "RanchStation"], lookup)).toBe("ranching");
  });
});
