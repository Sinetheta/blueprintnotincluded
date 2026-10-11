import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import {
  Blueprint,
  BniBlueprint,
  OniItem,
  Vector2,
  ROCKET_INTERIOR_MODULES,
  ROCKET_INTERIOR_LAYOUT_SOURCES,
  ROCKET_INTERIOR_GLYPHS,
  ROCKET_CONTROL_STATION_ID,
  ROCKET_INTERIOR_ART,
  buildRocketInteriorScenery,
  expandBoundsForRocketInterior,
  isRocketInteriorModule,
  isRocketInteriorCell,
  parseRocketInteriorLayout,
  placeRocketInterior,
  rocketInteriorLayout,
  rocketInteriorOriginCentred,
  rocketInteriorOriginFromStation,
  rocketInteriorPlacementKey,
  rocketInteriorWorldBounds,
  rocketInteriorWorldDoor,
  rocketInteriorWorldPieces,
  rocketBackdropGeometry,
  bandsAround,
  coverViewport,
  worldRectToScreen,
  ROCKET_BACKDROP,
} from '../../lib';
import { loadGameDatabase } from '../helpers/roomFixtures';

// A REAL capture: a small habitat (nose cone) with bricks placed inside and
// outside the hull, as the Blueprints mod emits it. The station sits at mod
// offset (4, 1); the dig commands are the selection rectangle (x 0..9, y 0..7)
// minus the solid cells, so x = 0 and x = 9 are the columns outside the hull.
const SMALL_CAPTURE_PATH = path.join(
  __dirname,
  '../fixtures/rocket-small-blocks-in-and-out.blueprint'
);

describe('Rocket interior', function () {
  let capture: BniBlueprint;

  before(function () {
    loadGameDatabase();
    capture = JSON.parse(fs.readFileSync(SMALL_CAPTURE_PATH, 'utf8'));
  });

  describe('layout table', function () {
    it('tables both modules with the game template sizes', () => {
      expect(ROCKET_INTERIOR_MODULES).to.deep.equal(['small', 'medium']);
      const small = rocketInteriorLayout('small');
      const medium = rocketInteriorLayout('medium');
      expect([small.width, small.height]).to.deep.equal([8, 8]);
      expect([medium.width, medium.height]).to.deep.equal([12, 11]);
      expect(small.prefabId).to.equal('HabitatModuleSmall');
      expect(medium.prefabId).to.equal('HabitatModuleMedium');
    });

    it('places the station and the door where the game templates do', () => {
      const small = rocketInteriorLayout('small');
      const medium = rocketInteriorLayout('medium');
      expect(small.stationOrigin).to.deep.equal({ x: 0, y: -2 });
      expect(medium.stationOrigin).to.deep.equal({ x: 0, y: -3 });
      expect(small.door).to.deep.equal({ x: -3, y: -2 });
      expect(medium.door).to.deep.equal({ x: -5, y: -3 });
      // The door is on a wall cell, and its art hangs out through the wall.
      for (const layout of [small, medium])
        expect(
          layout.pieces.some(
            p => p.id === 'RocketWallTile' && p.x === layout.door.x && p.y === layout.door.y
          )
        ).to.equal(true);
    });

    it('carries the fixed ports, four windows per module, and one station', () => {
      const count = (module: 'small' | 'medium', id: string) =>
        rocketInteriorLayout(module).pieces.filter(p => p.id === id).length;
      for (const module of ROCKET_INTERIOR_MODULES) {
        expect(count(module, ROCKET_CONTROL_STATION_ID)).to.equal(1);
        expect(count(module, 'RocketInteriorGasOutputPort')).to.equal(1);
        expect(count(module, 'RocketInteriorGasInputPort')).to.equal(1);
        expect(count(module, 'RocketInteriorLiquidOutputPort')).to.equal(1);
        expect(count(module, 'RocketInteriorLiquidInputPort')).to.equal(1);
        // No power plug: players place their own.
        expect(count(module, 'RocketInteriorPowerPlug')).to.equal(0);
      }
      expect(count('small', 'RocketEnvelopeWindowTile')).to.equal(4);
      expect(count('medium', 'RocketEnvelopeWindowTile')).to.equal(6);
      expect(count('small', 'RocketWallTile')).to.equal(20);
      expect(count('medium', 'RocketWallTile')).to.equal(34);
    });

    it('every tabled piece is a building the database knows, so it can be drawn', () => {
      for (const id of Object.values(ROCKET_INTERIOR_GLYPHS))
        expect(() => OniItem.getOniItem(id), id).to.not.throw();
    });

    it('room cells and pieces partition the template; the station stands on room cells', () => {
      for (const module of ROCKET_INTERIOR_MODULES) {
        const layout = rocketInteriorLayout(module);
        const key = (c: { x: number; y: number }) => `${c.x},${c.y}`;
        const room = new Set(layout.room.map(key));
        for (const piece of layout.pieces)
          expect(room.has(key(piece)), `${module} ${piece.id} at ${key(piece)}`).to.equal(
            piece.id === ROCKET_CONTROL_STATION_ID
          );
        // The station's other three cells are room cells too.
        const s = layout.stationOrigin;
        for (const c of [
          { x: s.x + 1, y: s.y },
          { x: s.x, y: s.y + 1 },
          { x: s.x + 1, y: s.y + 1 },
        ])
          expect(room.has(key(c))).to.equal(true);
        const source = ROCKET_INTERIOR_LAYOUT_SOURCES.find(s => s.module === module)!;
        const templateCells = source.rows.reduce(
          (n, row) => n + (row.match(/..?/g) ?? []).filter(glyph => glyph !== '  ').length,
          0
        );
        expect(layout.room.length + layout.pieces.length - 1).to.equal(templateCells);
      }
    });

    it('rejects a grid with an unknown glyph or without a station', () => {
      const source = ROCKET_INTERIOR_LAYOUT_SOURCES[0];
      expect(() =>
        parseRocketInteriorLayout({ ...source, rows: source.rows.map(r => r.replace('CS', '..')) })
      ).to.throw(/no control station/);
      expect(() =>
        parseRocketInteriorLayout({ ...source, rows: source.rows.map(r => r.replace('CS', 'ZZ')) })
      ).to.throw(/unknown glyph/);
    });

    it('type-guards the stored value', () => {
      expect(isRocketInteriorModule('small')).to.equal(true);
      expect(isRocketInteriorModule('medium')).to.equal(true);
      expect(isRocketInteriorModule('large')).to.equal(false);
      expect(isRocketInteriorModule(null)).to.equal(false);
      expect(isRocketInteriorModule(undefined)).to.equal(false);
    });
  });

  describe('alignment on the control station', function () {
    it('puts the small template at (4, 3) for the real capture', () => {
      const blueprint = new Blueprint();
      blueprint.importFromBni(capture);
      const placement = placeRocketInterior('small', blueprint);
      expect(placement.anchor).to.equal('station');
      expect(placement.origin).to.deep.equal({ x: 4, y: 3 });

      // Dig commands are the non-solid cells of the selection rectangle, so
      // none of them may land on a piece of the aligned hull (the nose cone
      // narrows, so cells inside the hull's box can still be outside it); the
      // columns the selection took outside the hull (x = 0 and x = 9) must be
      // outside the hull's box.
      const hull = rocketInteriorWorldBounds(placement);
      expect(hull).to.deep.equal({ left: 1, right: 8, bottom: 0, top: 7 });
      const key = (c: { x: number; y: number }) => `${c.x},${c.y}`;
      const pieces = new Set(rocketInteriorWorldPieces(placement).map(key));
      const room = new Set(
        placement.layout.room.map(c => `${c.x + placement.origin.x},${c.y + placement.origin.y}`)
      );
      const solids = new Set(blueprint.blueprintItems.map(i => key(i.position)));
      for (const dig of capture.digcommands!) {
        const insideBox = dig.x >= hull.left && dig.x <= hull.right;
        expect([0, 9].includes(dig.x)).to.equal(!insideBox);
        expect(pieces.has(key(dig)), `dig ${key(dig)} on a hull piece`).to.equal(false);
      }
      // And every room cell is either dug or holds a placed building.
      for (const cell of room)
        expect(
          capture.digcommands!.some(d => key(d) === cell) || solids.has(cell),
          `room cell ${cell}`
        ).to.equal(true);
    });

    it("the template's station lands exactly on the blueprint's", () => {
      const blueprint = new Blueprint();
      blueprint.importFromBni(capture);
      for (const module of ROCKET_INTERIOR_MODULES) {
        const placement = placeRocketInterior(module, blueprint);
        const station = rocketInteriorWorldPieces(placement).find(
          p => p.id === ROCKET_CONTROL_STATION_ID
        )!;
        expect({ x: station.x, y: station.y }).to.deep.equal({ x: 4, y: 1 });
      }
      expect(placeRocketInterior('medium', blueprint).origin).to.deep.equal({ x: 4, y: 4 });
    });

    it('adds the mod offsets sign-for-sign (y up on both sides)', () => {
      const layout = rocketInteriorLayout('small');
      expect(
        rocketInteriorOriginFromStation(layout, [
          { id: ROCKET_CONTROL_STATION_ID, position: { x: -10, y: -20 } },
        ])
      ).to.deep.equal({ x: -10, y: -18 });
    });

    it('needs exactly one station', () => {
      const layout = rocketInteriorLayout('small');
      expect(rocketInteriorOriginFromStation(layout, [])).to.equal(null);
      expect(
        rocketInteriorOriginFromStation(layout, [
          { id: ROCKET_CONTROL_STATION_ID, position: { x: 0, y: 0 } },
          { id: ROCKET_CONTROL_STATION_ID, position: { x: 20, y: 0 } },
        ])
      ).to.equal(null);
      expect(
        rocketInteriorOriginFromStation(layout, [{ id: 'Tile', position: { x: 0, y: 0 } }])
      ).to.equal(null);
    });
  });

  describe('fallback without a station', function () {
    it('centres the template on the blueprint extent', () => {
      const layout = rocketInteriorLayout('small');
      // Hull cells span -3..4 horizontally and -3..4 vertically; centring on
      // 0..9 x 0..7 puts the template's centre of mass at the box's.
      expect(rocketInteriorOriginCentred(layout, { x: 0, y: 0 }, { x: 9, y: 7 })).to.deep.equal({
        x: 4,
        y: 3,
      });
      expect(rocketInteriorOriginCentred(layout, { x: 0, y: 0 }, { x: 0, y: 0 })).to.deep.equal({
        x: 0,
        y: 0,
      });
    });

    it('is what a capture with its station removed gets', () => {
      const blueprint = new Blueprint();
      blueprint.importFromBni({
        ...capture,
        buildings: capture.buildings.filter(b => b.buildingdef !== ROCKET_CONTROL_STATION_ID),
      });
      const placement = placeRocketInterior('small', blueprint);
      expect(placement.anchor).to.equal('bounds');
      // Bricks span x 0..9, y 1..6.
      expect(placement.origin).to.deep.equal({ x: 4, y: 3 });
    });

    it('keeps a stored origin ahead of centring, but a single station ahead of both', () => {
      const stationless = new Blueprint();
      stationless.importFromBni({
        ...capture,
        buildings: capture.buildings.filter(b => b.buildingdef !== ROCKET_CONTROL_STATION_ID),
      });
      const stored = placeRocketInterior('small', stationless, { x: -7, y: 9 });
      expect(stored.anchor).to.equal('stored');
      expect(stored.origin).to.deep.equal({ x: -7, y: 9 });

      const withStation = new Blueprint();
      withStation.importFromBni(capture);
      const placement = placeRocketInterior('small', withStation, { x: -7, y: 9 });
      expect(placement.anchor).to.equal('station');
      expect(placement.origin).to.deep.equal({ x: 4, y: 3 });
    });

    it('type-guards a stored origin', () => {
      expect(isRocketInteriorCell({ x: 1, y: -2 })).to.equal(true);
      expect(isRocketInteriorCell({ x: 1.5, y: 0 })).to.equal(false);
      expect(isRocketInteriorCell({ x: '1', y: 0 })).to.equal(false);
      expect(isRocketInteriorCell({ x: 1 })).to.equal(false);
      expect(isRocketInteriorCell(null)).to.equal(false);
      expect(isRocketInteriorCell('4,3')).to.equal(false);
    });

    it('sits on the origin for an empty blueprint', () => {
      const placement = placeRocketInterior('medium', new Blueprint());
      expect(placement.anchor).to.equal('bounds');
      expect(placement.origin).to.deep.equal({ x: 0, y: 0 });
    });
  });

  describe('world geometry', function () {
    it('keys a placement by module and origin', () => {
      const blueprint = new Blueprint();
      blueprint.importFromBni(capture);
      expect(rocketInteriorPlacementKey(placeRocketInterior('small', blueprint))).to.equal(
        'small:4,3:'
      );
    });

    it('drops the hull pieces the blueprint dug out', () => {
      // The real capture digs nothing on the hull (checked above): every piece
      // stands. Blow out the bottom-left corner wall at world (1, 0) and the
      // window at (1, 3), plus a dig on a room cell, which is not a piece.
      const blueprint = new Blueprint();
      blueprint.importFromBni({
        ...capture,
        digcommands: [...capture.digcommands!, { x: 1, y: 3 }, { x: 1, y: 0 }, { x: 5, y: 3 }],
      });
      const placement = placeRocketInterior('small', blueprint);
      expect(placement.anchor).to.equal('station');
      expect(placement.removed).to.deep.equal([
        { x: 1, y: 0 },
        { x: 1, y: 3 },
      ]);
      const pieces = rocketInteriorWorldPieces(placement);
      expect(pieces).to.have.length(placement.layout.pieces.length - 2);
      expect(pieces.some(p => p.x === 1 && p.y === 0)).to.equal(false);
      expect(pieces.some(p => p.x === 1 && p.y === 3)).to.equal(false);
      // Distinct scenery, so a per-frame renderer rebuilds.
      expect(rocketInteriorPlacementKey(placement)).to.equal('small:4,3:1,0;1,3');
      const scenery = buildRocketInteriorScenery(placement);
      expect(scenery.blueprintItems).to.have.length(pieces.length);
      // The neighbouring wall above the hole no longer joins downward.
      const above = scenery.blueprintItems.find(
        i => i.id === 'RocketWallTile' && i.position.x === 1 && i.position.y === 1
      ) as any;
      expect(above.tileConnections & 8).to.equal(0);
    });

    it('translates the door and widens a bounding box to the hull', () => {
      const blueprint = new Blueprint();
      blueprint.importFromBni(capture);
      const placement = placeRocketInterior('small', blueprint);
      expect(rocketInteriorWorldDoor(placement)).to.deep.equal({ x: 1, y: 1 });

      const [min, max] = expandBoundsForRocketInterior(
        [new Vector2(3, 3), new Vector2(5, 4)],
        placement
      );
      expect([min.x, min.y, max.x, max.y]).to.deep.equal([1, 0, 8, 7]);
      // Content outside the hull keeps the box wide.
      const [wideMin, wideMax] = expandBoundsForRocketInterior(
        [new Vector2(-5, -5), new Vector2(20, 20)],
        placement
      );
      expect([wideMin.x, wideMin.y, wideMax.x, wideMax.y]).to.deep.equal([-5, -5, 20, 20]);
      const box = [new Vector2(1, 2), new Vector2(3, 4)];
      expect(expandBoundsForRocketInterior(box, null)).to.equal(box);
    });

    it('builds drawable scenery with joined wall tiles', () => {
      const blueprint = new Blueprint();
      blueprint.importFromBni(capture);
      const placement = placeRocketInterior('small', blueprint);
      const scenery = buildRocketInteriorScenery(placement);
      expect(scenery.blueprintItems).to.have.length(placement.layout.pieces.length);
      // Windows draw as the plain Window Tile (edge-to-edge glass); the layout
      // itself still names the rocket window.
      expect(ROCKET_INTERIOR_ART.RocketEnvelopeWindowTile).to.equal('GlassTile');
      expect(scenery.blueprintItems.filter(i => i.id === 'GlassTile')).to.have.length(4);
      expect(scenery.blueprintItems.some(i => i.id === 'RocketEnvelopeWindowTile')).to.equal(false);
      expect(
        placement.layout.pieces.filter(p => p.id === 'RocketEnvelopeWindowTile')
      ).to.have.length(4);
      // Bottom-left corner wall at world (1, 0): a wall to its right and above,
      // so the tile joins right (+2) and up (+4).
      const corner = scenery.blueprintItems.find(
        i => i.id === 'RocketWallTile' && i.position.x === 1 && i.position.y === 0
      ) as any;
      expect(corner).to.exist;
      expect(corner.tileConnections).to.equal(2 + 4);
      // The scenery never touches the blueprint it decorates.
      expect(blueprint.blueprintItems).to.have.length(capture.buildings.length);
    });
  });

  describe('backdrop geometry', function () {
    const camera = { zoom: 10, offsetX: 2, offsetY: 12 };
    const viewport = { width: 400, height: 300 };

    it('maps world rects to screen with y down', () => {
      // A 2x3 rect whose bottom-left corner is the point (1, 1): its top edge
      // is at world y 4, i.e. screen (12 + 1 - 4) * 10 = 90.
      expect(worldRectToScreen(1, 1, 2, 3, camera)).to.deep.equal({
        x: 30,
        y: 90,
        width: 20,
        height: 30,
      });
    });

    it('covers the viewport with a layer and clamps its parallax shift', () => {
      const texture = { width: 100, height: 100 };
      expect(coverViewport(texture, viewport, 1, { x: 0, y: 0 })).to.deep.equal({
        x: 0,
        y: -50,
        width: 400,
        height: 400,
      });
      // scale 1.5 leaves 200px of horizontal slack; a 1000px shift uses 100.
      const shifted = coverViewport(texture, viewport, 1.5, { x: 1000, y: 0 });
      expect(shifted.width).to.equal(600);
      expect(shifted.x).to.equal(-100 + 100);
    });

    it('fills the viewport outside the vignette with bands', () => {
      const bands = bandsAround({ x: 100, y: 50, width: 200, height: 200 }, viewport);
      const area = bands.reduce((sum, b) => sum + b.width * b.height, 0);
      expect(area).to.equal(400 * 300 - 200 * 200);
      expect(bandsAround({ x: -10, y: -10, width: 500, height: 500 }, viewport)).to.deep.equal([]);
    });

    it("hangs the moon's crest on the hull floor and the door on the door cell", () => {
      const blueprint = new Blueprint();
      blueprint.importFromBni(capture);
      const placement = placeRocketInterior('small', blueprint);
      const geometry = rocketBackdropGeometry(placement, camera, viewport);

      expect(geometry.stars).to.have.length(ROCKET_BACKDROP.stars.length);
      for (const layer of geometry.stars) {
        expect(layer.rect.x).to.be.at.most(0);
        expect(layer.rect.y).to.be.at.most(0);
        expect(layer.rect.x + layer.rect.width).to.be.at.least(viewport.width);
        expect(layer.rect.y + layer.rect.height).to.be.at.least(viewport.height);
      }

      // Hull floor is the bottom edge of row 0: screen y (12 + 1 - 0) * 10 =
      // 130; the crest is crestAboveFloorCells above it, and the sprite is
      // placed so the PNG's horizon pixel lands there.
      const moon = ROCKET_BACKDROP.moon;
      const scale = (moon.widthInCells.small * camera.zoom) / moon.art.width;
      const crestY = 130 - moon.crestAboveFloorCells.small * camera.zoom;
      expect(geometry.moon.rect.y).to.be.closeTo(crestY - moon.horizon.y * scale, 1e-9);
      expect(geometry.moon.rect.width).to.be.closeTo(moon.texture.width * scale, 1e-9);

      const door = ROCKET_BACKDROP.door.rect;
      expect(geometry.door.rect).to.deep.equal(
        worldRectToScreen(1 + door.x, 1 + door.y, door.width, door.height, camera)
      );

      const radii = ROCKET_BACKDROP.vignette.radiiCells.small;
      expect(geometry.vignette.rect.width).to.be.closeTo(radii.x * 2 * camera.zoom, 1e-9);
      expect(geometry.vignette.rect.height).to.be.closeTo(radii.y * 2 * camera.zoom, 1e-9);
    });
  });
});
