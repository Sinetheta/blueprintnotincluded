import { DigTool } from "./dig-tool";
import { ToolType } from "./tool";
import {
  Blueprint,
  BlueprintItem,
  DIG_BLOCKED_COLOR,
  DIG_COLOR,
  MdbBlueprint,
  Vector2,
} from "../../../../../../lib/index";
import { BlueprintService } from "../../services/blueprint-service";
import { ToolService } from "../../services/tool-service";
import { ShortcutAction } from "../../keybindings/shortcut-actions";
import { DrawPixi } from "../../drawing/draw-pixi";

describe("DigTool", () => {
  let tool: DigTool;
  let blueprint: Blueprint;
  // What BlueprintService.blueprintChanged() does on each change event: push
  // one snapshot of the model onto the undo stack.
  let undoStates: MdbBlueprint[];
  let parent: { changeTool: ReturnType<typeof vi.fn> };

  const cells = () => blueprint.digCommands.map(({ x, y }) => [x, y]);

  beforeEach(() => {
    blueprint = new Blueprint();
    undoStates = [];
    blueprint.subscribeBlueprintChanged({
      itemDestroyed: () => {},
      itemAdded: (_item: BlueprintItem) => {},
      blueprintChanged: () => undoStates.push(blueprint.toMdbBlueprint()),
    });
    const blueprintService = { blueprint } as unknown as BlueprintService;
    tool = new DigTool(blueprintService);
    parent = { changeTool: vi.fn() };
    tool.parent = parent as unknown as ToolService;
  });

  it("is an exclusive input tool", () => {
    expect(tool.toolType).toBe(ToolType.dig);
    expect(tool.toolGroup).toBe(1);
    expect(tool.captureInput).toBe(true);
  });

  it("paints the clicked cell and commits it when the pointer lifts", () => {
    tool.mouseDown(new Vector2(4, 5));
    expect(cells()).toEqual([[4, 5]]);
    // Not yet: the gesture is still open.
    expect(undoStates).toHaveLength(0);
    tool.leftClick(new Vector2(4, 5));
    tool.dragStop();
    expect(undoStates).toHaveLength(1);
    expect(undoStates[0].digCommands).toEqual([{ x: 4, y: 5 }]);
  });

  it("makes a whole drag one undo step", () => {
    tool.mouseDown(new Vector2(0, 3));
    tool.drag(new Vector2(0, 3), new Vector2(1.5, 2.5));
    tool.drag(new Vector2(1.5, 2.5), new Vector2(2.5, 2.5));
    tool.dragStop();
    expect(cells()).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
    ]);
    expect(undoStates).toHaveLength(1);

    tool.mouseDown(new Vector2(5, 5));
    tool.dragStop();
    expect(undoStates).toHaveLength(2);
  });

  it("fills in the cells a fast drag skipped over", () => {
    tool.mouseDown(new Vector2(0, 0));
    // One pointer sample three cells right and two up.
    tool.drag(new Vector2(0, 0), new Vector2(3.5, 1.5));
    tool.dragStop();
    expect(cells()).toEqual([
      [0, 0],
      [1, 1],
      [2, 1],
      [3, 2],
    ]);
  });

  it("keeps one entry per cell, and a gesture that adds nothing is no undo step", () => {
    tool.mouseDown(new Vector2(1, 1));
    tool.drag(new Vector2(1, 1), new Vector2(2.5, 0.5));
    tool.drag(new Vector2(2.5, 0.5), new Vector2(1.5, 0.5));
    tool.dragStop();
    expect(cells()).toEqual([
      [1, 1],
      [2, 1],
    ]);
    expect(undoStates).toHaveLength(1);

    tool.mouseDown(new Vector2(2, 1));
    tool.dragStop();
    expect(cells()).toHaveLength(2);
    expect(undoStates).toHaveLength(1);
  });

  it("erases cells, ignores empty ones, and commits once", () => {
    blueprint.digCommands.push({ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 7, y: 7 });
    tool.erase = true;
    tool.mouseDown(new Vector2(0, 2));
    tool.drag(new Vector2(0, 2), new Vector2(3.5, 1.5));
    tool.dragStop();
    expect(cells()).toEqual([[7, 7]]);
    expect(undoStates).toHaveLength(1);

    tool.mouseDown(new Vector2(9, 9));
    tool.dragStop();
    expect(undoStates).toHaveLength(1);
  });

  it("refuses a cell under a Planning Tool shape", () => {
    blueprint.planningToolShapes.push({ x: 3, y: 3, shape: 0, color: 1 });
    expect(tool.isPlanningCell({ x: 3, y: 3 })).toBe(true);
    expect(tool.isPlanningCell({ x: 4, y: 3 })).toBe(false);
    tool.mouseDown(new Vector2(2, 3));
    tool.drag(new Vector2(2, 3), new Vector2(4.5, 2.5));
    tool.dragStop();
    expect(cells()).toEqual([
      [2, 3],
      [4, 3],
    ]);
  });

  it("commits an open gesture when the tool is switched away", () => {
    tool.mouseDown(new Vector2(1, 1));
    tool.switchFrom();
    expect(undoStates).toHaveLength(1);
    // Nothing left to commit.
    tool.dragStop();
    expect(undoStates).toHaveLength(1);
  });

  it("starts each gesture fresh, without joining it to the last one", () => {
    tool.mouseDown(new Vector2(0, 0));
    tool.dragStop();
    tool.mouseDown(new Vector2(5, 0));
    tool.dragStop();
    expect(cells()).toEqual([
      [0, 0],
      [5, 0],
    ]);
  });

  it("reveals a hidden layer when switched to or painted on", () => {
    tool.showDigCommands = false;
    tool.switchTo();
    expect(tool.showDigCommands).toBe(true);
    tool.showDigCommands = false;
    tool.mouseDown(new Vector2(0, 0));
    expect(tool.showDigCommands).toBe(true);
  });

  it("returns to Select on right-click and on cancel", () => {
    tool.rightClick(new Vector2(0, 0));
    expect(parent.changeTool).toHaveBeenCalledWith(ToolType.select);
    expect(tool.handleShortcut(ShortcutAction.interfaceCancel)).toBe(true);
    expect(tool.handleShortcut(ShortcutAction.editDelete)).toBe(false);
  });

  describe("cursor preview", () => {
    let graphics: {
      visible: boolean;
      clear: ReturnType<typeof vi.fn>;
      lineStyle: ReturnType<typeof vi.fn>;
      beginFill: ReturnType<typeof vi.fn>;
      endFill: ReturnType<typeof vi.fn>;
      drawRect: ReturnType<typeof vi.fn>;
      moveTo: ReturnType<typeof vi.fn>;
      lineTo: ReturnType<typeof vi.fn>;
    };
    let drawPixi: DrawPixi;
    const camera = { currentZoom: 10, cameraOffset: new Vector2(0, 0) } as any;

    beforeEach(() => {
      graphics = {
        visible: false,
        clear: vi.fn(),
        lineStyle: vi.fn(),
        beginFill: vi.fn(),
        endFill: vi.fn(),
        drawRect: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
      };
      drawPixi = {
        getNewGraphics: () => graphics,
        pixiApp: { stage: { addChild: vi.fn() } },
      } as unknown as DrawPixi;
    });

    const lineColors = () =>
      graphics.lineStyle.mock.calls
        .filter((call) => call.length > 1)
        .map((call) => call[1]);

    it("is hidden with no cell under the pointer, or with the layer hidden", () => {
      tool.draw(drawPixi, camera);
      expect(graphics.visible).toBe(false);
      tool.hover(new Vector2(1, 1));
      tool.showDigCommands = false;
      tool.draw(drawPixi, camera);
      expect(graphics.visible).toBe(false);
    });

    it("shows a faint dig cell where a click would paint", () => {
      tool.hover(new Vector2(1, 1));
      tool.draw(drawPixi, camera);
      expect(graphics.visible).toBe(true);
      expect(graphics.beginFill).toHaveBeenCalledOnce();
      expect(graphics.beginFill.mock.calls[0][0]).toBe(DIG_COLOR);
    });

    it("crosses the cell out in red over a planning shape", () => {
      blueprint.planningToolShapes.push({ x: 1, y: 1, shape: 0, color: 1 });
      tool.hover(new Vector2(1, 1));
      tool.draw(drawPixi, camera);
      expect(graphics.beginFill).not.toHaveBeenCalled();
      expect(lineColors()).toEqual([DIG_BLOCKED_COLOR]);
    });

    it("crosses the cell out in the dig colour while erasing", () => {
      tool.erase = true;
      tool.hover(new Vector2(1, 1));
      tool.draw(drawPixi, camera);
      expect(graphics.beginFill).not.toHaveBeenCalled();
      expect(lineColors()).toEqual([DIG_COLOR]);
    });
  });
});
