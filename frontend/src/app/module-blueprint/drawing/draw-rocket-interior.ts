import {
  Blueprint,
  BlueprintItem,
  CameraService,
  RocketInteriorCell,
  RocketInteriorModule,
  RocketInteriorPlacement,
  buildRocketInteriorScenery,
  drawVignetteBands,
  placeRocketInterior,
  placeSprite,
  rocketBackdropGeometry,
  rocketInteriorPlacementKey,
  stableSortChildren,
  Viewport,
} from "../../../../../lib/index";
import { DrawPixi } from "./draw-pixi";

// The rocket-interior facade on a PIXI canvas: the landed backdrop (star
// field, moon, vignette) and the habitat module's fixed interior, aligned on
// the blueprint's control station, all drawn *under* the blueprint.
//
// Two containers, because the two halves want different parents in the live
// editor: the backdrop goes under the grid lines (stage, index 0), the hull
// goes into the blueprint container at a depth below every building. Export
// snapshots put both into their scratch container and let zIndex sort them.
//
// What is drawn, and where, is decided in lib (rocket-interior.ts for the
// hull, rocket-backdrop.ts for everything else — THE place to retune the
// look). This class only owns PIXI objects and their per-frame placement, in
// the same create-once/mutate-per-frame style as the other overlays.
//
// The hull is a throwaway Blueprint of real BlueprintItems drawn with the
// same drawPixi the blueprint uses, through a private camera that tracks the
// live one: that keeps the wall and window tiles joined, the ports' art, the
// station — and the overlay/display treatment — identical to the blueprint's
// own, with no special cases in BlueprintItem.
export class DrawRocketInterior {
  // Under everything in the parent, by zIndex: the backdrop, then the hull.
  static readonly BACKDROP_Z = -20000;
  static readonly HULL_Z = -10000;

  private backdropContainer: any;
  private starSprites: any[] = [];
  private moonSprite: any;
  private vignetteSprite: any;
  private vignetteBands: any;

  private hullContainer: any;
  private hullCamera: CameraService;
  private doorSprite: any;
  private scenery: Blueprint | null = null;
  private placementKey: string | null = null;
  private lastOverlayState: string | null = null;

  // `sceneryParent` receives the hull; `backdropParent` the backdrop. With
  // `backdropAtBottom` the backdrop is inserted as the parent's first child
  // (the editor stage is not zIndex-sorted); otherwise its zIndex places it.
  constructor(
    private drawPixi: DrawPixi,
    sceneryParent: any,
    backdropParent: any = sceneryParent,
    backdropAtBottom: boolean = false,
  ) {
    this.backdropContainer = drawPixi.getNewContainer();
    this.backdropContainer.zIndex = DrawRocketInterior.BACKDROP_Z;
    this.backdropContainer.visible = false;
    if (backdropAtBottom && backdropParent.addChildAt != null)
      backdropParent.addChildAt(this.backdropContainer, 0);
    else backdropParent.addChild(this.backdropContainer);

    this.hullContainer = drawPixi.getNewContainer();
    this.hullContainer.zIndex = DrawRocketInterior.HULL_Z;
    this.hullContainer.sortableChildren = true;
    this.hullContainer.visible = false;
    sceneryParent.addChild(this.hullContainer);
    this.hullCamera = new CameraService(this.hullContainer);
  }

  get active(): boolean {
    return this.placementKey != null;
  }

  clear() {
    if (this.scenery != null) {
      for (const item of this.scenery.blueprintItems) item.destroy();
      this.scenery = null;
    }
    this.placementKey = null;
    this.lastOverlayState = null;
    this.backdropContainer.visible = false;
    this.hullContainer.visible = false;
  }

  // Draws the facade for `module` behind `blueprint`, or clears it for null.
  // `storedOrigin` is the record's rocketInteriorOrigin (see
  // BlueprintService.setRocketInterior): without it a station-less blueprint
  // would be re-centred as it grows. Returns the placement in use, for
  // callers that frame around the hull.
  draw(
    module: RocketInteriorModule | null | undefined,
    blueprint: Blueprint | null | undefined,
    camera: CameraService,
    viewport: Viewport,
    storedOrigin: RocketInteriorCell | null | undefined = null,
  ): RocketInteriorPlacement | null {
    if (module == null || blueprint == null) {
      if (this.active) this.clear();
      return null;
    }

    const placement = placeRocketInterior(module, blueprint, storedOrigin);
    const key = rocketInteriorPlacementKey(placement);
    if (key !== this.placementKey) {
      this.rebuildHull(placement);
      this.placementKey = key;
    }

    this.backdropContainer.visible = true;
    this.hullContainer.visible = true;

    this.drawBackdrop(placement, camera, viewport);
    this.drawHull(camera);
    return placement;
  }

  private rebuildHull(placement: RocketInteriorPlacement) {
    if (this.scenery != null)
      for (const item of this.scenery.blueprintItems) item.destroy();
    this.scenery = buildRocketInteriorScenery(placement);
    // Items create their PIXI containers on first drawPixi, against whatever
    // overlay the camera has then; force the treatment to be recomputed.
    this.lastOverlayState = null;
  }

  private ensureBackdropSprites(starCount: number) {
    while (this.starSprites.length < starCount) {
      const sprite = this.drawPixi.getSpriteFrom(
        "assets/images/rocket-interior/space_day_00.png",
      );
      sprite.anchor.set(0, 0);
      this.backdropContainer.addChild(sprite);
      this.starSprites.push(sprite);
    }
    if (this.moonSprite == null) {
      this.moonSprite = this.drawPixi.getSpriteFrom(
        "assets/images/rocket-interior/moon_landed.png",
      );
      this.moonSprite.anchor.set(0, 0);
      this.backdropContainer.addChild(this.moonSprite);
    }
    if (this.vignetteSprite == null) {
      this.vignetteSprite = this.drawPixi.getSpriteFrom(
        "assets/images/rocket-interior/vignette.png",
      );
      this.vignetteSprite.anchor.set(0, 0);
      this.backdropContainer.addChild(this.vignetteSprite);
      this.vignetteBands = this.drawPixi.getNewGraphics();
      this.backdropContainer.addChild(this.vignetteBands);
    }
    if (this.doorSprite == null) {
      this.doorSprite = this.drawPixi.getSpriteFrom(
        "assets/ui_image/ClustercraftInteriorDoor.png",
      );
      this.doorSprite.anchor.set(0, 0);
      // Under the wall tiles, which overlap its right half.
      this.doorSprite.zIndex = -1e6;
      this.hullContainer.addChild(this.doorSprite);
    }
  }

  private drawBackdrop(
    placement: RocketInteriorPlacement,
    camera: CameraService,
    viewport: Viewport,
  ) {
    const geometry = rocketBackdropGeometry(
      placement,
      {
        zoom: camera.currentZoom,
        offsetX: camera.cameraOffset.x,
        offsetY: camera.cameraOffset.y,
      },
      viewport,
    );
    this.ensureBackdropSprites(geometry.stars.length);

    geometry.stars.forEach((layer, i) => {
      const sprite = this.starSprites[i];
      // Textures are resolved by url each frame so a retuned layer list just
      // works; PIXI caches by url, so this is a map lookup.
      sprite.texture = this.drawPixi.getNewBaseTexture(layer.url);
      placeSprite(sprite, layer);
    });
    this.moonSprite.texture = this.drawPixi.getNewBaseTexture(
      geometry.moon.url,
    );
    placeSprite(this.moonSprite, geometry.moon);
    this.vignetteSprite.texture = this.drawPixi.getNewBaseTexture(
      geometry.vignette.url,
    );
    placeSprite(this.vignetteSprite, geometry.vignette);
    drawVignetteBands(
      this.vignetteBands,
      geometry.vignetteBands,
      geometry.vignette.alpha,
    );
    this.doorSprite.texture = this.drawPixi.getNewBaseTexture(
      geometry.door.url,
    );
    placeSprite(this.doorSprite, geometry.door);
  }

  private drawHull(camera: CameraService) {
    if (this.scenery == null) return;

    // Track the live camera. The offset is shared by reference so panning is
    // free; the setters below only emit when the value changes.
    this.hullCamera.cameraOffset = camera.cameraOffset;
    this.hullCamera.setHardZoom(camera.currentZoom);
    this.hullCamera.overlay = camera.overlay;
    this.hullCamera.display = camera.display;
    this.hullCamera.visualization = camera.visualization;
    this.hullCamera.sinWave = camera.sinWave;

    const overlayState = `${camera.overlay}/${camera.display}/${camera.visualization}`;
    const overlayChanged = overlayState !== this.lastOverlayState;
    if (overlayChanged) {
      for (const item of this.scenery.blueprintItems)
        item.cameraChanged(this.hullCamera);
      this.lastOverlayState = overlayState;
    }

    for (const item of this.scenery.blueprintItems)
      item.drawPixi(this.hullCamera, this.drawPixi);

    // Depths only move with the overlay, and containers appear on the first
    // draw; sort then rather than every frame.
    if (overlayChanged || this.hullCamera.triggerSortChildren) {
      stableSortChildren(this.hullContainer);
      this.hullCamera.triggerSortChildren = false;
    }
  }

  // For tests and the export paths: the items currently standing in for the
  // hull.
  get hullItems(): BlueprintItem[] {
    return this.scenery?.blueprintItems ?? [];
  }
}
