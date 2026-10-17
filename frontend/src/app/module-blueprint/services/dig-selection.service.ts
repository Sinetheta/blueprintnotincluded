import { Injectable } from "@angular/core";
import {
  BniDigCommand,
  digCommandsKey,
  digRegionAt,
} from "../../../../../lib/index";
import { BlueprintService } from "./blueprint-service";
import { DigTool } from "../common/tools/dig-tool";

// The dig area the Select tool has selected: the whole region the overlay
// outlines as one shape, picked by clicking any of its cells. Before this, a
// click on the amber hatching did nothing at all, which read as "inactive" —
// the panel this drives says what a dig is and offers to erase it.
//
// Keyed by the clicked cell, like the note and terrain selections: undo/redo
// rebuilds digCommands, so held cells would dangle, and `selected` re-resolves
// the region on every read instead (cached on the cells' signature, since the
// canvas reads it every frame).
@Injectable({ providedIn: "root" })
export class DigSelectionService {
  private selectedTile: { x: number; y: number } | null = null;
  private cache: { key: string; region: BniDigCommand[] } | null = null;

  constructor(
    private blueprintService: BlueprintService,
    private digTool: DigTool,
  ) {}

  // The selected region, or null. Null too while dig cells are hidden: an
  // invisible selection must not be erasable by a stray Delete.
  get selected(): BniDigCommand[] | null {
    if (this.selectedTile == null || !this.digTool.showDigCommands) return null;
    const digs = this.blueprintService.blueprint.digCommands;
    const key = `${this.selectedTile.x},${this.selectedTile.y}@${digCommandsKey(digs)}`;
    if (this.cache?.key !== key)
      this.cache = { key, region: digRegionAt(digs, this.selectedTile) };
    return this.cache.region.length > 0 ? this.cache.region : null;
  }

  isSelected(cell: { x: number; y: number }): boolean {
    return (
      this.selected?.some((dig) => dig.x === cell.x && dig.y === cell.y) ??
      false
    );
  }

  select(cell: { x: number; y: number }) {
    this.selectedTile = { x: cell.x, y: cell.y };
  }

  clear() {
    this.selectedTile = null;
  }

  // Erases the selected region as one undo step.
  erase() {
    const region = this.selected;
    if (region == null) return;
    const erased = new Set(region.map((dig) => `${dig.x},${dig.y}`));
    const blueprint = this.blueprintService.blueprint;
    blueprint.digCommands = blueprint.digCommands.filter(
      (dig) => !erased.has(`${dig.x},${dig.y}`),
    );
    this.clear();
    blueprint.emitBlueprintChanged();
  }
}
