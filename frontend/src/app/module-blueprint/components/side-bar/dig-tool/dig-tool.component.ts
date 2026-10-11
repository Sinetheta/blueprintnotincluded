import { Component } from "@angular/core";
import { DigTool } from "../../../common/tools/dig-tool";
import { BlueprintService } from "../../../services/blueprint-service";

// Left-panel UI for the Dig tool: dig or erase, and the layer's view-only
// visibility toggle.
@Component({
  selector: "app-dig-tool",
  templateUrl: "./dig-tool.component.html",
  styleUrls: ["./dig-tool.component.css"],
  standalone: false,
})
export class DigToolComponent {
  constructor(
    public tool: DigTool,
    private blueprintService: BlueprintService,
  ) {}

  get digCount(): number {
    return this.blueprintService.blueprint?.digCommands.length ?? 0;
  }
}
