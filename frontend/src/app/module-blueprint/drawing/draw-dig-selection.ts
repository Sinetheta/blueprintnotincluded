import {
  BniDigCommand,
  CameraService,
  digCommandsKey,
  digEdgeThickness,
  digOverlayGeometry,
  drawDigCells,
} from "../../../../../lib/index";
import { DrawPixi } from "./draw-pixi";

// The Select tool's highlight on a selected dig area: its cells at full
// strength over the buildings (the at-rest layer sits under them, faint), and
// the region outlined in the selection green the box-select uses.
const SELECTION_EDGE_COLOR = 0x4cff00;

export class DrawDigSelection {
  private graphics: any;
  private key: string | null = null;

  constructor(drawPixi: DrawPixi, parent: any = drawPixi.pixiApp.stage) {
    this.graphics = drawPixi.getNewGraphics();
    parent.addChild(this.graphics);
  }

  clear() {
    if (this.key == null) return;
    this.graphics.clear();
    this.graphics.visible = false;
    this.key = null;
  }

  draw(region: BniDigCommand[] | null, camera: CameraService) {
    if (region == null || region.length === 0) {
      this.clear();
      return;
    }

    const zoom = camera.currentZoom;
    const key = zoom + "@" + digCommandsKey(region);
    if (key !== this.key) {
      this.graphics.clear();
      drawDigCells(this.graphics, region, zoom, 0, 0, 1);
      this.graphics.lineStyle(
        digEdgeThickness(zoom) * 1.5,
        SELECTION_EDGE_COLOR,
        1,
      );
      for (const [x0, y0, x1, y1] of digOverlayGeometry(region, zoom).edges) {
        this.graphics.moveTo(x0, y0);
        this.graphics.lineTo(x1, y1);
      }
      this.graphics.lineStyle(0);
      this.key = key;
    }
    this.graphics.visible = true;
    this.graphics.x = camera.cameraOffset.x * zoom;
    this.graphics.y = camera.cameraOffset.y * zoom;
  }
}
