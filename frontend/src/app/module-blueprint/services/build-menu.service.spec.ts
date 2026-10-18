import { Subject } from "rxjs";
import {
  BlueprintHelpers,
  BlueprintItemElement,
  BuildMenuCategory,
  BuildMenuItem,
  OniItem,
} from "../../../../../lib/index";
import { ToolType } from "../common/tools/tool";
import { ShortcutAction } from "../keybindings/shortcut-actions";
import { BuildMenuService } from "./build-menu.service";
import { KeybindingService } from "./keybinding.service";
import { KeyboardShortcutService } from "./keyboard-shortcut.service";

const BASE = 1;
const PLUMBING = 2;
const ROCKETRY = 3;

const STRINGS: Record<string, string> = {
  "STRINGS.UI.BUILDCATEGORIES.BASE.TOOLTIP":
    "Maintain the colony's infrastructure with these homebase basics. {Hotkey}",
  "STRINGS.UI.NEWBUILDCATEGORIES.LADDERS.BUILDMENUTITLE": "Ladders",
  "STRINGS.UI.NEWBUILDCATEGORIES.TILES.BUILDMENUTITLE": "Tiles and Drywall",
  "STRINGS.UI.NEWBUILDCATEGORIES.PIPES.BUILDMENUTITLE": "Pipes",
  "STRINGS.UI.NEWBUILDCATEGORIES.PUMPS.BUILDMENUTITLE": "Pumps",
  "STRINGS.BUILDINGS.PREFABS.LIQUIDPUMP.EFFECT":
    "Draws in Liquid and runs it through Pipes.",
  "STRINGS.BUILDINGS.PREFABS.LIQUIDPUMP.DESC":
    "Piping a pump's output to a building's intake will send liquid to that building.",
  "STRINGS.MISC.TAGS.METAL": "Metal Ore",
  "STRINGS.MISC.TAGS.BUILDABLERAW": "Raw Mineral",
};

function oniItem(id: string, name: string, extra: Partial<OniItem> = {}) {
  return { id, name, iconUrl: `${id}.png`, dlcIds: [], ...extra } as OniItem;
}

const ITEMS = new Map<string, OniItem>(
  [
    oniItem("Ladder", "Ladder"),
    oniItem("Tile", "Tile"),
    oniItem("OddThing", "Odd Thing"),
    oniItem("FirePole", "Fire Pole"),
    oniItem("LiquidConduit", "Liquid Pipe"),
    oniItem("LiquidPump", "Liquid Pump"),
    oniItem("SteamEngineCluster", "Steam Engine"),
    oniItem("Gantry", "Gantry"),
  ].map((item) => [item.id, item]),
);

describe("BuildMenuService", () => {
  let service: BuildMenuService;
  let shortcuts: KeyboardShortcutService;
  let toolService: any;
  let rightClicked: Subject<ToolType>;

  beforeEach(() => {
    localStorage.clear();
    rightClicked = new Subject<ToolType>();
    toolService = {
      currentToolType: ToolType.select,
      changeTool: vi.fn((toolType: ToolType) => {
        toolService.currentToolType = toolType;
      }),
      buildTool: {
        changeItem: vi.fn(),
        templateItemToBuild: { oniItem: { id: "Tile" } },
      },
      rightClicked,
    };
    shortcuts = new KeyboardShortcutService(new KeybindingService());
    service = new BuildMenuService(
      toolService,
      { dict: STRINGS } as any,
      shortcuts,
    );

    vi.spyOn(OniItem, "getOniItem").mockImplementation((id: string) =>
      ITEMS.get(id)!,
    );
    BuildMenuCategory.init();
    BuildMenuCategory.load([
      { category: BASE, categoryName: "base", categoryIcon: "icon_base" },
      { category: PLUMBING, categoryName: "plumbing", categoryIcon: "icon_pl" },
      { category: ROCKETRY, categoryName: "rocketry", categoryIcon: "icon_r" },
    ] as BuildMenuCategory[]);
    // What fetchDatabase leaves on them: the game's display names.
    BuildMenuCategory.buildMenuCategories[0].categoryShowName = "Base";
    BuildMenuCategory.buildMenuCategories[1].categoryShowName = "Plumbing";
    BuildMenuCategory.buildMenuCategories[2].categoryShowName = "Rocketry";
    BuildMenuItem.init();
    BuildMenuItem.load([
      { category: BASE, buildingId: "Ladder", subcategory: "ladders" },
      { category: BASE, buildingId: "Tile", subcategory: "tiles" },
      { category: BASE, buildingId: "OddThing", subcategory: "uncategorized" },
      { category: BASE, buildingId: "FirePole", subcategory: "ladders" },
      { category: PLUMBING, buildingId: "LiquidConduit", subcategory: "pipes" },
      { category: PLUMBING, buildingId: "LiquidPump", subcategory: "pumps" },
      { category: ROCKETRY, buildingId: "Gantry", subcategory: "fittings" },
      {
        category: ROCKETRY,
        buildingId: "SteamEngineCluster",
        subcategory: "rocketmodules",
      },
    ] as BuildMenuItem[]);
    service.load();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const pressEscape = (target: EventTarget = document.createElement("div")) => {
    const event = new KeyboardEvent("keydown", {
      code: "Escape",
      cancelable: true,
    });
    Object.defineProperty(event, "target", { value: target });
    return shortcuts.handleKeyEvent(event);
  };

  describe("load", () => {
    it("lists the categories in the database's order, with the game's names", () => {
      expect(service.categories.map((c) => c.name)).toEqual([
        "Base",
        "Plumbing",
        "Rocketry",
      ]);
    });

    it("takes a category's description from the game's tooltip, minus the hotkey", () => {
      expect(service.categories[0].description).toBe(
        "Maintain the colony's infrastructure with these homebase basics.",
      );
    });

    it("gives each category its shortcut action", () => {
      expect(service.categories.map((c) => c.actionId)).toEqual([
        ShortcutAction.buildMenuBase,
        ShortcutAction.buildMenuPlumbing,
        ShortcutAction.buildMenuRocketry,
      ]);
    });

    it("groups a category under its subcategories, in game order, Other last", () => {
      const groups = service.categories[0].groups;
      expect(groups.map((g) => g.title)).toEqual([
        "Ladders",
        "Tiles and Drywall",
        "Other",
      ]);
      expect(groups[0].entries.map((e) => e.name)).toEqual([
        "Ladder",
        "Fire Pole",
      ]);
    });

    it("titles the rocket modules with the site's own heading", () => {
      expect(service.categories[2].groups.map((g) => g.title)).toEqual([
        "Fittings",
        "Rocket Modules",
      ]);
    });

    it("carries the game's effect line and description for the search", () => {
      const pump = service.categories[1].groups[1].entries[0];
      expect(pump.effect).toBe("Draws in Liquid and runs it through Pipes.");
      expect(pump.description).toContain("intake");
      expect(pump.categoryName).toBe("Plumbing");
    });
  });

  describe("opening and closing", () => {
    it("opens a category, and closes it when it is picked again", () => {
      service.toggleCategory(PLUMBING);
      expect(service.openCategory?.name).toBe("Plumbing");
      service.toggleCategory(PLUMBING);
      expect(service.isOpen).toBe(false);
    });

    it("switches straight to another category", () => {
      service.toggleCategory(BASE);
      service.toggleCategory(PLUMBING);
      expect(service.openCategoryId).toBe(PLUMBING);
    });

    it("leaves a search for the category that was picked, rather than closing", () => {
      service.toggleCategory(BASE);
      service.query = "pump";
      service.toggleCategory(BASE);
      expect(service.isOpen).toBe(true);
      expect(service.query).toBe("");
    });

    it("opens on a building's own category", () => {
      service.openForItem("LiquidPump");
      expect(service.openCategoryId).toBe(PLUMBING);
    });

    it("opens the first category for something that is in none", () => {
      service.openForItem("Element");
      expect(service.openCategoryId).toBe(BASE);
    });
  });

  describe("Escape", () => {
    let editorCancel: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      // The editor-wide Escape: leave the build tool, deselect, ...
      editorCancel = vi.fn();
      shortcuts.register(ShortcutAction.interfaceCancel, editorCancel);
    });

    it("closes the menu ahead of the editor's own Escape", () => {
      service.toggleCategory(BASE);
      expect(pressEscape()).toBe(true);
      expect(service.isOpen).toBe(false);
      expect(editorCancel).not.toHaveBeenCalled();
    });

    it("clears a search first, and closes on the next press", () => {
      service.toggleCategory(BASE);
      service.query = "pump";
      pressEscape();
      expect(service.query).toBe("");
      expect(service.isOpen).toBe(true);
      pressEscape();
      expect(service.isOpen).toBe(false);
    });

    it("hands Escape back to the editor once the menu is closed", () => {
      service.toggleCategory(BASE);
      service.close();
      pressEscape();
      expect(editorCancel).toHaveBeenCalledOnce();
    });

    it("stays out of the editor's way while the menu was never opened", () => {
      pressEscape();
      expect(editorCancel).toHaveBeenCalledOnce();
    });
  });

  describe("right-click", () => {
    it("closes the menu when there was no building in hand", () => {
      service.toggleCategory(BASE);
      rightClicked.next(ToolType.select);
      expect(service.isOpen).toBe(false);
    });

    // The build tool's own right-click drops the building (back to Select);
    // the menu stays for the next pick, as the game's does.
    it("keeps the menu open on the right-click that drops the building", () => {
      service.toggleCategory(BASE);
      rightClicked.next(ToolType.build);
      expect(service.isOpen).toBe(true);
    });

    it("leaves other tools' right-click alone", () => {
      service.toggleCategory(BASE);
      rightClicked.next(ToolType.dig);
      expect(service.isOpen).toBe(true);
    });
  });

  describe("picking", () => {
    it("switches to the build tool with a fresh instance, and stays open", () => {
      const instance = { id: "LiquidPump" } as any;
      vi.spyOn(BlueprintHelpers, "createInstance").mockReturnValue(instance);
      service.toggleCategory(PLUMBING);

      service.choose(service.categories[1].groups[1].entries[0]);

      expect(toolService.changeTool).toHaveBeenCalledWith(ToolType.build);
      expect(toolService.buildTool.changeItem).toHaveBeenCalledWith(instance);
      expect(service.isOpen).toBe(true);
    });

    it("does not re-enter the build tool when it is already active", () => {
      vi.spyOn(BlueprintHelpers, "createInstance").mockReturnValue({} as any);
      toolService.currentToolType = ToolType.build;

      service.choose(service.categories[0].groups[0].entries[0]);

      expect(toolService.changeTool).not.toHaveBeenCalled();
      expect(toolService.buildTool.changeItem).toHaveBeenCalled();
    });

    it("paints Water as the element brush", () => {
      const setElement = vi
        .spyOn(BlueprintItemElement.prototype, "setElement")
        .mockImplementation(() => {});

      service.paintElement();

      expect(setElement).toHaveBeenCalledWith("Water", 0);
      expect(toolService.changeTool).toHaveBeenCalledWith(ToolType.build);
      expect(toolService.buildTool.changeItem).toHaveBeenCalledWith(
        expect.any(BlueprintItemElement),
      );
    });

    it("knows which building the build tool holds", () => {
      expect(service.currentPrefabId).toBe("Tile");
    });
  });

  describe("search", () => {
    it("searches every category, not just the open one", () => {
      service.toggleCategory(BASE);
      service.query = "pump";
      expect(service.isSearching).toBe(true);
      expect(service.results.map((r) => r.entry.name)[0]).toBe("Liquid Pump");
    });

    it("focuses the search on request, opening the first category if none is", () => {
      const focused = vi.fn();
      service.focusSearchRequests.subscribe(focused);

      service.focusSearch();

      expect(service.openCategoryId).toBe(BASE);
      expect(focused).toHaveBeenCalledOnce();
    });

    it("keeps the open category when focusing the search", () => {
      service.toggleCategory(PLUMBING);
      service.focusSearch();
      expect(service.openCategoryId).toBe(PLUMBING);
    });
  });

  describe("view mode", () => {
    it("defaults to the grid", () => {
      expect(service.viewMode).toBe("grid");
    });

    it("remembers the choice for the next visit", () => {
      service.setViewMode("list");
      const next = new BuildMenuService(
        toolService,
        { dict: STRINGS } as any,
        shortcuts,
      );
      expect(next.viewMode).toBe("list");
    });
  });

  describe("materials", () => {
    it("names each material from the game's tags, with its mass", () => {
      expect(
        service.materials({
          materialCategory: ["Metal", "BuildableRaw&Metal"],
          materialMass: [400, 25],
        } as any),
      ).toEqual(["Metal Ore 400 Kg", "Raw Mineral / Metal Ore 25 Kg"]);
    });

    it("falls back to the raw tag", () => {
      expect(
        service.materials({
          materialCategory: ["Mystery"],
          materialMass: [5],
        } as any),
      ).toEqual(["Mystery 5 Kg"]);
    });
  });
});
