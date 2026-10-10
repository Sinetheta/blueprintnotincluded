import { Component } from "@angular/core";
import { terrainIconUrl, TerrainFeature } from "../../../../../../../lib/index";
import { TerrainTool } from "../../../common/tools/terrain-tool";
import { TerrainAnnotationService } from "../../../services/terrain-annotation.service";

// Left-panel UI for the Terrain Annotation Tool: the palette of natural map
// features to place. The selected annotation is shown and deleted from
// TerrainEditPanelComponent instead, since a feature can be selected from any
// tool and this card is only visible while the Terrain tool is active.
//
// Deliberately separate from the building palette. Dupes cannot build a geyser
// — these record what the map already contains, so mixing them into the build
// menu would invite exactly the confusion this feature exists to avoid.
@Component({
  selector: "app-terrain-tool",
  templateUrl: "./terrain-tool.component.html",
  styleUrls: ["./terrain-tool.component.css"],
  standalone: false,
})
export class TerrainToolComponent {
  constructor(
    public tool: TerrainTool,
    public terrainService: TerrainAnnotationService,
  ) {}

  get features(): TerrainFeature[] {
    return TerrainFeature.features;
  }

  iconUrl(id: string): string {
    return terrainIconUrl({ id, x: 0, y: 0 });
  }

  footprintLabel(feature: TerrainFeature): string {
    return `${feature.width}×${feature.height}`;
  }
}
