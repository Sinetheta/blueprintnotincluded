import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { Types } from 'mongoose';

import { TestSetup } from '../setup/testSetup';
import { BlueprintModel } from '../../app/api/models/blueprint';
import {
  clearSummaryCache,
  describeSummary,
  summarizeStoredBlueprint,
} from '../../app/api/services/blueprint-summary-service';
import { blueprintDescription } from '../../app/static-controller';

describe('Blueprint summary API', function () {
  let testData: any;
  let blueprintId: string;

  beforeEach(async function () {
    this.timeout(5000);
    clearSummaryCache();
    testData = await TestSetup.beforeEach();
    blueprintId = testData.blueprints.popularBlueprint._id.toString();
  });

  afterEach(async function () {
    this.timeout(5000);
    await TestSetup.afterEach();
  });

  describe('GET /api/blueprints/:id/summary', function () {
    it('returns 400 for a malformed id and 404 for unknown or deleted blueprints', async function () {
      expect((await TestSetup.request().get('/api/blueprints/nope/summary')).status).to.equal(400);
      expect(
        (await TestSetup.request().get(`/api/blueprints/${new Types.ObjectId()}/summary`)).status
      ).to.equal(404);
      await BlueprintModel.model.updateOne({ _id: blueprintId }, { deletedAt: new Date() });
      expect(
        (await TestSetup.request().get(`/api/blueprints/${blueprintId}/summary`)).status
      ).to.equal(404);
    });

    it('lists the buildings and materials with names and icons', async function () {
      await BlueprintModel.model.updateOne(
        { _id: blueprintId },
        {
          data: {
            blueprintItems: [
              { id: 'Electrolyzer', position: { x: 0, y: 0 }, elements: ['IronOre'] },
              { id: 'Tile', position: { x: 0, y: 2 }, elements: ['SandStone'] },
              { id: 'Tile', position: { x: 1, y: 2 }, elements: ['SandStone'] },
            ],
          },
          modifiedAt: new Date(),
        }
      );

      const response = await TestSetup.request().get(`/api/blueprints/${blueprintId}/summary`);
      expect(response.status).to.equal(200);
      expect(response.body.buildingCount).to.equal(3);
      expect(response.body.width).to.equal(2);
      expect(response.body.height).to.equal(3);
      expect(response.body.buildings[0]).to.include({ id: 'Tile', name: 'Tile', count: 2 });
      expect(response.body.buildings[1]).to.include({
        id: 'Electrolyzer',
        name: 'Electrolyzer',
        count: 1,
      });
      expect(response.body.buildings[1].icon).to.match(/^assets\/ui_thumb\/.+\.webp$/);
      const materials = response.body.materials as { id: string; name: string; mass: number }[];
      expect(materials.map(m => m.id)).to.include.members(['IronOre', 'SandStone']);
      expect(materials.find(m => m.id === 'IronOre')!.name).to.equal('Iron Ore');
      expect(materials.every(m => m.mass > 0)).to.equal(true);
    });

    it('keeps a mod building the database does not know in the count, by its id', async function () {
      await BlueprintModel.model.updateOne(
        { _id: blueprintId },
        {
          data: {
            blueprintItems: [
              { id: 'Tile', position: { x: 0, y: 0 } },
              { id: 'SomeModBuilding', position: { x: 1, y: 0 } },
              { id: 'SomeModBuilding', position: { x: 2, y: 0 } },
            ],
          },
          modifiedAt: new Date(),
        }
      );
      const response = await TestSetup.request().get(`/api/blueprints/${blueprintId}/summary`);
      expect(response.status).to.equal(200);
      expect(response.body.buildingCount).to.equal(3);
      expect(response.body.buildings[0]).to.deep.equal({
        id: 'SomeModBuilding',
        name: 'SomeModBuilding',
        count: 2,
        icon: null,
      });
    });

    it('hides a draft from everyone but its owner, like the details page', async function () {
      await BlueprintModel.model.updateOne({ _id: blueprintId }, { isPublished: false });
      expect(
        (await TestSetup.request().get(`/api/blueprints/${blueprintId}/summary`)).status
      ).to.equal(404);
      const other = await TestSetup.request()
        .get(`/api/blueprints/${blueprintId}/summary`)
        .set('Authorization', `Bearer ${testData.users.user2.generateJwt()}`);
      expect(other.status).to.equal(404);
      const owner = await TestSetup.request()
        .get(`/api/blueprints/${blueprintId}/summary`)
        .set('Authorization', `Bearer ${testData.users.user1.generateJwt()}`);
      expect(owner.status).to.equal(200);
    });

    it('survives an unreadable data blob', async function () {
      await BlueprintModel.model.updateOne(
        { _id: blueprintId },
        { data: { blueprintItems: 'not a list' } }
      );
      const response = await TestSetup.request().get(`/api/blueprints/${blueprintId}/summary`);
      expect(response.status).to.equal(200);
      expect(response.body.buildingCount).to.equal(0);
    });
  });

  describe('describeSummary / blueprintDescription', function () {
    it('writes the unfurl line from the top buildings and materials', function () {
      const summary = summarizeStoredBlueprint({
        blueprintItems: [
          { id: 'Electrolyzer', position: { x: 0, y: 0 }, elements: ['IronOre'] },
          { id: 'Tile', position: { x: 0, y: 2 }, elements: ['SandStone'] },
          { id: 'Tile', position: { x: 1, y: 2 }, elements: ['SandStone'] },
        ],
      });
      const text = describeSummary(summary);
      expect(text).to.match(/^2×3 tiles · 3 buildings · 2× Tile, 1× Electrolyzer · /);
      expect(text).to.match(/\d+ kg (Iron Ore|Sandstone)/);
    });

    it('falls back to the generic line when there is nothing to say or the data is broken', function () {
      expect(blueprintDescription({ blueprintItems: [] }, 'abc', null)).to.equal(
        'A blueprint for use in Oxygen Not Included.'
      );
      expect(blueprintDescription(42, 'abc', null)).to.equal(
        'A blueprint for use in Oxygen Not Included.'
      );
    });
  });
});
