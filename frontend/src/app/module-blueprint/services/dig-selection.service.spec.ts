import { describe, it, expect, beforeEach, vi } from "vitest";
import { BniDigCommand } from "../../../../../lib/index";
import { DigSelectionService } from "./dig-selection.service";
import { BlueprintService } from "./blueprint-service";
import { DigTool } from "../common/tools/dig-tool";

const cells = (digs: BniDigCommand[] | null) =>
  (digs ?? []).map((d) => `${d.x},${d.y}`).sort();

describe("DigSelectionService", () => {
  let service: DigSelectionService;
  let digTool: { showDigCommands: boolean };
  let blueprint: {
    digCommands: BniDigCommand[];
    emitBlueprintChanged: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    blueprint = {
      // Two regions: a row of three and a lone cell.
      digCommands: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 5, y: 5 },
      ],
      emitBlueprintChanged: vi.fn(),
    };
    digTool = { showDigCommands: true };
    service = new DigSelectionService(
      { blueprint } as unknown as BlueprintService,
      digTool as unknown as DigTool,
    );
  });

  it("selects the whole region from any of its cells", () => {
    expect(service.selected).toBe(null);
    service.select({ x: 1, y: 0 });
    expect(cells(service.selected)).toEqual(["0,0", "1,0", "2,0"]);
    expect(service.isSelected({ x: 2, y: 0 })).toBe(true);
    expect(service.isSelected({ x: 5, y: 5 })).toBe(false);
  });

  it("re-resolves after the cells change, as undo replaces them", () => {
    service.select({ x: 0, y: 0 });
    blueprint.digCommands = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ];
    expect(cells(service.selected)).toEqual(["0,0", "0,1"]);

    blueprint.digCommands = [];
    expect(service.selected).toBe(null);
  });

  it("has no selection while dig cells are hidden", () => {
    service.select({ x: 0, y: 0 });
    digTool.showDigCommands = false;
    expect(service.selected).toBe(null);
    service.erase();
    expect(blueprint.digCommands).toHaveLength(4);
  });

  it("erases only the selected region, as one undo step", () => {
    service.select({ x: 2, y: 0 });
    service.erase();

    expect(cells(blueprint.digCommands)).toEqual(["5,5"]);
    expect(blueprint.emitBlueprintChanged).toHaveBeenCalledTimes(1);
    expect(service.selected).toBe(null);
  });

  it("clears", () => {
    service.select({ x: 5, y: 5 });
    service.clear();
    expect(service.selected).toBe(null);
  });
});
