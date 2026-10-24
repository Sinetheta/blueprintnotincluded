import { expect } from 'chai';
import { Blueprint, MdbBlueprint, OniItem, formatMassKg, summarizeBlueprint } from '../../lib';
import { loadGameDatabase } from '../helpers/roomFixtures';

describe('summarizeBlueprint', function () {
  before(function () {
    loadGameDatabase();
  });

  function build(mdb: MdbBlueprint): Blueprint {
    const blueprint = new Blueprint();
    blueprint.importFromMdb(mdb);
    return blueprint;
  }

  it('describes an empty blueprint as nothing at all', () => {
    const summary = summarizeBlueprint(build({ blueprintItems: [] }));
    expect(summary).to.deep.equal({
      width: 0,
      height: 0,
      buildingCount: 0,
      buildings: [],
      materials: [],
    });
  });

  it('counts every placed building, most numerous first, and spans their footprint', () => {
    const summary = summarizeBlueprint(
      build({
        blueprintItems: [
          { id: 'Tile', position: { x: 0, y: 0 }, elements: ['SandStone'] },
          { id: 'Tile', position: { x: 1, y: 0 }, elements: ['SandStone'] },
          { id: 'Tile', position: { x: 2, y: 0 }, elements: ['SandStone'] },
          { id: 'Electrolyzer', position: { x: 1, y: 1 }, elements: ['IronOre'] },
        ],
      })
    );

    expect(summary.buildingCount).to.equal(4);
    expect(summary.buildings).to.deep.equal([
      { id: 'Tile', count: 3 },
      { id: 'Electrolyzer', count: 1 },
    ]);
    // Three tiles wide; the electrolyzer is 2x2 and stands on the middle tile.
    expect(summary.width).to.equal(3);
    expect(summary.height).to.equal(3);
  });

  it('totals construction mass per chosen element, heaviest first', () => {
    const electrolyzerMass = OniItem.getOniItem('Electrolyzer').materialMass[0];
    const tileMass = OniItem.getOniItem('Tile').materialMass[0];
    const summary = summarizeBlueprint(
      build({
        blueprintItems: [
          { id: 'Electrolyzer', position: { x: 0, y: 0 }, elements: ['IronOre'] },
          { id: 'Electrolyzer', position: { x: 4, y: 0 }, elements: ['Copper'] },
          { id: 'Tile', position: { x: 8, y: 0 }, elements: ['SandStone'] },
        ],
      })
    );

    const byId = new Map(summary.materials.map(m => [m.id, m.mass]));
    expect(byId.get('IronOre')).to.equal(electrolyzerMass);
    expect(byId.get('Copper')).to.equal(electrolyzerMass);
    expect(byId.get('SandStone')).to.equal(tileMass);
    expect(summary.materials[0].mass).to.be.at.least(summary.materials[1].mass);
    expect(summary.materials.every(m => m.mass > 0)).to.equal(true);
  });

  it('charges a slot the default element when the file names none', () => {
    const summary = summarizeBlueprint(
      build({ blueprintItems: [{ id: 'Electrolyzer', position: { x: 0, y: 0 } }] })
    );
    const oniItem = OniItem.getOniItem('Electrolyzer');
    expect(summary.materials).to.deep.equal([
      { id: oniItem.defaultElement[0].id, mass: oniItem.materialMass[0] },
    ]);
  });

  it('adds non-selectable secondary costs under their category', () => {
    // A canvas costs reed fiber the player never chooses.
    const canvas = OniItem.getOniItem('Canvas');
    const fiber = canvas.secondaryMaterialCosts.find(cost => cost.category === 'BuildingFiber');
    expect(fiber, 'the Canvas fixture should carry a BuildingFiber cost').to.not.equal(undefined);

    const summary = summarizeBlueprint(
      build({ blueprintItems: [{ id: 'Canvas', position: { x: 0, y: 0 } }] })
    );
    const byId = new Map(summary.materials.map(m => [m.id, m.mass]));
    expect(byId.get('BuildingFiber')).to.equal(fiber!.mass);
  });

  it('skips editor annotations: they are not construction', () => {
    const summary = summarizeBlueprint(
      build({
        blueprintItems: [
          { id: 'Tile', position: { x: 0, y: 0 }, elements: ['SandStone'] },
          { id: OniItem.elementId, position: { x: 5, y: 5 }, elements: ['Water'] },
        ],
      })
    );
    expect(summary.buildingCount).to.equal(1);
    expect(summary.buildings.map(b => b.id)).to.deep.equal(['Tile']);
    expect(summary.materials.map(m => m.id)).to.not.include('Water');
  });
});

describe('formatMassKg', () => {
  it('uses kg below a tonne and one-decimal tonnes above', () => {
    expect(formatMassKg(800)).to.equal('800 kg');
    expect(formatMassKg(999.6)).to.equal('1000 kg');
    expect(formatMassKg(1000)).to.equal('1 t');
    expect(formatMassKg(17200)).to.equal('17.2 t');
    expect(formatMassKg(6250)).to.equal('6.3 t');
  });
});
