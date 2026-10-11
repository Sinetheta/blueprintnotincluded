import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import {
  Blueprint,
  BniBlueprint,
  ROCKET_CONTROL_STATION_ID,
  buildCategoryLookup,
  deriveCategory,
  fitRocketInterior,
  fitRocketInteriorModule,
  isRocketHullMaterial,
  rocketInteriorLayout,
  rocketInteriorOriginFromStation,
  strayLimit,
} from '../../lib';
import { loadGameDatabase } from '../helpers/roomFixtures';

const SMALL_CAPTURE_PATH = path.join(
  __dirname,
  '../fixtures/rocket-small-blocks-in-and-out.blueprint'
);

// Blueprints drawn as text, one character per cell, rows from the top down;
// `top` is the y of the first row and `left` the x of the first column (y up,
// as in the files). The shapes are the ones the site's stored rocket
// blueprints are drawn in: a hull of ordinary tiles with the station wherever
// the author put it.
const GLYPHS: Record<string, string> = {
  '#': 'MetalTile',
  G: 'GlassTile',
  I: 'InsulationTile',
  D: 'Door',
  _: 'CarpetTile',
  C: ROCKET_CONTROL_STATION_ID,
  p: 'RocketInteriorPowerPlug',
  '.': 'WireRefined',
  B: 'Bed',
};

interface Item {
  id: string;
  position: { x: number; y: number };
}

function drawn(left: number, top: number, rows: string[]): Item[] {
  const items: Item[] = [];
  rows.forEach((row, r) => {
    [...row].forEach((glyph, c) => {
      if (glyph === ' ') return;
      const id = GLYPHS[glyph];
      if (id == null) throw new Error(`unknown glyph ${glyph}`);
      items.push({ id, position: { x: left + c, y: top - r } });
    });
  });
  return items;
}

// "Science Rocket": the medium habitat drawn 12x11, ports as carpet, the
// station six rows above the floor where the game puts it.
const SCIENCE_ROCKET = drawn(15, -1, [
  '    ####    ',
  '##_######_##',
  '#..........#',
  'G....C.D...G',
  'G....__....G',
  'G___...D...G',
  '#p.....____#',
  '#...___....#',
  '#..........#',
  '#.....D....#',
  '##_######_##',
]);

// The same habitat without the four-cell cap, walled in glass all round.
const NO_CAP = drawn(12, -3, [
  'GGGGGGGGGGGG',
  'G###p..#.##G',
  'G..........G',
  'G......D...G',
  'GC....._...G',
  'G___.._._..G',
  'G...._..._.G',
  'G..........G',
  'G...D....D.G',
  'GGGGGGGGGGGG',
]);

// The small nose cone, with the pipes that leave its ports drawn outside it.
const NOSE_CONE = drawn(-5, 3, [
  '   ..   ',
  '  #II#  ',
  ' ##..## ',
  ' G.C..G ',
  '##p__.##',
  'G......G',
  '#......#',
  '#......#',
  '##I##I##',
  '  .  .  ',
]);

describe('Rocket interior fit', function () {
  before(function () {
    loadGameDatabase();
  });

  describe('hull material', function () {
    it("counts the game's Tile-rule buildings, doors and the hull's own pieces", () => {
      for (const id of ['MetalTile', 'GlassTile', 'Door', 'GasPermeableMembrane', 'RocketWallTile'])
        expect(isRocketHullMaterial(id), id).to.equal(true);
      for (const id of ['WireRefined', 'Bed', ROCKET_CONTROL_STATION_ID, 'NoSuchPrefab'])
        expect(isRocketHullMaterial(id), id).to.equal(false);
    });
  });

  describe('drawn hulls', function () {
    it('puts the medium template on the drawn walls, not on a misplaced station', () => {
      const fit = fitRocketInterior(SCIENCE_ROCKET, [])!;
      expect(fit).to.include({ module: 'medium', evidence: 'hull', strays: 0 });
      expect(fit.origin).to.deep.equal({ x: 20, y: -7 });
      expect(fit.hullCoverage).to.equal(1);

      const fromStation = rocketInteriorOriginFromStation(
        rocketInteriorLayout('medium'),
        SCIENCE_ROCKET
      );
      expect(fromStation).to.not.deep.equal(fit.origin);
    });

    it('fits a drawing that leaves out the cap', () => {
      const fit = fitRocketInterior(NO_CAP, [])!;
      expect(fit).to.include({ module: 'medium', evidence: 'hull' });
      // The template's bounds are the drawing's, cap row above it.
      expect(fit.origin).to.deep.equal({ x: 17, y: -8 });
      expect(fit.hullCoverage).to.be.greaterThan(0.9).and.lessThan(1);
    });

    it('fits the nose cone, taking the pipes at its ports as part of it', () => {
      const fit = fitRocketInterior(NOSE_CONE, [])!;
      expect(fit).to.include({ module: 'small', evidence: 'hull', strays: 0 });
      expect(fit.origin).to.deep.equal({ x: -2, y: -2 });
    });

    it('tolerates a couple of stray parts beside the hull, but not far off or a sheet of them', () => {
      // The hull spans x 15..26, y -11..-1.
      const beside = [
        { id: 'WireRefined', position: { x: 27, y: -5 } },
        { id: 'WireRefined', position: { x: 13, y: -6 } },
      ];
      expect(fitRocketInterior([...SCIENCE_ROCKET, ...beside], [])).to.include({
        module: 'medium',
        strays: 2,
      });

      // One part left twenty cells off would frame the rocket into a corner
      // of its own thumbnail.
      const farOff = { id: 'RocketInteriorPowerPlug', position: { x: 21, y: -30 } };
      expect(fitRocketInterior([...SCIENCE_ROCKET, farOff], [])).to.equal(null);
      expect(fitRocketInteriorModule('medium', [...SCIENCE_ROCKET, farOff])).to.equal(null);

      // An empty hull with the cabin's parts laid out beside it.
      const sheet = SCIENCE_ROCKET.filter(
        item => !['WireRefined', 'CarpetTile'].includes(item.id) || item.position.y > -2
      ).concat(
        Array.from({ length: 30 }, (_, i) => ({
          id: 'WireRefined',
          position: { x: 30 + (i % 6), y: -3 - Math.floor(i / 6) },
        }))
      );
      expect(fitRocketInterior(sheet, [])).to.equal(null);
    });

    it('scales the stray allowance with the blueprint', () => {
      expect(strayLimit(10)).to.equal(4);
      expect(strayLimit(300)).to.equal(9);
    });
  });

  describe('the station decides what is a rocket', function () {
    it('fits nothing without a control station, however hull-like the walls', () => {
      const noStation = SCIENCE_ROCKET.filter(item => item.id !== ROCKET_CONTROL_STATION_ID);
      expect(fitRocketInterior(noStation, [])).to.equal(null);
    });

    it('declines a blueprint holding two interiors', () => {
      const shifted = SCIENCE_ROCKET.map(item => ({
        id: item.id,
        position: { x: item.position.x + 20, y: item.position.y },
      }));
      expect(fitRocketInterior([...SCIENCE_ROCKET, ...shifted], [])).to.equal(null);
    });

    it('declines a base-sized blueprint without enumerating it', () => {
      const big: Item[] = [{ id: ROCKET_CONTROL_STATION_ID, position: { x: 0, y: 0 } }];
      for (let x = 0; x < 100; x++)
        for (let y = 0; y < 100; y++) big.push({ id: 'MetalTile', position: { x, y } });
      const started = Date.now();
      expect(fitRocketInterior(big, [])).to.equal(null);
      expect(Date.now() - started).to.be.lessThan(200);
    });
  });

  describe('a station and no hull', function () {
    const station: Item = { id: ROCKET_CONTROL_STATION_ID, position: { x: 0, y: 0 } };

    it('picks the module whose room holds everything around the station', () => {
      // Five cells right of the station on the floor row: inside the medium
      // room (x -4..5 around the station), past the small one's wall.
      const items = [station, ...[1, 2, 3, 4, 5].map(x => ({ id: 'Bed', position: { x, y: 0 } }))];
      // Pad past the stray allowance so the small template cannot absorb them.
      for (let y = 1; y <= 6; y++) items.push({ id: 'WireRefined', position: { x: 5, y } });
      const fit = fitRocketInterior(items, [])!;
      expect(fit).to.include({ module: 'medium', evidence: 'station', strays: 0 });
      expect(fit.origin).to.deep.equal(
        rocketInteriorOriginFromStation(rocketInteriorLayout('medium'), items)
      );
    });

    it('says nothing when the build would fit either module', () => {
      const items = [station, { id: 'Bed', position: { x: 2, y: 0 } }];
      expect(fitRocketInterior(items, [])).to.equal(null);
    });
  });

  describe('captures', function () {
    it('reads the real small capture as the nose cone, on its station', () => {
      const capture: BniBlueprint = JSON.parse(fs.readFileSync(SMALL_CAPTURE_PATH, 'utf8'));
      const blueprint = new Blueprint();
      blueprint.importFromBni(capture);
      const fit = fitRocketInterior(blueprint.blueprintItems, blueprint.digCommands)!;
      expect(fit).to.include({ module: 'small', evidence: 'capture' });
      expect(fit.origin).to.deep.equal({ x: 4, y: 3 });
    });

    it('reads a medium capture as the medium habitat', () => {
      // What the mod writes: the station, a bed, and a dig on every other
      // room cell of the selection (here, the hull's bounding box).
      const layout = rocketInteriorLayout('medium');
      const origin = { x: 10, y: 10 };
      const items: Item[] = [
        { id: ROCKET_CONTROL_STATION_ID, position: { x: 10, y: 7 } },
        { id: 'Bed', position: { x: 13, y: 7 } },
      ];
      const occupied = new Set(items.map(i => `${i.position.x},${i.position.y}`));
      const digs = layout.room
        .map(c => ({ x: c.x + origin.x, y: c.y + origin.y }))
        .filter(c => !occupied.has(`${c.x},${c.y}`));
      const fit = fitRocketInterior(items, digs)!;
      expect(fit).to.include({ module: 'medium', evidence: 'capture' });
      expect(fit.origin).to.deep.equal(origin);
    });
  });

  describe('a module the author picked', function () {
    it('lands on the drawn hull', () => {
      expect(fitRocketInteriorModule('medium', SCIENCE_ROCKET)).to.deep.equal({ x: 20, y: -7 });
      expect(fitRocketInteriorModule('small', NOSE_CONE)).to.deep.equal({ x: -2, y: -2 });
    });

    it('has no answer without a drawn hull, so the caller falls back', () => {
      const bare = [{ id: ROCKET_CONTROL_STATION_ID, position: { x: 0, y: 0 } }];
      expect(fitRocketInteriorModule('medium', bare)).to.equal(null);
      expect(fitRocketInteriorModule('small', SCIENCE_ROCKET)).to.equal(null);
    });
  });

  describe('category', function () {
    it('tags anything with a control station as a rocket interior', () => {
      const db = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../../assets/database/database-2024.json'),
          'utf8'
        )
      );
      const lookup = buildCategoryLookup(db.buildMenuCategories, db.buildMenuItems);
      // Beds and a sink alone would read as rooms.
      expect(deriveCategory(['Bed', 'LuxuryBed', 'WashBasin'], lookup)).to.equal('rooms');
      expect(
        deriveCategory(['Bed', 'LuxuryBed', 'WashBasin', ROCKET_CONTROL_STATION_ID], lookup)
      ).to.equal('rocketInterior');
    });
  });
});
