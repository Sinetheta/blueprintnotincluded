import { SelectTool } from "./select-tool";
import { CameraService, Vector2 } from "../../../../../../lib/index";
import { ShortcutAction } from "../../keybindings/shortcut-actions";

const makeOniItem = (id: string, isElement = false) => ({
  id,
  isElement,
  buildableElementsArray: [],
  zIndex: 0,
  utilityConnections: [],
});

const makeBlueprintItem = (oniItem: any, position = new Vector2(0, 0)) => ({
  oniItem,
  buildableElements: [{ id: "elem1" }],
  depth: 0,
  position,
  selected: false,
  temperature: 293,
});

const makeMockCollection = (selected = false, items: any[] = []) => ({
  selected,
  items,
  oniItem: makeOniItem("test"),
  destroyAll: vi.fn(),
});

describe("SelectTool", () => {
  let tool: SelectTool;
  let mockBlueprintService: any;
  let mockDrawPixi: any;
  let mockCamera: any;

  beforeEach(() => {
    Object.defineProperty(CameraService, "cameraService", {
      get: () => ({ resetSinWave: vi.fn(), setOverlayForItem: vi.fn() }),
      configurable: true,
    });

    mockBlueprintService = {
      blueprint: {
        getBlueprintItemsAt: vi.fn(() => []),
        blueprintItems: [],
        pauseChangeEvents: vi.fn(),
        resumeChangeEvents: vi.fn(),
        destroyBlueprintItem: vi.fn(),
      },
    };
    const dimensionsTextSprite: any = {
      text: "",
      anchor: { set: vi.fn() },
      position: { x: 0, y: 0 },
      visible: false,
    };
    mockDrawPixi = {
      drawTileRectangle: vi.fn(),
      getNewText: vi.fn().mockReturnValue(dimensionsTextSprite),
      pixiApp: { stage: { addChild: vi.fn() } },
    };
    mockCamera = {
      cameraOffset: { x: 0, y: 0 },
      currentZoom: 32,
    };
    tool = new SelectTool(mockBlueprintService as any);
  });

  describe("deselectAll()", () => {
    it("clears sameItemCollections", () => {
      tool.sameItemCollections = [makeMockCollection()] as any;
      tool.deselectAll();
      expect(tool.sameItemCollections).toHaveLength(0);
    });

    it("sets selected = false on each collection", () => {
      const col = makeMockCollection(true);
      tool.sameItemCollections = [col] as any;
      tool.deselectAll();
      expect(col.selected).toBe(false);
    });

    it("emits selectionChanged", () => {
      const obs = { selectionChanged: vi.fn() };
      tool.subscribeSelectionChanged(obs);
      tool.deselectAll();
      expect(obs.selectionChanged).toHaveBeenCalledTimes(1);
    });
  });

  describe("selectionElement", () => {
    const element = { id: "Cobaltite" } as any;

    it("remembers the element a selectEveryElement selection was gathered by", () => {
      const oniItem = makeOniItem("Wire");
      mockBlueprintService.blueprint.blueprintItems = [
        { ...makeBlueprintItem(oniItem), buildableElements: [element] },
      ];
      tool.selectEveryElement(element);
      expect(tool.selectionElement).toBe(element);
    });

    it("is cleared when the selection is cleared or rebuilt another way", () => {
      tool.selectionElement = element;
      tool.deselectAll();
      expect(tool.selectionElement).toBeNull();

      tool.selectionElement = element;
      tool.selectAll(makeOniItem("Wire") as any);
      expect(tool.selectionElement).toBeNull();
    });
  });

  describe("selectedItems getter", () => {
    it("flattens every group's items in group order", () => {
      const a = makeBlueprintItem(makeOniItem("a"));
      const b = makeBlueprintItem(makeOniItem("b"));
      const c = makeBlueprintItem(makeOniItem("c"));
      tool.sameItemCollections = [
        makeMockCollection(false, [a, b]),
        makeMockCollection(false, [c]),
      ] as any;
      expect(tool.selectedItems).toEqual([a, b, c]);
    });
  });

  // "Replace every X with Y" over the whole selection.
  describe("replaceElement()", () => {
    const cobalt = { id: "Cobaltite", name: "Cobalt Ore" } as any;
    const copper = { id: "Cuprite", name: "Copper Ore" } as any;
    const sandstone = { id: "SandStone", name: "Sandstone" } as any;
    let wireType: any;
    let pipeType: any;
    let wire: any;
    let pipe: any;
    let stonePipe: any;

    const realItem = (oniItem: any, element: any) => {
      const item: any = {
        ...makeBlueprintItem(oniItem),
        buildableElements: [element],
      };
      item.setElement = vi.fn((id: string, index: number) => {
        item.buildableElements[index] = [cobalt, copper, sandstone].find(
          (e) => e.id == id,
        );
      });
      return item;
    };

    beforeEach(() => {
      wireType = {
        ...makeOniItem("Wire"),
        buildableElementsArray: [[cobalt, copper]],
      };
      pipeType = {
        ...makeOniItem("LiquidConduit"),
        buildableElementsArray: [[cobalt, copper, sandstone]],
      };
      wire = realItem(wireType, cobalt);
      pipe = realItem(pipeType, cobalt);
      stonePipe = realItem(pipeType, sandstone);
      mockBlueprintService.blueprint.blueprintItems = [wire, pipe, stonePipe];
      tool.selectAll(wireType);
      tool.addToCollection(pipe);
      tool.addToCollection(stonePipe);
    });

    it("swaps X for Y across every group inside one paused change batch", () => {
      const blueprint = mockBlueprintService.blueprint;
      const order: string[] = [];
      blueprint.pauseChangeEvents.mockImplementation(() => order.push("pause"));
      wire.setElement.mockImplementation(() => order.push("write"));
      pipe.setElement.mockImplementation(() => order.push("write"));
      blueprint.resumeChangeEvents.mockImplementation(() =>
        order.push("resume"),
      );

      const plan = tool.replaceElement(cobalt, copper);

      expect(plan.changes.map((c) => c.item)).toEqual([wire, pipe]);
      expect(plan.skipped).toEqual([]);
      expect(order).toEqual(["pause", "write", "write", "resume"]);
      expect(blueprint.resumeChangeEvents).toHaveBeenCalledWith(true);
      expect(stonePipe.setElement).not.toHaveBeenCalled();
    });

    it("re-collects the same items so group counts follow the new materials", () => {
      const collections = tool.sameItemCollections;
      expect(collections[1].nbElements[0]).toBe(2); // cobalt + sandstone pipes

      tool.replaceElement(cobalt, sandstone);

      expect(tool.sameItemCollections).not.toBe(collections);
      expect(tool.selectedItems).toEqual([wire, pipe, stonePipe]);
      // Wire cannot be made of Sandstone: untouched, so its group still reads cobalt.
      expect(tool.sameItemCollections[0].items[0].buildableElements[0]).toBe(
        cobalt,
      );
      expect(tool.sameItemCollections[1].nbElements[0]).toBe(1);
    });

    it("keeps the active group and the seed element, and notifies observers", () => {
      const obs = { selectionChanged: vi.fn() };
      tool.subscribeSelectionChanged(obs);
      tool.currentMultipleSelectionIndex = 1;
      tool.selectionElement = cobalt;

      tool.replaceElement(cobalt, copper);

      expect(tool.currentMultipleSelectionIndex).toBe(1);
      expect(tool.selectionElement).toBe(cobalt);
      expect(obs.selectionChanged).toHaveBeenCalled();
    });
  });

  // The canvas reads this to keep the building selection and the terrain
  // annotation selection mutually exclusive, so that "Delete" is never
  // ambiguous about which of the two it means.
  describe("hasSelection getter", () => {
    it("is false with nothing selected", () => {
      tool.sameItemCollections = [] as any;
      expect(tool.hasSelection).toBe(false);
    });

    it("is true once something is selected", () => {
      tool.sameItemCollections = [makeMockCollection()] as any;
      expect(tool.hasSelection).toBe(true);
    });

    it("is false again after deselectAll", () => {
      tool.sameItemCollections = [makeMockCollection()] as any;
      tool.deselectAll();
      expect(tool.hasSelection).toBe(false);
    });
  });

  describe("currentMultipleSelectionIndex getter/setter", () => {
    it("returns -1 when no collection is selected", () => {
      tool.sameItemCollections = [
        makeMockCollection(false),
        makeMockCollection(false),
      ] as any;
      expect(tool.currentMultipleSelectionIndex).toBe(-1);
    });

    it("returns the index of the selected collection", () => {
      tool.sameItemCollections = [
        makeMockCollection(false),
        makeMockCollection(true),
      ] as any;
      expect(tool.currentMultipleSelectionIndex).toBe(1);
    });

    it("setter selects the collection at the given index", () => {
      const col0 = makeMockCollection(false);
      const col1 = makeMockCollection(false);
      const col2 = makeMockCollection(false);
      tool.sameItemCollections = [col0, col1, col2] as any;
      tool.currentMultipleSelectionIndex = 1;
      expect(col0.selected).toBe(false);
      expect(col1.selected).toBe(true);
      expect(col2.selected).toBe(false);
    });

    it("setter deselects all when index does not match any", () => {
      const col0 = makeMockCollection(true);
      const col1 = makeMockCollection(false);
      tool.sameItemCollections = [col0, col1] as any;
      tool.currentMultipleSelectionIndex = 99;
      expect(col0.selected).toBe(false);
      expect(col1.selected).toBe(false);
    });
  });

  describe("itemGroupeNext()", () => {
    it("advances selection to the next collection", () => {
      tool.sameItemCollections = [
        makeMockCollection(true),
        makeMockCollection(false),
        makeMockCollection(false),
      ] as any;
      tool.itemGroupeNext();
      expect(tool.currentMultipleSelectionIndex).toBe(1);
    });

    it("wraps from last to first", () => {
      tool.sameItemCollections = [
        makeMockCollection(false),
        makeMockCollection(true),
      ] as any;
      tool.itemGroupeNext();
      expect(tool.currentMultipleSelectionIndex).toBe(0);
    });
  });

  describe("itemGroupePrevious()", () => {
    it("moves selection to the previous collection", () => {
      tool.sameItemCollections = [
        makeMockCollection(false),
        makeMockCollection(true),
        makeMockCollection(false),
      ] as any;
      tool.itemGroupePrevious();
      expect(tool.currentMultipleSelectionIndex).toBe(0);
    });

    it("wraps from first to last", () => {
      tool.sameItemCollections = [
        makeMockCollection(true),
        makeMockCollection(false),
      ] as any;
      tool.itemGroupePrevious();
      expect(tool.currentMultipleSelectionIndex).toBe(1);
    });

    it("treats -1 (nothing selected) as if index were 1, so previous is 0", () => {
      tool.sameItemCollections = [
        makeMockCollection(false),
        makeMockCollection(false),
      ] as any;
      // currentIndex == -1 → corrected to 1 → 1-1 = 0
      tool.itemGroupePrevious();
      expect(tool.currentMultipleSelectionIndex).toBe(0);
    });
  });

  describe("switchFrom()", () => {
    it("clears sameItemCollections", () => {
      tool.sameItemCollections = [makeMockCollection()] as any;
      tool.switchFrom();
      expect(tool.sameItemCollections).toHaveLength(0);
    });
  });

  describe("rightClick()", () => {
    it("calls deselectAll", () => {
      tool.sameItemCollections = [makeMockCollection(true)] as any;
      tool.rightClick(new Vector2(0, 0));
      expect(tool.sameItemCollections).toHaveLength(0);
    });
  });

  describe("leftClick()", () => {
    it("selects from the clicked tile when nothing is selected", () => {
      tool.leftClick(new Vector2(2, 3));
      expect(
        mockBlueprintService.blueprint.getBlueprintItemsAt,
      ).toHaveBeenCalledWith(new Vector2(2, 3));
    });

    it("selects from the clicked tile when the next group has nothing there", () => {
      const col = makeMockCollection(true, [{ position: new Vector2(5, 5) }]);
      tool.sameItemCollections = [col] as any;
      // click at tile (0,0) — not the position of col's item
      tool.leftClick(new Vector2(0, 0));
      expect(
        mockBlueprintService.blueprint.getBlueprintItemsAt,
      ).toHaveBeenCalledWith(new Vector2(0, 0));
      expect(tool.sameItemCollections).toHaveLength(0);
    });

    it("cycles to next group when tile matches an item in it", () => {
      const itemPos = new Vector2(3, 3);
      const col0 = makeMockCollection(true, [{ position: itemPos }]);
      const col1 = makeMockCollection(false, [{ position: itemPos }]);
      tool.sameItemCollections = [col0, col1] as any;
      // next_group = (0+1)%2 = 1; col1.items[0].position.equals(tile) → true
      tool.leftClick(itemPos);
      expect(tool.currentMultipleSelectionIndex).toBe(1);
    });
  });

  describe("buildingsDestroy()", () => {
    it("removes the given collection from sameItemCollections", () => {
      const col = makeMockCollection(true, [{}]);
      tool.sameItemCollections = [col] as any;
      tool.buildingsDestroy(col as any);
      expect(tool.sameItemCollections).not.toContain(col);
    });

    it("calls destroyBlueprintItem for each item in the collection", () => {
      const item1 = {};
      const item2 = {};
      const col = makeMockCollection(true, [item1, item2]);
      tool.sameItemCollections = [col] as any;
      tool.buildingsDestroy(col as any);
      expect(
        mockBlueprintService.blueprint.destroyBlueprintItem,
      ).toHaveBeenCalledWith(item1);
      expect(
        mockBlueprintService.blueprint.destroyBlueprintItem,
      ).toHaveBeenCalledWith(item2);
    });

    it("emits selectionChanged after removal", () => {
      const obs = { selectionChanged: vi.fn() };
      tool.subscribeSelectionChanged(obs);
      const col = makeMockCollection(true, []);
      tool.sameItemCollections = [col] as any;
      obs.selectionChanged.mockClear();
      tool.buildingsDestroy(col as any);
      expect(obs.selectionChanged).toHaveBeenCalled();
    });
  });

  describe("destroyAll()", () => {
    it("calls destroyAll on each collection", () => {
      const col1 = makeMockCollection();
      const col2 = makeMockCollection();
      tool.sameItemCollections = [col1, col2] as any;
      tool.destroyAll();
      expect(col1.destroyAll).toHaveBeenCalled();
      expect(col2.destroyAll).toHaveBeenCalled();
    });

    it("clears sameItemCollections afterwards", () => {
      tool.sameItemCollections = [makeMockCollection()] as any;
      tool.destroyAll();
      expect(tool.sameItemCollections).toHaveLength(0);
    });
  });

  describe("handleShortcut()", () => {
    it("destroys the currently selected collection on delete", () => {
      const item = {};
      const col = makeMockCollection(true, [item]);
      tool.sameItemCollections = [col] as any;
      expect(tool.handleShortcut(ShortcutAction.editDelete)).toBe(true);
      expect(
        mockBlueprintService.blueprint.destroyBlueprintItem,
      ).toHaveBeenCalledWith(item);
    });

    // Declining lets the shortcut fall through to another handler instead of
    // being swallowed by a tool that had nothing to do.
    it("declines delete when nothing is selected", () => {
      tool.sameItemCollections = [makeMockCollection(false)] as any;
      expect(tool.handleShortcut(ShortcutAction.editDelete)).toBe(false);
      expect(
        mockBlueprintService.blueprint.destroyBlueprintItem,
      ).not.toHaveBeenCalled();
    });

    it("deselects everything on cancel", () => {
      tool.sameItemCollections = [makeMockCollection(true, [{}])] as any;
      expect(tool.handleShortcut(ShortcutAction.interfaceCancel)).toBe(true);
      expect(tool.sameItemCollections).toHaveLength(0);
    });

    it("declines cancel when there is no selection", () => {
      expect(tool.handleShortcut(ShortcutAction.interfaceCancel)).toBe(false);
    });

    it("declines actions it does not own", () => {
      expect(tool.handleShortcut(ShortcutAction.buildRotate)).toBe(false);
    });
  });

  describe("selectedItem getter", () => {
    it("returns null when nothing is selected", () => {
      tool.sameItemCollections = [makeMockCollection(false, [{}])] as any;
      expect(tool.selectedItem).toBeNull();
    });

    it("returns the first item of the selected collection", () => {
      const item = { id: "Wire" };
      tool.sameItemCollections = [makeMockCollection(true, [item])] as any;
      expect(tool.selectedItem).toBe(item);
    });
  });

  describe("selectFromBox()", () => {
    it("clears existing collections before selecting", () => {
      tool.sameItemCollections = [makeMockCollection()] as any;
      tool.selectFromBox(new Vector2(0, 0), new Vector2(0, 0));
      // blueprint returns no items, so result is empty
      expect(tool.sameItemCollections).toHaveLength(0);
    });

    it("emits selectionChanged", () => {
      const obs = { selectionChanged: vi.fn() };
      tool.subscribeSelectionChanged(obs);
      obs.selectionChanged.mockClear();
      tool.selectFromBox(new Vector2(0, 0), new Vector2(1, 1));
      expect(obs.selectionChanged).toHaveBeenCalled();
    });

    // The blueprint answers per tile, as its spatial index does.
    const placeItems = (...items: any[]) =>
      mockBlueprintService.blueprint.getBlueprintItemsAt.mockImplementation(
        (tile: Vector2) => items.filter((item) => item.position.equals(tile)),
      );

    it("collects what lies inside the box and selects the front-most group", () => {
      const wire = {
        ...makeBlueprintItem(makeOniItem("Wire"), new Vector2(1, 3)),
        depth: 1,
      };
      const tile = {
        ...makeBlueprintItem(makeOniItem("Tile"), new Vector2(3, 1)),
        depth: 5,
      };
      const outside = {
        ...makeBlueprintItem(makeOniItem("Bed"), new Vector2(4, 1)),
        depth: 9,
      };
      placeItems(wire, tile, outside);

      tool.selectFromBox(new Vector2(1, 3), new Vector2(3, 1));

      expect(tool.sameItemCollections.map((c) => c.oniItem.id)).toEqual([
        "Tile",
        "Wire",
      ]);
      expect(tool.currentMultipleSelectionIndex).toBe(0);
      expect(tile.selected).toBe(true);
      expect(wire.selected).toBe(false);
    });

    describe("clicking the same item twice", () => {
      let oniItem: any;
      let clicked: any;
      let alike: any;

      beforeEach(() => {
        vi.useFakeTimers();
        oniItem = makeOniItem("Wire");
        clicked = makeBlueprintItem(oniItem, new Vector2(0, 0));
        alike = makeBlueprintItem(oniItem, new Vector2(7, 7));
        mockBlueprintService.blueprint.blueprintItems = [clicked, alike];
        placeItems(clicked, alike);
        tool.selectFromBox(new Vector2(0, 0), new Vector2(0, 0));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("within 500 ms selects every item like it", () => {
        expect(tool.selectedItems).toEqual([clicked]);

        vi.advanceTimersByTime(499);
        tool.selectFromBox(new Vector2(0, 0), new Vector2(0, 0));

        expect(tool.selectedItems).toEqual([clicked, alike]);
      });

      it("500 ms apart is two single selections", () => {
        vi.advanceTimersByTime(500);
        tool.selectFromBox(new Vector2(0, 0), new Vector2(0, 0));

        expect(tool.selectedItems).toEqual([clicked]);
      });
    });
  });

  describe("selectAll()", () => {
    it("clears previous collections", () => {
      tool.sameItemCollections = [makeMockCollection()] as any;
      mockBlueprintService.blueprint.blueprintItems = [];
      tool.selectAll({} as any);
      expect(tool.sameItemCollections).toHaveLength(0);
    });

    it("collects items matching the given oniItem", () => {
      const oniItem = makeOniItem("Wire");
      const item1 = makeBlueprintItem(oniItem);
      const item2 = makeBlueprintItem(makeOniItem("Tile"));
      mockBlueprintService.blueprint.blueprintItems = [item1, item2];
      tool.selectAll(oniItem as any);
      // one SameItemCollection for "Wire"
      expect(tool.sameItemCollections).toHaveLength(1);
    });

    it("emits selectionChanged", () => {
      const obs = { selectionChanged: vi.fn() };
      tool.subscribeSelectionChanged(obs);
      obs.selectionChanged.mockClear();
      mockBlueprintService.blueprint.blueprintItems = [];
      tool.selectAll({} as any);
      expect(obs.selectionChanged).toHaveBeenCalled();
    });
  });

  describe("selectThis()", () => {
    it("adds only the specified item to the selection", () => {
      const oniItem = makeOniItem("Wire");
      const target = makeBlueprintItem(oniItem);
      const other = makeBlueprintItem(oniItem);
      mockBlueprintService.blueprint.blueprintItems = [target, other];
      tool.selectThis(target as any);
      expect(tool.sameItemCollections).toHaveLength(1);
      expect(tool.sameItemCollections[0].items[0]).toBe(target);
    });
  });

  // ── Existing draw/drag/dragStop tests (preserved) ──────────────────────────

  describe("draw()", () => {
    it("should not draw when no drag is active", () => {
      tool.draw(mockDrawPixi, mockCamera);
      expect(mockDrawPixi.drawTileRectangle).not.toHaveBeenCalled();
    });

    it("should draw selection rectangle while dragging, snapped to whole tiles", () => {
      tool.drag(new Vector2(1, 5), new Vector2(4, 2));
      tool.draw(mockDrawPixi, mockCamera);
      expect(mockDrawPixi.drawTileRectangle).toHaveBeenCalledTimes(1);
      const args = mockDrawPixi.drawTileRectangle.mock.calls.at(-1);
      const [camera, topLeft, bottomRight, frontGraphics] = args;
      expect(camera).toBe(mockCamera);
      // Bounding box covers the full extent of the whole tiles selectFromBox()
      // will operate on, not just the raw drag endpoints.
      expect(topLeft.x).toBe(1);
      expect(topLeft.y).toBe(5);
      expect(bottomRight.x).toBe(5);
      expect(bottomRight.y).toBe(1);
      expect(frontGraphics).toBe(true); // must be true so it renders above blueprint tiles
    });

    it("should normalise coordinates when drag goes top-right to bottom-left", () => {
      // User drags from (5,1) to (1,5): beginSelection gets the larger coords
      tool.drag(new Vector2(5, 1), new Vector2(1, 5));
      tool.draw(mockDrawPixi, mockCamera);
      const [, topLeft, bottomRight] =
        mockDrawPixi.drawTileRectangle.mock.calls.at(-1);
      expect(topLeft.x).toBeLessThanOrEqual(bottomRight.x);
      expect(topLeft.y).toBeGreaterThanOrEqual(bottomRight.y);
    });

    it("should not draw after dragStop clears the selection", () => {
      tool.drag(new Vector2(0, 5), new Vector2(3, 2));
      tool.dragStop();
      tool.draw(mockDrawPixi, mockCamera);
      expect(mockDrawPixi.drawTileRectangle).not.toHaveBeenCalled();
    });
  });

  describe("draw() dimensions label", () => {
    it("shows 'width x height' and area centered in the selection box", () => {
      // Snaps to a 9 (wide) x 4 (tall) box == 36 tiles.
      tool.drag(new Vector2(0, 4), new Vector2(8, 1));
      tool.draw(mockDrawPixi, mockCamera);

      expect(mockDrawPixi.getNewText).toHaveBeenCalledTimes(1);
      const label = mockDrawPixi.getNewText.mock.results[0].value;
      expect(label.text).toBe("9 x 4\n36 tiles");
      // Center of the box in world space, converted to screen space.
      expect(label.position.x).toBe(144);
      expect(label.position.y).toBe(-64);
      expect(label.visible).toBe(true);
    });

    it("colours the label to match the selection border", () => {
      tool.drag(new Vector2(0, 0), new Vector2(1, 1));
      tool.draw(mockDrawPixi, mockCamera);

      const style = mockDrawPixi.getNewText.mock.calls[0][1];
      const borderColor: number =
        mockDrawPixi.drawTileRectangle.mock.calls[0][6];
      expect(style.fill).toBe(`#${borderColor.toString(16).padStart(6, "0")}`);
    });

    it("reuses the same text sprite across draw calls instead of recreating it", () => {
      tool.drag(new Vector2(0, 0), new Vector2(2, 2));
      tool.draw(mockDrawPixi, mockCamera);
      tool.draw(mockDrawPixi, mockCamera);

      expect(mockDrawPixi.getNewText).toHaveBeenCalledTimes(1);
    });

    it("hides the label once dragStop clears the selection", () => {
      tool.drag(new Vector2(0, 0), new Vector2(2, 2));
      tool.draw(mockDrawPixi, mockCamera);
      const label = mockDrawPixi.getNewText.mock.results[0].value;
      expect(label.visible).toBe(true);

      tool.dragStop();
      tool.draw(mockDrawPixi, mockCamera);
      expect(label.visible).toBe(false);
    });

    it("hides the label when switching away from the tool mid-drag", () => {
      tool.drag(new Vector2(0, 0), new Vector2(2, 2));
      tool.draw(mockDrawPixi, mockCamera);
      const label = mockDrawPixi.getNewText.mock.results[0].value;

      tool.switchFrom();
      expect(label.visible).toBe(false);
    });
  });

  describe("drag()", () => {
    it("keeps the box anchored where the drag began across drag events", () => {
      tool.drag(new Vector2(1, 4), new Vector2(2, 3));
      tool.drag(new Vector2(2, 3), new Vector2(3, 2));
      tool.draw(mockDrawPixi, mockCamera);

      const [, topLeft, bottomRight] =
        mockDrawPixi.drawTileRectangle.mock.calls.at(-1);
      expect([topLeft.x, topLeft.y]).toEqual([1, 4]);
      expect([bottomRight.x, bottomRight.y]).toEqual([4, 1]);
    });
  });

  describe("dragStop()", () => {
    it("selects exactly the items inside the snapped box, whichever way it was dragged", () => {
      const oniItem = makeOniItem("Tile");
      const topLeftCorner = makeBlueprintItem(oniItem, new Vector2(1, 5));
      const bottomRightCorner = makeBlueprintItem(oniItem, new Vector2(4, 2));
      const rightOfBox = makeBlueprintItem(oniItem, new Vector2(5, 5));
      const belowBox = makeBlueprintItem(oniItem, new Vector2(2, 1));
      const items = [topLeftCorner, bottomRightCorner, rightOfBox, belowBox];
      mockBlueprintService.blueprint.getBlueprintItemsAt.mockImplementation(
        (tile: Vector2) => items.filter((item) => item.position.equals(tile)),
      );

      // Bottom-right to top-left, in sub-tile coordinates: cells (4,2)..(1,5).
      tool.drag(new Vector2(4.5, 1.5), new Vector2(1.2, 4.6));
      tool.dragStop();

      expect(tool.selectedItems).toEqual([topLeftCorner, bottomRightCorner]);
    });
  });

  describe("selectAllLike()", () => {
    it("selects all items sharing the same oniItem (non-element)", () => {
      const oniItem = makeOniItem("Wire", false);
      const item1 = makeBlueprintItem(oniItem);
      const item2 = makeBlueprintItem(oniItem);
      const item3 = makeBlueprintItem(makeOniItem("Tile"));
      mockBlueprintService.blueprint.blueprintItems = [item1, item2, item3];
      tool.selectAllLike(item1 as any);
      expect(tool.sameItemCollections).toHaveLength(1);
      expect(tool.sameItemCollections[0].items).toHaveLength(2);
    });

    it("filters by oniItem AND buildableElement[0] for element items", () => {
      const oniItem = makeOniItem("Element", true);
      const elem1 = { id: "Water" };
      const elem2 = { id: "Oxygen" };
      const item1 = {
        ...makeBlueprintItem(oniItem),
        buildableElements: [elem1],
      };
      const item2 = {
        ...makeBlueprintItem(oniItem),
        buildableElements: [elem2],
      };
      const item3 = {
        ...makeBlueprintItem(oniItem),
        buildableElements: [elem1],
      };
      mockBlueprintService.blueprint.blueprintItems = [item1, item2, item3];
      tool.selectAllLike(item1 as any);
      expect(tool.sameItemCollections[0].items).toHaveLength(2);
    });

    it("emits selectionChanged", () => {
      const obs = { selectionChanged: vi.fn() };
      tool.subscribeSelectionChanged(obs);
      mockBlueprintService.blueprint.blueprintItems = [];
      obs.selectionChanged.mockClear();
      tool.selectAllLike({
        oniItem: makeOniItem("Wire"),
        buildableElements: [],
      } as any);
      expect(obs.selectionChanged).toHaveBeenCalled();
    });
  });

  describe("selectEveryElement()", () => {
    it("selects items that contain the given BuildableElement", () => {
      const oniItem = makeOniItem("Wire");
      const target = { id: "elem-target" };
      const item1 = {
        ...makeBlueprintItem(oniItem),
        buildableElements: [target],
      };
      const item2 = { ...makeBlueprintItem(oniItem), buildableElements: [] };
      mockBlueprintService.blueprint.blueprintItems = [item1, item2];
      tool.selectEveryElement(target as any);
      expect(tool.sameItemCollections).toHaveLength(1);
      expect(tool.sameItemCollections[0].items[0]).toBe(item1);
    });

    it("emits selectionChanged", () => {
      const obs = { selectionChanged: vi.fn() };
      tool.subscribeSelectionChanged(obs);
      mockBlueprintService.blueprint.blueprintItems = [];
      obs.selectionChanged.mockClear();
      tool.selectEveryElement({ id: "x" } as any);
      expect(obs.selectionChanged).toHaveBeenCalled();
    });
  });

  describe("addToCollection() element grouping", () => {
    const elementCell = (id: string) => ({
      ...makeBlueprintItem(makeOniItem("Element", true)),
      buildableElements: [{ id }],
    });

    it("groups element cells by element, not by the shared Element prefab", () => {
      const water = elementCell("Water");
      const oxygen = elementCell("Oxygen");
      const moreWater = elementCell("Water");

      tool.addToCollection(water as any);
      tool.addToCollection(oxygen as any);
      tool.addToCollection(moreWater as any);

      expect(tool.sameItemCollections.map((c) => c.items)).toEqual([
        [water, moreWater],
        [oxygen],
      ]);
    });

    it("groups buildings by prefab whatever they are made of", () => {
      const oniItem = makeOniItem("Wire");
      const copperWire = {
        ...makeBlueprintItem(oniItem),
        buildableElements: [{ id: "Copper" }],
      };
      const goldWire = {
        ...makeBlueprintItem(oniItem),
        buildableElements: [{ id: "Gold" }],
      };

      tool.addToCollection(copperWire as any);
      tool.addToCollection(goldWire as any);

      expect(tool.sameItemCollections.map((c) => c.items)).toEqual([
        [copperWire, goldWire],
      ]);
    });
  });
});
