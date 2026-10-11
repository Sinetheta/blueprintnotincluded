import { Injectable } from "@angular/core";
import {
  CameraService,
  DIG_BLOCKED_COLOR,
  DIG_COLOR,
  DrawHelpers,
  drawCrossedDigCell,
  drawDigCells,
  Vector2,
} from "../../../../../../lib/index";
import { BlueprintService } from "../../services/blueprint-service";
import { DrawPixi } from "../../drawing/draw-pixi";
import { ITool, ToolType } from "./tool";
import {
  ShortcutAction,
  ShortcutActionId,
} from "../../keybindings/shortcut-actions";
import { ToolService } from "../../services/tool-service";

// Paints and erases the blueprint's dig commands — the cells the Blueprints
// mod digs out on paste. Modelled on PlanningTool (click or drag paints, an
// erase toggle removes, right-click returns to Select), with one difference:
// a whole gesture is one undo step. The cells change live as the pointer
// moves (the overlay reads digCommands every frame), and the change is
// announced once, when the pointer lifts, so a long stroke costs one slot of
// the 50-entry undo ring instead of one per cell.
@Injectable({ providedIn: "root" })
export class DigTool implements ITool {
  parent!: ToolService;
  erase = false;
  // View-only, like the terrain and note toggles: hides the layer in the live
  // editor, never in an export. Reset by switching to the tool or painting,
  // since editing an invisible layer would look like nothing happened.
  showDigCommands = true;

  private hoverTile: Vector2 | null = null;
  private preview: PIXI.Graphics | null = null;
  // The last cell the current gesture touched, so a fast drag fills in the
  // cells between two pointer samples instead of leaving gaps.
  private lastCell: Vector2 | null = null;
  private changed = false;

  constructor(private blueprintService: BlueprintService) {}

  // A Planning Tool shape's cell is already dug on export: toBniBlueprint
  // writes one dig per shape cell, and an import hands any dig there back to
  // the shape. A dig of its own on that cell would be redundant, then quietly
  // gone after a round trip, so the tool refuses it.
  isPlanningCell(cell: { x: number; y: number }): boolean {
    return this.blueprintService.blueprint.planningToolShapes.some(
      (plan) => plan.x === cell.x && plan.y === cell.y,
    );
  }

  private apply(cell: Vector2) {
    const digs = this.blueprintService.blueprint.digCommands;
    if (this.erase) {
      for (let i = digs.length - 1; i >= 0; i--)
        if (digs[i].x === cell.x && digs[i].y === cell.y) {
          digs.splice(i, 1);
          this.changed = true;
        }
      return;
    }
    if (this.isPlanningCell(cell)) return;
    if (digs.some((dig) => dig.x === cell.x && dig.y === cell.y)) return;
    digs.push({ x: cell.x, y: cell.y });
    this.changed = true;
  }

  // Every cell on the line from the previous sample to this one (Bresenham),
  // so the stroke is continuous however fast the pointer moved.
  private paintTo(tile: Vector2) {
    const cell = DrawHelpers.getIntegerTile(tile);
    const from = this.lastCell ?? cell;
    const dx = Math.abs(cell.x - from.x);
    const dy = -Math.abs(cell.y - from.y);
    const sx = from.x < cell.x ? 1 : -1;
    const sy = from.y < cell.y ? 1 : -1;
    let x = from.x;
    let y = from.y;
    let error = dx + dy;
    for (;;) {
      this.apply(new Vector2(x, y));
      if (x === cell.x && y === cell.y) break;
      const doubled = 2 * error;
      if (doubled >= dy) {
        error += dy;
        x += sx;
      }
      if (doubled <= dx) {
        error += dx;
        y += sy;
      }
    }
    this.lastCell = cell;
  }

  // Ends the gesture: one change event, so one undo step, if anything changed.
  private commit() {
    this.lastCell = null;
    if (!this.changed) return;
    this.changed = false;
    this.blueprintService.blueprint.emitBlueprintChanged();
  }

  switchFrom() {
    this.commit();
    this.hoverTile = null;
    if (this.preview != null) this.preview.visible = false;
  }
  switchTo() {
    this.showDigCommands = true;
  }
  mouseOut() {
    this.hoverTile = null;
  }
  mouseDown(tile: Vector2) {
    this.showDigCommands = true;
    this.lastCell = null;
    this.paintTo(tile);
  }
  leftClick(_tile: Vector2) {}
  rightClick(_tile: Vector2) {
    this.parent.changeTool(ToolType.select);
  }
  hover(tile: Vector2) {
    this.hoverTile = DrawHelpers.getIntegerTile(tile);
  }
  drag(_tileStart: Vector2, tileStop: Vector2) {
    this.hoverTile = DrawHelpers.getIntegerTile(tileStop);
    this.paintTo(tileStop);
  }
  // Every pointer-up ends in a dragStop, a plain click included, and so does
  // the pointer leaving the canvas mid-stroke.
  dragStop() {
    this.commit();
  }
  handleShortcut(action: ShortcutActionId): boolean {
    if (action == ShortcutAction.interfaceCancel) {
      this.parent.changeTool(ToolType.select);
      return true;
    }
    return false;
  }

  draw(drawPixi: DrawPixi, camera: CameraService) {
    let preview = this.preview;
    if (preview == null) {
      const created = drawPixi.getNewGraphics() as PIXI.Graphics;
      drawPixi.pixiApp.stage.addChild(created);
      this.preview = created;
      preview = created;
    }
    preview.clear();
    const hover = this.hoverTile;
    preview.visible = hover != null && this.showDigCommands;
    if (!preview.visible) return;

    const zoom = camera.currentZoom;
    const originX = camera.cameraOffset.x * zoom;
    const originY = camera.cameraOffset.y * zoom;
    if (this.erase)
      drawCrossedDigCell(preview, hover!, zoom, originX, originY, DIG_COLOR);
    else if (this.isPlanningCell(hover!))
      drawCrossedDigCell(
        preview,
        hover!,
        zoom,
        originX,
        originY,
        DIG_BLOCKED_COLOR,
      );
    else drawDigCells(preview, [hover!], zoom, originX, originY, 0.6);
  }

  toggleable = false;
  visible = false;
  captureInput = true;
  toolType = ToolType.dig;
  toolGroup = 1;
}
