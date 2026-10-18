import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';

import { TestSetup } from '../setup/testSetup';
import { BlueprintModel } from '../../app/api/models/blueprint';
import { computeHotScore } from '../../lib/index';
import { Types } from 'mongoose';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function makeBlueprint(owner: Types.ObjectId, overrides: Record<string, any> = {}) {
  const doc: Record<string, any> = {
    owner,
    name: `Discovery Test Blueprint ${new Types.ObjectId().toString()}`,
    ratingCount: 0,
    ratingAverage: 0,
    forkCount: 0,
    viewCount: 0,
    downloadCount: 0,
    createdAt: new Date(),
    modifiedAt: new Date(),
    thumbnail: TINY_PNG,
    data: { version: '1.0', buildings: [] },
    deletedAt: null,
    isPublished: true,
    ...overrides,
  };
  // saveBlueprint materializes hotScore on every write; fixtures bypass it, so
  // mirror it here from the (possibly overridden) scoring inputs.
  if (doc.hotScore == null) {
    doc.hotScore = computeHotScore({
      ratingCount: doc.ratingCount,
      ratingAverage: doc.ratingAverage,
      downloadCount: doc.downloadCount,
      createdAt: doc.createdAt,
    });
  }
  return BlueprintModel.model.create(doc);
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe('Discovery: related blueprints + trending sort', function () {
  let testData: any;

  beforeEach(async function () {
    this.timeout(5000);
    testData = await TestSetup.beforeEach();
  });

  afterEach(async function () {
    this.timeout(5000);
    await TestSetup.afterEach();
  });

  describe('GET /api/blueprints/:id/related', function () {
    it('returns 400 for a malformed id and 404 for an unknown or deleted blueprint', async function () {
      expect((await TestSetup.request().get('/api/blueprints/not-an-id/related')).status).to.equal(400);
      expect(
        (await TestSetup.request().get(`/api/blueprints/${new Types.ObjectId()}/related`)).status
      ).to.equal(404);
    });

    it('ranks same-category blueprints above unrelated ones', async function () {
      const source = await makeBlueprint(testData.users.user1._id, {
        name: 'Related Source Power',
        category: 'power',
      });
      const sameCategory = await makeBlueprint(testData.users.user2._id, {
        name: 'Related Same Category',
        category: 'power',
      });
      const unrelated = await makeBlueprint(testData.users.user3._id, {
        name: 'Related Unrelated Food',
        category: 'food',
      });

      const response = await TestSetup.request().get(`/api/blueprints/${source._id}/related`);
      expect(response.status).to.equal(200);
      const names: string[] = response.body.blueprints.map((b: any) => b.name);

      expect(names).to.include(sameCategory.name);
      expect(names).to.include(unrelated.name);
      expect(names.indexOf(sameCategory.name)).to.be.lessThan(names.indexOf(unrelated.name));
    });

    it('never includes the source blueprint itself', async function () {
      const source = await makeBlueprint(testData.users.user1._id, {
        name: 'Related Excludes Self',
        category: 'power',
      });

      const response = await TestSetup.request().get(`/api/blueprints/${source._id}/related`);
      const names: string[] = response.body.blueprints.map((b: any) => b.name);
      expect(names).to.not.include(source.name);
    });

    it('excludes drafts and soft-deleted blueprints from the pool', async function () {
      const source = await makeBlueprint(testData.users.user1._id, {
        name: 'Related Source Draftcheck',
        category: 'power',
      });
      const draft = await makeBlueprint(testData.users.user2._id, {
        name: 'Related Draft Sibling',
        category: 'power',
        isPublished: false,
      });
      const deleted = await makeBlueprint(testData.users.user3._id, {
        name: 'Related Deleted Sibling',
        category: 'power',
        deletedAt: new Date(),
      });

      const response = await TestSetup.request().get(`/api/blueprints/${source._id}/related`);
      const names: string[] = response.body.blueprints.map((b: any) => b.name);
      expect(names).to.not.include(draft.name);
      expect(names).to.not.include(deleted.name);
    });

    // Set overlap, not equality: the old single-valued gameVersion collapsed a
    // Frosty+Bionic blueprint to one pack, so it never matched a Frosty one.
    it('ranks blueprints sharing a required DLC above ones needing a different pack', async function () {
      const source = await makeBlueprint(testData.users.user1._id, {
        name: 'Related Dlc Source',
        category: 'power',
        requiredDlcs: ['DLC2_ID', 'DLC3_ID'],
      });
      // Created first, so createdAt ordering alone would put it last.
      const sharesOnePack = await makeBlueprint(testData.users.user2._id, {
        name: 'Related Dlc Overlap',
        category: 'power',
        requiredDlcs: ['DLC2_ID'],
        createdAt: daysAgo(2),
      });
      const differentPack = await makeBlueprint(testData.users.user2._id, {
        name: 'Related Dlc Disjoint',
        category: 'power',
        requiredDlcs: ['DLC5_ID'],
      });

      const response = await TestSetup.request().get(`/api/blueprints/${source._id}/related`);
      expect(response.status).to.equal(200);
      const names: string[] = response.body.blueprints.map((b: any) => b.name);

      expect(names).to.include(sharesOnePack.name);
      expect(names).to.include(differentPack.name);
      expect(names.indexOf(sharesOnePack.name)).to.be.lessThan(names.indexOf(differentPack.name));
    });

    // Base-game-only is a shared property, not the absence of one — it is what
    // the old gameVersion equality rewarded, and it survives the change.
    it('ranks base-game blueprints above DLC ones for a base-game source', async function () {
      const source = await makeBlueprint(testData.users.user1._id, {
        name: 'Related Base Source',
        category: 'power',
        requiredDlcs: [],
      });
      const alsoBase = await makeBlueprint(testData.users.user2._id, {
        name: 'Related Base Sibling',
        category: 'power',
        requiredDlcs: [],
        createdAt: daysAgo(2),
      });
      const needsDlc = await makeBlueprint(testData.users.user2._id, {
        name: 'Related Base Dlc Sibling',
        category: 'power',
        requiredDlcs: ['DLC3_ID'],
      });

      const response = await TestSetup.request().get(`/api/blueprints/${source._id}/related`);
      const names: string[] = response.body.blueprints.map((b: any) => b.name);
      expect(names.indexOf(alsoBase.name)).to.be.lessThan(names.indexOf(needsDlc.name));
    });

    it('ranks same-author blueprints above signal-free ones', async function () {
      const owner = testData.users.user1._id;
      const source = await makeBlueprint(owner, { name: 'Related Author Source' });
      // Older than the stranger's, so createdAt ordering alone would put it last.
      const sameAuthor = await makeBlueprint(owner, {
        name: 'Related Author Sibling',
        createdAt: daysAgo(2),
      });
      const stranger = await makeBlueprint(testData.users.user2._id, {
        name: 'Related Author Stranger',
      });

      const response = await TestSetup.request().get(`/api/blueprints/${source._id}/related`);
      const names: string[] = response.body.blueprints.map((b: any) => b.name);
      expect(names).to.include(sameAuthor.name);
      expect(names).to.include(stranger.name);
      expect(names.indexOf(sameAuthor.name)).to.be.lessThan(names.indexOf(stranger.name));
    });

    it('falls back to recent public blueprints when the source has no signals to match on', async function () {
      const lonelyOwner = new Types.ObjectId();
      const source = await makeBlueprint(lonelyOwner, { name: 'Related No Signal Source' });

      const response = await TestSetup.request().get(`/api/blueprints/${source._id}/related`);
      expect(response.status).to.equal(200);
      expect(response.body.blueprints.length).to.be.greaterThan(0);
    });
  });

  describe('GET /api/getblueprints?sort=trending', function () {
    // The scoring properties themselves (recency, downloads) are unit-tested in
    // __tests__/lib/blueprint-hotscore.test.ts; this proves the endpoint sorts
    // by the stored score rather than by rating.
    it('reorders relative to the plain popular (top-rated) sort', async function () {
      const oldButLiked = await makeBlueprint(testData.users.user1._id, {
        name: 'Trending Old But Liked',
        ratingCount: 50,
        ratingAverage: 5,
        createdAt: daysAgo(90),
      });
      const newSmall = await makeBlueprint(testData.users.user2._id, {
        name: 'Trending New Small',
        ratingCount: 3,
        ratingAverage: 4,
        createdAt: new Date(),
      });

      const popular = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now(), sort: 'popular' });
      const popularNames: string[] = popular.body.blueprints.map((b: any) => b.name);
      expect(popularNames.indexOf(oldButLiked.name)).to.be.lessThan(popularNames.indexOf(newSmall.name));

      const trending = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now(), sort: 'trending' });
      const trendingNames: string[] = trending.body.blueprints.map((b: any) => b.name);
      expect(trendingNames.indexOf(newSmall.name)).to.be.lessThan(trendingNames.indexOf(oldButLiked.name));
    });

    it('rejects an unknown sort value', async function () {
      const response = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now(), sort: 'notASort' });
      expect(response.status).to.equal(400);
    });

    // The fixtures above write hotScore themselves; this is the real save path,
    // which must materialize it so a new upload is trending-sortable at once.
    it('materializes hotScore when a blueprint is uploaded', async function () {
      const saved = await TestSetup.request()
        .post('/api/uploadblueprint')
        .set('Authorization', `Bearer ${testData.users.user1.generateJwt()}`)
        .send({ name: 'Trending Fresh Upload', blueprint: { blueprintItems: [] }, thumbnail: TINY_PNG });
      expect(saved.status).to.equal(200);

      const doc = await BlueprintModel.model.findById(saved.body.id).select('hotScore createdAt').lean();
      expect(doc!.hotScore).to.be.closeTo(
        computeHotScore({ ratingCount: 0, ratingAverage: 0, downloadCount: 0, createdAt: doc!.createdAt }),
        1e-9
      );
    });

    it('excludes a soft-deleted blueprint from the trending feed', async function () {
      const doomed = await makeBlueprint(testData.users.user1._id, { name: 'Trending Doomed' });

      const first = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now(), sort: 'trending' });
      expect(first.body.blueprints.map((b: any) => b.name)).to.include(doomed.name);

      await BlueprintModel.model.updateOne({ _id: doomed._id }, { $set: { deletedAt: new Date() } });

      const second = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now(), sort: 'trending' });
      expect(second.body.blueprints.map((b: any) => b.name)).to.not.include(doomed.name);
    });
  });

  describe('feed visibility filter', function () {
    it('keeps docs predating the isPublished backfill visible in count sorts', async function () {
      const legacy = await makeBlueprint(testData.users.user1._id, {
        name: 'Legacy Pre Backfill',
        ratingCount: 42,
        ratingAverage: 5,
      });
      await BlueprintModel.model.updateOne({ _id: legacy._id }, { $unset: { isPublished: '' } });

      const response = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now(), sort: 'popular' });
      expect(response.status).to.equal(200);
      expect(response.body.blueprints.map((b: any) => b.name)).to.include(legacy.name);
    });

    it('still hides drafts from the anonymous feed in count sorts', async function () {
      const draft = await makeBlueprint(testData.users.user1._id, {
        name: 'Hidden Draft Popular',
        ratingCount: 42,
        ratingAverage: 5,
        isPublished: false,
      });

      const response = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now(), sort: 'popular' });
      expect(response.status).to.equal(200);
      expect(response.body.blueprints.map((b: any) => b.name)).to.not.include(draft.name);
    });
  });

  describe('feed cache headers', function () {
    const ANON_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

    it('marks anonymous list responses edge-cacheable', async function () {
      const response = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now() });
      expect(response.status).to.equal(200);
      expect(response.headers['cache-control']).to.equal(ANON_CACHE);
    });

    it('never caches responses to requests carrying credentials', async function () {
      const response = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now() })
        .set('Authorization', `Bearer ${testData.users.user1.generateJwt()}`);
      expect(response.status).to.equal(200);
      expect(response.headers['cache-control']).to.equal('no-store');
    });

    it('marks anonymous related-blueprints responses edge-cacheable', async function () {
      const source = await makeBlueprint(testData.users.user1._id, { name: 'Cache Header Source' });
      const response = await TestSetup.request().get(`/api/blueprints/${source._id}/related`);
      expect(response.status).to.equal(200);
      expect(response.headers['cache-control']).to.equal(ANON_CACHE);
    });
  });
});
