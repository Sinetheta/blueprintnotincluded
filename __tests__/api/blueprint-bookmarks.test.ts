import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { Types } from 'mongoose';

import { TestSetup } from '../setup/testSetup';
import { BlueprintModel } from '../../app/api/models/blueprint';
import { BlueprintBookmarkModel } from '../../app/api/models/blueprint-bookmark';

describe('Blueprint bookmarks API', function () {
  let testData: any;
  let blueprintId: string;
  let token: string;

  beforeEach(async function () {
    this.timeout(5000);
    testData = await TestSetup.beforeEach();
    blueprintId = testData.blueprints.popularBlueprint._id.toString();
    token = testData.users.user2.generateJwt();
  });

  afterEach(async function () {
    this.timeout(5000);
    await TestSetup.afterEach();
  });

  const save = (id: string, jwt = token) =>
    TestSetup.request().put(`/api/blueprints/${id}/bookmark`).set('Authorization', `Bearer ${jwt}`);
  const forget = (id: string, jwt = token) =>
    TestSetup.request().delete(`/api/blueprints/${id}/bookmark`).set('Authorization', `Bearer ${jwt}`);

  describe('PUT / DELETE /api/blueprints/:id/bookmark', function () {
    it('requires a login', async function () {
      expect((await TestSetup.request().put(`/api/blueprints/${blueprintId}/bookmark`)).status).to.equal(
        401
      );
      expect(
        (await TestSetup.request().delete(`/api/blueprints/${blueprintId}/bookmark`)).status
      ).to.equal(401);
    });

    it('returns 400 for a malformed id and 404 for an unknown or deleted blueprint', async function () {
      expect((await save('nope')).status).to.equal(400);
      expect((await save(new Types.ObjectId().toString())).status).to.equal(404);
      await BlueprintModel.model.updateOne({ _id: blueprintId }, { deletedAt: new Date() });
      expect((await save(blueprintId)).status).to.equal(404);
    });

    it('saves once however many times it is asked, and forgets just as calmly', async function () {
      expect((await save(blueprintId)).body).to.deep.equal({ blueprintId, saved: true });
      expect((await save(blueprintId)).status).to.equal(200);
      expect(
        await BlueprintBookmarkModel.model.countDocuments({
          blueprintId,
          userId: testData.users.user2._id.toString(),
        })
      ).to.equal(1);

      expect((await forget(blueprintId)).body).to.deep.equal({ blueprintId, saved: false });
      expect((await forget(blueprintId)).status).to.equal(200);
      expect(await BlueprintBookmarkModel.model.countDocuments({ blueprintId })).to.equal(0);
    });

    it('lets an owner save their own blueprint (a bookmark is not a vote)', async function () {
      const response = await save(blueprintId, testData.users.user1.generateJwt());
      expect(response.status).to.equal(200);
      expect(response.body.saved).to.equal(true);
    });

    it("hides a draft from anyone but its owner — 404, so draft ids can't be probed", async function () {
      await BlueprintModel.model.updateOne({ _id: blueprintId }, { isPublished: false });
      expect((await save(blueprintId)).status).to.equal(404);
      expect((await save(blueprintId, testData.users.user1.generateJwt())).status).to.equal(200);
    });
  });

  describe('savedByMe on the details page', function () {
    it('is absent for anonymous viewers and reflects the viewer’s own bookmark', async function () {
      const anonymous = await TestSetup.request().get(`/api/blueprints/${blueprintId}`);
      expect(anonymous.body).to.not.have.property('savedByMe');

      const before = await TestSetup.request()
        .get(`/api/blueprints/${blueprintId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(before.body.savedByMe).to.equal(false);

      await save(blueprintId);
      const after = await TestSetup.request()
        .get(`/api/blueprints/${blueprintId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(after.body.savedByMe).to.equal(true);

      // Someone else's bookmark is not mine.
      const other = await TestSetup.request()
        .get(`/api/blueprints/${blueprintId}`)
        .set('Authorization', `Bearer ${testData.users.user1.generateJwt()}`);
      expect(other.body.savedByMe).to.equal(false);
    });
  });

  describe('GET /api/getblueprintsSecure?savedBy=', function () {
    it('lists only what I saved, and only to me', async function () {
      const otherId = testData.blueprints.recentBlueprint._id.toString();
      await save(blueprintId);

      const mine = await TestSetup.request()
        .get('/api/getblueprintsSecure')
        .set('Authorization', `Bearer ${token}`)
        .query({ olderthan: Date.now(), savedBy: testData.users.user2._id.toString() });
      expect(mine.status).to.equal(200);
      expect(mine.body.blueprints.map((b: any) => b.id)).to.deep.equal([blueprintId]);
      expect(mine.body.blueprints.map((b: any) => b.id)).to.not.include(otherId);

      const someoneElse = await TestSetup.request()
        .get('/api/getblueprintsSecure')
        .set('Authorization', `Bearer ${testData.users.user1.generateJwt()}`)
        .query({ olderthan: Date.now(), savedBy: testData.users.user2._id.toString() });
      expect(someoneElse.status).to.equal(403);

      const malformed = await TestSetup.request()
        .get('/api/getblueprintsSecure')
        .set('Authorization', `Bearer ${token}`)
        .query({ olderthan: Date.now(), savedBy: 'not-an-id' });
      expect(malformed.status).to.equal(400);
    });

    it('drops a saved blueprint that has since been deleted or unpublished', async function () {
      await save(blueprintId);
      await BlueprintModel.model.updateOne({ _id: blueprintId }, { isPublished: false });
      const mine = await TestSetup.request()
        .get('/api/getblueprintsSecure')
        .set('Authorization', `Bearer ${token}`)
        .query({ olderthan: Date.now(), savedBy: testData.users.user2._id.toString() });
      expect(mine.status).to.equal(200);
      expect(mine.body.blueprints).to.deep.equal([]);
    });
  });
});
