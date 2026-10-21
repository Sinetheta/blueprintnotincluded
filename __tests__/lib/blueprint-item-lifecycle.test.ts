import { describe, it } from 'mocha';
import { expect } from 'chai';
import { BlueprintItem, CameraService, Overlay, Vector2 } from '../../lib/index';
import { loadGameDatabase } from '../helpers/roomFixtures';

// A destroyed BlueprintItem used to stay indistinguishable from a live one:
// destroy() left containerCreated = true and the destroyed PIXI container in
// place, so any drawing path that still held a reference hit `container.x =` on
// a null transform. drawPixi runs inside the PIXI ticker, where one throw stops
// every later frame -- the editor simply stops repainting, with no build
// preview and no visible response to anything.
describe('BlueprintItem lifecycle after destroy', function () {
  // Minimal stand-ins: destroy() and drawPixi only touch these members, and a
  // real PIXI container cannot be built under mocha.
  const fakeContainer = () => {
    const calls = { destroyed: 0 };
    return {
      calls,
      destroy() {
        calls.destroyed++;
      },
    };
  };

  const makeItem = () => {
    loadGameDatabase();
    const item = new BlueprintItem('Tile');
    item.cleanUp();
    return item;
  };

  it('drops the PIXI container instead of keeping a destroyed one', function () {
    const item = makeItem();
    const container = fakeContainer();
    item.container = container;
    item.containerCreated = true;

    item.destroy();

    expect(container.calls.destroyed, 'container destroyed').to.equal(1);
    expect(item.container, 'container reference').to.equal(null);
    expect(item.containerCreated, 'containerCreated').to.equal(false);
    expect(item.destroyed).to.equal(true);
  });

  it('destroys and clears the utility sprites', function () {
    const item = makeItem();
    const a = fakeContainer();
    const b = fakeContainer();
    item.utilitySprites = [a, null, b];

    item.destroy();

    expect(a.calls.destroyed).to.equal(1);
    expect(b.calls.destroyed).to.equal(1);
    expect(item.utilitySprites).to.deep.equal([]);
  });

  it('is idempotent', function () {
    const item = makeItem();
    const container = fakeContainer();
    item.container = container;
    item.containerCreated = true;

    item.destroy();
    item.destroy();

    expect(container.calls.destroyed).to.equal(1);
  });

  it('setDrawnVisible toggles the container and the utility sprites', function () {
    const item = makeItem();
    const container: any = { visible: true, destroy() {} };
    const spriteA: any = { visible: true, destroy() {} };
    item.container = container;
    item.utilitySprites = [spriteA, null];

    item.setDrawnVisible(false);
    expect(container.visible).to.equal(false);
    expect(spriteA.visible).to.equal(false);

    item.setDrawnVisible(true);
    expect(container.visible).to.equal(true);
    expect(spriteA.visible).to.equal(true);
  });

  it('setDrawnVisible does not throw when nothing has been drawn', function () {
    const item = makeItem();
    expect(() => item.setDrawnVisible(false)).to.not.throw();
  });

  // The safety net. Without it, clearing the container above would make the
  // next draw build a fresh one and resurrect an item that is meant to be gone.
  it('never draws once destroyed, and does not resurrect its container', function () {
    const item = makeItem();
    item.container = fakeContainer();
    item.containerCreated = true;
    item.destroy();

    const pixiUtil: any = {
      getNewContainer: () => {
        throw new Error('drawPixi rebuilt the container of a destroyed item');
      },
    };
    const camera: any = { overlay: 0, cameraOffset: { x: 0, y: 0 }, currentZoom: 32 };

    expect(() => item.drawPixi(camera, pixiUtil)).to.not.throw();
    expect(item.container).to.equal(null);
    expect(item.containerCreated).to.equal(false);
  });
});

// A disabled building (BlueprintsV2 `tempDisabled`) is dimmed through its
// container's alpha -- but its port markers are drawn on the camera's container,
// which that alpha never reaches. They used to stay fully opaque over a building
// drawn as switched off.
describe('BlueprintItem port markers on a disabled building', function () {
  const fakeSprite = () => ({
    visible: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    alpha: 1,
    texture: { baseTexture: { valid: true } },
  });

  // A Liquid Pump has a liquid output, shown in the Liquid overlay. Sprites are
  // seeded so the draw skips texture creation, which needs a real PIXI.
  const drawPorts = (item: BlueprintItem, overlay: Overlay) => {
    item.utilitySprites = item.oniItem.utilityConnections.map(() => fakeSprite());
    const camera = { overlay, cameraOffset: new Vector2(0, 0), currentZoom: 32 };
    (item as any).drawPixiUtility(camera, {});
    return item.utilitySprites.filter((sprite: any) => sprite.visible);
  };

  const makePump = () => {
    loadGameDatabase();
    const item = new BlueprintItem('LiquidPump');
    item.cleanUp();
    return item;
  };

  it('dims the markers with the building', function () {
    const item = makePump();
    item.tempDisabled = true;
    const shown = drawPorts(item, Overlay.Liquid);
    expect(shown.length, 'markers in the liquid overlay').to.be.greaterThan(0);
    for (const sprite of shown) expect(sprite.alpha).to.equal(BlueprintItem.tempDisabledAlpha);
  });

  it('leaves an enabled building\'s markers opaque', function () {
    const shown = drawPorts(makePump(), Overlay.Liquid);
    expect(shown.length).to.be.greaterThan(0);
    for (const sprite of shown) expect(sprite.alpha).to.equal(1);
  });

  it('restores them when the building is re-enabled, on markers that already exist', function () {
    const item = makePump();
    item.tempDisabled = true;
    const sprites = item.oniItem.utilityConnections.map(() => fakeSprite());
    const camera = { overlay: Overlay.Liquid, cameraOffset: new Vector2(0, 0), currentZoom: 32 };
    item.utilitySprites = sprites;
    (item as any).drawPixiUtility(camera, {});
    item.tempDisabled = false;
    (item as any).drawPixiUtility(camera, {});
    const shown = sprites.filter(s => s.visible);
    expect(shown.length, 'markers in the liquid overlay').to.be.greaterThan(0);
    for (const sprite of shown) expect(sprite.alpha).to.equal(1);
  });
});

// Items outside the camera's viewport keep their container up to date but are
// taken out of PIXI's render pass; a camera with no viewport culls nothing.
describe('BlueprintItem off-screen culling', function () {
  // PIXI stand-ins: drawPixi only needs the container to accept children and
  // hold the transform fields it sets; sprites and textures can be anything.
  const anything: any = new Proxy(function () {}, {
    get: (_t, p) => (p === 'then' ? undefined : anything),
    apply: () => anything,
    set: () => true,
  });
  const makeContainer = () => ({ scale: {}, renderable: true, addChild() {} });
  const pixiUtil: any = {
    getNewContainer: makeContainer,
    getNewBaseTexture: () => anything,
    getNewTextureWhole: () => anything,
    getNewTexture: () => anything,
    getNewRectangle: () => anything,
    getSpriteFrom: () => anything,
  };
  // 1000x500 px at 50 px per cell: cells x in [10, 30), y in (90, 100] are on screen.
  const makeCamera = () => {
    const camera = new CameraService({ addChild() {} });
    camera.currentZoom = 50;
    camera.cameraOffset = new Vector2(-10, 100);
    camera.viewportSize = new Vector2(1000, 500);
    return camera;
  };
  const itemAt = (x: number, y: number) => {
    loadGameDatabase();
    const item = new BlueprintItem('Tile');
    item.cleanUp();
    item.position = new Vector2(x, y);
    item.prepareBoundingBox();
    return item;
  };

  it('renders an item inside the viewport and skips one far outside it', function () {
    const camera = makeCamera();
    const inside = itemAt(20, 95);
    inside.drawPixi(camera, pixiUtil);
    expect(inside.container.renderable).to.equal(true);

    const outside = itemAt(200, 95);
    outside.drawPixi(camera, pixiUtil);
    expect(outside.container.renderable).to.equal(false);
  });

  it('follows the item and the camera from frame to frame', function () {
    const camera = makeCamera();
    const item = itemAt(200, 95);
    item.drawPixi(camera, pixiUtil);
    expect(item.container.renderable).to.equal(false);

    camera.cameraOffset = new Vector2(-190, 100);
    item.drawPixi(camera, pixiUtil);
    expect(item.container.renderable).to.equal(true);

    item.position = new Vector2(20, 95);
    item.prepareBoundingBox();
    item.drawPixi(camera, pixiUtil);
    expect(item.container.renderable).to.equal(false);
  });

  it('culls nothing for a camera without a viewport', function () {
    const camera = makeCamera();
    camera.viewportSize = null;
    const item = itemAt(200, 95);
    item.drawPixi(camera, pixiUtil);
    expect(item.container.renderable).to.equal(true);
  });
});
