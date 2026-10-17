import { Component } from "@angular/core";
import { DigSelectionService } from "../../services/dig-selection.service";
import { GameStringService } from "../../services/game-string-service";
import { ToolService } from "../../services/tool-service";
import { ToolType } from "../../common/tools/tool";

// What a selected dig area is, and how to get rid of it: pinned bottom-right
// with the note and terrain panels. A visitor who clicked the amber hatching
// used to get no response at all and took it for an inactive zone.
@Component({
  selector: "app-dig-selection-panel",
  templateUrl: "./dig-selection-panel.component.html",
  styleUrls: ["./dig-selection-panel.component.css"],
  standalone: false,
})
export class DigSelectionPanelComponent {
  constructor(
    private digSelection: DigSelectionService,
    private toolService: ToolService,
    private gameStringService: GameStringService,
  ) {}

  get cellCount(): number | null {
    return this.digSelection.selected?.length ?? null;
  }

  get title(): string {
    return (
      this.gameStringService.dict?.["STRINGS.MISC.PLACERS.DIGPLACER.NAME"] ??
      $localize`Dig`
    );
  }

  erase() {
    this.digSelection.erase();
  }

  close() {
    this.digSelection.clear();
  }

  openDigTool() {
    this.toolService.changeTool(ToolType.dig);
  }
}
