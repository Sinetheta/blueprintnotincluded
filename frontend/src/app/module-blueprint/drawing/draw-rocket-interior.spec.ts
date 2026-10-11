import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import db from "../../../assets/database/database-2024.json";
import {
  Blueprint,
  BlueprintHelpers,
  BuildableElement,
  BuildMenuCategory,
  BuildMenuItem,
  CameraService,
  ImageSource,
  OniItem,
  Overlay,
  ROCKET_BACKDROP,
  ROCKET_CONTROL_STATION_ID,
  SpriteInfo,
  SpriteModifier,
  Vector2,
  rocketInteriorLayout,
} from "../../../../../lib/index";
import { DrawPixi } from "./draw-pixi";
import { DrawRocketInterior } from "./draw-rocket-interior";

// The hull is built from real OniItems, so the shipped database has to be
// loaded the way the app boots it (same order as the backend's test helper).
function loadGameDatabase() {
  if (OniItem.oniItemsMap != null) return;
  const database = db as any;
  ImageSource.init();
  BuildableElement.init();
  BuildableElement.load(database.elements);
  BuildMenuCategory.init();
  BuildMenuCategory.load(database.buildMenuCategories);
  BuildMenuItem.init();
  BuildMenuItem.load(database.buildMenuItems);
  SpriteInfo.init();
  SpriteInfo.load(database.uiSprites);
  SpriteModifier.init();
  SpriteModifier.load(database.spriteModifiers);
  OniItem.init();
  OniItem.load(database.buildings);
}

// PIXI is always mocked in specs. The facade touches containers (with
// addChild/addChildAt, zIndex, sortable children), sprites and one graphics
// for the vignette bands; the hull's BlueprintItems draw through the same
// factories, so a node must satisfy what BlueprintItem.drawPixi asks of a
// container too (scale, children, ...).
function makeNode(): any {
  const node: any = {
    visible: true,
    zIndex: 0,
    alpha: 1,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    scale: { x: 1, y: 1 },
    anchor: { set: vi.fn() },
    children: [] as any[],
    addChild: vi.fn((child: any) => {
      node.children.push(child);
      return child;
    }),
    addChildAt: vi.fn((child: any, index: number) => {
      node.children.splice(index, 0, child);
      return child;
    }),
    removeChild: vi.fn(),
    destroy: vi.fn(),
    clear: vi.fn(),
    beginFill: vi.fn(),
    endFill: vi.fn(),
    lineStyle: vi.fn(),
    drawRect: vi.fn(),
    texture: null,
  };
  return node;
}

function makeDrawPixi() {
  const sprites: any[] = [];
  const drawPixi = {
    getNewContainer: vi.fn(makeNode),
    getNewGraphics: vi.fn(makeNode),
    getNewBaseTexture: vi.fn((url: string) => `texture:${url}`),
    getNewTexture: vi.fn(() => ({})),
    getNewTextureWhole: vi.fn(() => ({})),
    getNewRectangle: vi.fn(() => ({})),
    getSpriteFrom: vi.fn(() => {
      const sprite = makeNode();
      sprites.push(sprite);
      return sprite;
    }),
    getUtilityGraphicsBack: vi.fn(makeNode),
    getUtilityGraphicsFront: vi.fn(makeNode),
  };
  return { drawPixi: drawPixi as unknown as DrawPixi, sprites };
}

function makeCamera(): CameraService {
  const camera = new CameraService(makeNode());
  camera.setHardZoom(10);
  camera.cameraOffset = new Vector2(2, 12);
  camera.overlay = Overlay.Base;
  return camera;
}

// A blueprint whose station sits at (4, 1): the small template then lands on
// origin (4, 3), as in the real capture the lib tests use.
function stationBlueprint(): Blueprint {
  const blueprint = new Blueprint();
  const station = BlueprintHelpers.createInstance(ROCKET_CONTROL_STATION_ID)!;
  station.importMdbBuilding({
    id: ROCKET_CONTROL_STATION_ID,
    position: new Vector2(4, 1),
  });
  blueprint.addBlueprintItem(station);
  return blueprint;
}

describe("DrawRocketInterior", () => {
  beforeAll(() => {
    loadGameDatabase();
  });

  let stage: any;
  let blueprintContainer: any;
  let made: ReturnType<typeof makeDrawPixi>;
  let overlay: DrawRocketInterior;
  const viewport = { width: 400, height: 300 };

  beforeEach(() => {
    stage = makeNode();
    stage.addChild(makeNode()); // the grid graphics, which must stay above
    blueprintContainer = makeNode();
    made = makeDrawPixi();
    overlay = new DrawRocketInterior(
      made.drawPixi,
      blueprintContainer,
      stage,
      true,
    );
  });

  it("parks the backdrop under the stage's first child and the hull below every building", () => {
    expect(stage.addChildAt).toHaveBeenCalledWith(expect.anything(), 0);
    expect(stage.children[0].zIndex).toBe(DrawRocketInterior.BACKDROP_Z);
    expect(blueprintContainer.children[0].zIndex).toBe(
      DrawRocketInterior.HULL_Z,
    );
    expect(overlay.active).toBe(false);
    expect(stage.children[0].visible).toBe(false);
  });

  it("draws nothing for no module and clears after one", () => {
    const camera = makeCamera();
    expect(overlay.draw(null, stationBlueprint(), camera, viewport)).toBeNull();
    expect(made.sprites).toHaveLength(0);

    overlay.draw("small", stationBlueprint(), camera, viewport);
    expect(overlay.active).toBe(true);
    overlay.draw(null, stationBlueprint(), camera, viewport);
    expect(overlay.active).toBe(false);
    expect(stage.children[0].visible).toBe(false);
    expect(blueprintContainer.children[0].visible).toBe(false);
    expect(overlay.hullItems).toHaveLength(0);
  });

  it("builds the hull aligned on the station and places the backdrop sprites", () => {
    const camera = makeCamera();
    const placement = overlay.draw(
      "small",
      stationBlueprint(),
      camera,
      viewport,
    )!;
    expect(placement.anchor).toBe("station");
    expect(placement.origin).toEqual({ x: 4, y: 3 });

    const layout = rocketInteriorLayout("small");
    expect(overlay.hullItems).toHaveLength(layout.pieces.length);
    // Every hull item was drawn into the hull container through its own
    // camera: one PIXI container per item, plus the door sprite.
    const hull = blueprintContainer.children[0];
    expect(hull.children.length).toBeGreaterThanOrEqual(
      layout.pieces.length + 1,
    );

    // Backdrop: three star layers, the moon, the vignette, the bands.
    const starUrls = ROCKET_BACKDROP.stars.map((l) => l.url);
    const textured = made.sprites.map((s) => s.texture);
    for (const url of starUrls) expect(textured).toContain(`texture:${url}`);
    expect(textured).toContain(`texture:${ROCKET_BACKDROP.moon.url}`);
    expect(textured).toContain(`texture:${ROCKET_BACKDROP.vignette.url}`);
    expect(textured).toContain(`texture:${ROCKET_BACKDROP.door.url}`);

    // The star layers cover the viewport.
    const stars = made.sprites.filter((s) =>
      starUrls.some((url) => s.texture === `texture:${url}`),
    );
    expect(stars).toHaveLength(starUrls.length);
    for (const star of stars) {
      expect(star.x).toBeLessThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(0);
      expect(star.x + star.width).toBeGreaterThanOrEqual(viewport.width);
      expect(star.y + star.height).toBeGreaterThanOrEqual(viewport.height);
    }
  });

  it("keeps a station-less hull where the stored origin says as bricks are added", () => {
    const camera = makeCamera();
    const blueprint = new Blueprint();
    const brick = (x: number, y: number) => {
      const tile = BlueprintHelpers.createInstance("Tile")!;
      tile.importMdbBuilding({ id: "Tile", position: new Vector2(x, y) });
      blueprint.addBlueprintItem(tile);
    };
    brick(0, 0);
    const stored = { x: 4, y: 3 };
    const first = overlay.draw("small", blueprint, camera, viewport, stored)!;
    expect(first.anchor).toBe("stored");
    expect(first.origin).toEqual(stored);
    const hull = overlay.hullItems;

    // Without a stored origin the bounds fallback would re-centre on the new
    // extent; with one, nothing moves and nothing is rebuilt.
    brick(30, 25);
    const second = overlay.draw("small", blueprint, camera, viewport, stored)!;
    expect(second.origin).toEqual(stored);
    expect(overlay.hullItems).toBe(hull);

    const moved = overlay.draw("small", blueprint, camera, viewport, null)!;
    expect(moved.anchor).toBe("bounds");
    expect(moved.origin).not.toEqual(stored);
  });

  it("keeps its hull while the placement is unchanged and rebuilds when the station moves", () => {
    const camera = makeCamera();
    const blueprint = stationBlueprint();
    overlay.draw("small", blueprint, camera, viewport);
    const before = overlay.hullItems;
    overlay.draw("small", blueprint, camera, viewport);
    expect(overlay.hullItems).toBe(before);

    blueprint.blueprintItems[0].position = new Vector2(10, 10);
    overlay.draw("small", blueprint, camera, viewport);
    expect(overlay.hullItems).not.toBe(before);
    expect(before[0].destroyed).toBe(true);

    overlay.draw("medium", blueprint, camera, viewport);
    expect(overlay.hullItems).toHaveLength(
      rocketInteriorLayout("medium").pieces.length,
    );
  });
});
