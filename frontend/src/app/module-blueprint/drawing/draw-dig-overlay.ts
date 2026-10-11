import {
  BniDigCommand,
  CameraService,
  DIG_AT_REST_ALPHA,
  digCommandsKey,
  drawDigCells,
} from "../../../../../lib/index";
import { DrawPixi } from "./draw-pixi";

// Cells the blueprint marks for digging. The look is decided in lib
// (lib/src/drawing/dig-markers.ts), which the server preview worker shares;
// this class owns the PIXI object and its per-frame placement.
//
// A capture carries a dig on every non-solid cell of its selection — easily
// thousands — so the geometry is built once per change of cells or zoom, in
// coordinates relative to cell (0, 0), and panning only moves the Graphics.
export class DrawDigOverlay {
  // Under every building (their containers sort by depth, about -2..134) and
  // over the rocket-interior hull (-10000), when the parent sorts by zIndex.
  static readonly UNDER_BUILDINGS_Z = -5000;

  private graphics: any;
  private key: string | null = null;

  // `parent` defaults to the live app stage, which draws in insertion order;
  // the export snapshots and the editor's under-the-buildings layer pass a
  // zIndex-sorted container instead. `alpha` is the treatment's strength:
  // DIG_AT_REST_ALPHA under the buildings, 1 for the Dig tool's layer on top.
  constructor(
    drawPixi: DrawPixi,
    parent: any = drawPixi.pixiApp.stage,
    private alpha: number = DIG_AT_REST_ALPHA,
  ) {
    this.graphics = drawPixi.getNewGraphics();
    this.graphics.zIndex = DrawDigOverlay.UNDER_BUILDINGS_Z;
    parent.addChild(this.graphics);
  }

  clear() {
    if (this.key == null) return;
    this.graphics.clear();
    this.graphics.visible = false;
    this.key = null;
  }

  draw(digs: BniDigCommand[] | null | undefined, camera: CameraService) {
    if (digs == null || digs.length === 0) {
      this.clear();
      return;
    }

    const zoom = camera.currentZoom;
    const key = zoom + "@" + digCommandsKey(digs);
    if (key !== this.key) {
      this.graphics.clear();
      drawDigCells(this.graphics, digs, zoom, 0, 0, this.alpha);
      this.key = key;
    }
    this.graphics.visible = true;
    this.graphics.x = camera.cameraOffset.x * zoom;
    this.graphics.y = camera.cameraOffset.y * zoom;
  }
}
