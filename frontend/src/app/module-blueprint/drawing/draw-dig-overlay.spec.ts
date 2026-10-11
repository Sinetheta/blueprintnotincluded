import { BniDigCommand, Vector2 } from "../../../../../lib/index";
import { DrawDigOverlay } from "./draw-dig-overlay";
import { DrawPixi } from "./draw-pixi";

describe("DrawDigOverlay", () => {
  let graphics: any;
  let parent: { addChild: ReturnType<typeof vi.fn> };
  let overlay: DrawDigOverlay;
  const camera = (zoom: number, x = 0, y = 0) =>
    ({ currentZoom: zoom, cameraOffset: new Vector2(x, y) }) as any;

  beforeEach(() => {
    graphics = {
      visible: true,
      x: 0,
      y: 0,
      zIndex: 0,
      clear: vi.fn(),
      lineStyle: vi.fn(),
      beginFill: vi.fn(),
      endFill: vi.fn(),
      drawRect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    };
    parent = { addChild: vi.fn() };
    const drawPixi = {
      getNewGraphics: () => graphics,
    } as unknown as DrawPixi;
    overlay = new DrawDigOverlay(drawPixi, parent);
  });

  it("joins its parent under the buildings", () => {
    expect(parent.addChild).toHaveBeenCalledWith(graphics);
    expect(graphics.zIndex).toBe(DrawDigOverlay.UNDER_BUILDINGS_Z);
  });

  it("builds the cells once, and only moves them when the camera pans", () => {
    const digs: BniDigCommand[] = [{ x: 1, y: 1 }];
    overlay.draw(digs, camera(10));
    expect(graphics.drawRect).toHaveBeenCalledOnce();
    overlay.draw(digs, camera(10, 3, 4));
    expect(graphics.drawRect).toHaveBeenCalledOnce();
    expect(graphics.x).toBe(30);
    expect(graphics.y).toBe(40);
  });

  it("rebuilds when a cell is painted in place, or the zoom changes", () => {
    const digs: BniDigCommand[] = [{ x: 1, y: 1 }];
    overlay.draw(digs, camera(10));
    digs.push({ x: 2, y: 1 });
    overlay.draw(digs, camera(10));
    expect(graphics.drawRect).toHaveBeenCalledTimes(3);
    overlay.draw(digs, camera(12));
    expect(graphics.drawRect).toHaveBeenCalledTimes(5);
  });

  it("hides for no cells and after clear, and draws again afterwards", () => {
    const digs: BniDigCommand[] = [{ x: 0, y: 0 }];
    overlay.draw(digs, camera(10));
    overlay.clear();
    expect(graphics.visible).toBe(false);
    overlay.draw(digs, camera(10));
    expect(graphics.visible).toBe(true);
    expect(graphics.drawRect).toHaveBeenCalledTimes(2);
    overlay.draw([], camera(10));
    expect(graphics.visible).toBe(false);
  });
});
