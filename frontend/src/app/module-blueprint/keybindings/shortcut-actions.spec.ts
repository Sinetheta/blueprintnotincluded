import { parseChord, serializeChord } from "./key-chord";
import {
  SHORTCUT_ACTIONS,
  SHORTCUT_CATEGORIES,
  ShortcutAction,
  buildMenuCategoryAction,
  getShortcutAction,
  getShortcutActionsByCategory,
  isShortcutActionId,
} from "./shortcut-actions";

describe("shortcut action catalogue", () => {
  it("has a unique id per action", () => {
    const ids = SHORTCUT_ACTIONS.map((action) => action.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exposes every id through the ShortcutAction map", () => {
    const declared = new Set(Object.values(ShortcutAction));
    for (const action of SHORTCUT_ACTIONS)
      expect(declared.has(action.id)).toBe(true);
    expect(declared.size).toBe(SHORTCUT_ACTIONS.length);
  });

  it("puts every action in a known category", () => {
    const categories = new Set(SHORTCUT_CATEGORIES.map((c) => c.id));
    for (const action of SHORTCUT_ACTIONS)
      expect(categories.has(action.category)).toBe(true);
  });

  it("gives every action a label", () => {
    for (const action of SHORTCUT_ACTIONS)
      expect(action.label.length).toBeGreaterThan(0);
  });

  // A default that doesn't parse would silently vanish on first load.
  it("only ships default chords that round trip", () => {
    for (const action of SHORTCUT_ACTIONS)
      for (const serialized of action.defaults) {
        const chord = parseChord(serialized);
        expect(chord, `${action.id} default "${serialized}"`).not.toBeNull();
        expect(serializeChord(chord!)).toBe(serialized);
      }
  });

  // Two actions on one key means one of them is unreachable by default.
  it("has no duplicate default bindings", () => {
    const owners = new Map<string, string>();
    for (const action of SHORTCUT_ACTIONS)
      for (const chord of action.defaults) {
        expect(
          owners.get(chord),
          `${chord} is bound to both ${owners.get(chord)} and ${action.id}`,
        ).toBeUndefined();
        owners.set(chord, action.id);
      }
  });

  describe("lookup helpers", () => {
    it("finds an action by id", () => {
      expect(getShortcutAction(ShortcutAction.editUndo)?.category).toBe("edit");
    });

    it("returns undefined for an unknown id", () => {
      expect(getShortcutAction("nope" as never)).toBeUndefined();
    });

    it("narrows known ids", () => {
      expect(isShortcutActionId("edit.undo")).toBe(true);
      expect(isShortcutActionId("edit.nonsense")).toBe(false);
    });

    it("groups actions by category", () => {
      const camera = getShortcutActionsByCategory("camera");
      expect(camera.length).toBeGreaterThan(0);
      expect(camera.every((action) => action.category == "camera")).toBe(true);
    });
  });

  describe("game defaults", () => {
    // The ONI bindings this feature is meant to mirror.
    it.each([
      [ShortcutAction.cameraPanUp, "KeyW"],
      [ShortcutAction.cameraPanDown, "KeyS"],
      [ShortcutAction.cameraPanLeft, "KeyA"],
      [ShortcutAction.cameraPanRight, "KeyD"],
      [ShortcutAction.cameraHome, "KeyH"],
      [ShortcutAction.buildRotate, "KeyO"],
      [ShortcutAction.toolBuild, "KeyB"],
      [ShortcutAction.toolDig, "KeyG"],
    ])("binds %s to the game's %s", (actionId, code) => {
      expect(getShortcutAction(actionId)?.defaults).toContain(code);
    });
  });

  describe("build menu", () => {
    // The database's categoryName values, in the database's (the game's) order.
    const CATEGORIES = [
      "base",
      "oxygen",
      "power",
      "food",
      "plumbing",
      "hvac",
      "refining",
      "medical",
      "furniture",
      "equipment",
      "utilities",
      "automation",
      "conveyance",
      "rocketry",
      "hep",
    ];
    const defaultsOf = (categoryName: string) =>
      getShortcutAction(buildMenuCategoryAction(categoryName)!)!.defaults;

    it("has an action for every category, in the build menu group", () => {
      for (const name of CATEGORIES) {
        const actionId = buildMenuCategoryAction(name);
        expect(actionId, name).toBeDefined();
        expect(getShortcutAction(actionId!)?.category).toBe("buildMenu");
      }
    });

    it("finds a category's action whatever the case of its name", () => {
      expect(buildMenuCategoryAction("HVAC")).toBe(
        ShortcutAction.buildMenuVentilation,
      );
    });

    it("has no action for a category it doesn't know, nor for search", () => {
      expect(buildMenuCategoryAction("moddedcategory")).toBeUndefined();
      expect(buildMenuCategoryAction("search")).toBeUndefined();
    });

    it("binds the first ten categories to the number row, as the game does", () => {
      const numberRow = [
        "Digit1",
        "Digit2",
        "Digit3",
        "Digit4",
        "Digit5",
        "Digit6",
        "Digit7",
        "Digit8",
        "Digit9",
        "Digit0",
      ];
      expect(CATEGORIES.slice(0, 10).map(defaultsOf)).toEqual(
        numberRow.map((code) => [code]),
      );
    });

    // The game's - and = are this site's zoom keys.
    it("ships the 11th and 12th categories unbound", () => {
      expect(defaultsOf("utilities")).toEqual([]);
      expect(defaultsOf("automation")).toEqual([]);
      expect(
        getShortcutAction(ShortcutAction.cameraZoomOut)?.defaults,
      ).toContain("Minus");
      expect(
        getShortcutAction(ShortcutAction.cameraZoomIn)?.defaults,
      ).toContain("Equal");
    });

    it("gives the last three the game's shifted keys", () => {
      expect(defaultsOf("conveyance")).toEqual(["Shift+Minus"]);
      expect(defaultsOf("rocketry")).toEqual(["Shift+Equal"]);
      expect(defaultsOf("hep")).toEqual(["Shift+Backspace"]);
    });

    it("focuses the search on Ctrl+F, as the game does", () => {
      expect(
        getShortcutAction(ShortcutAction.buildMenuSearch)?.defaults,
      ).toEqual(["Ctrl+KeyF", "Meta+KeyF"]);
    });
  });

  // Regression: these were bound to bare N and X, so one stray keystroke put
  // the editor into a tool that edits on a single click. That reads as "the
  // select tool is broken" while quietly painting on the blueprint.
  describe("tools that edit on click", () => {
    it.each([
      [ShortcutAction.toolPlanning],
      [ShortcutAction.toolScissors],
      [ShortcutAction.toolNotes],
    ])("ships %s unbound, since the game has no equivalent key", (actionId) => {
      expect(getShortcutAction(actionId)?.defaults).toEqual([]);
    });
  });
});
