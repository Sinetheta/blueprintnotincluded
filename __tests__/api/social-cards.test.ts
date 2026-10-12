import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import dotenv from 'dotenv';
import path from 'path';
import sharp from 'sharp';
import { Types } from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });
process.env.NODE_ENV = 'test';

import { TestSetup, TestDbHelper } from '../setup/testSetup';
import { TestDataFactory } from '../factories/testData';
import { BlueprintModel } from '../../app/api/models/blueprint';
import { PreviewImageModel } from '../../app/api/models/preview-image';
import { PREVIEW_RENDER_VERSION } from '../../app/api/services/preview-image-service';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  clearCollageCache,
  collageLayout,
  collageUrl,
  composeCollage,
  parseCollageFilter,
  pickCollageTiles,
} from '../../app/api/services/social-card-service';
import { WebsiteMeta } from '../../app/websiteMeta';

const SLACKBOT = 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)';

const solidTile = (r: number) =>
  sharp({
    create: { width: 64, height: 64, channels: 4, background: { r, g: 80, b: 120, alpha: 1 } },
  })
    .webp({ lossless: true })
    .toBuffer();

const emptyFilter = { category: null, subcategory: null, rooms: null, owner: null };

describe('Social share cards', function () {
  let owner: any;

  beforeEach(async function () {
    this.timeout(5000);
    await TestSetup.beforeEach();
    clearCollageCache();
    owner = await TestDbHelper.createTestUser({ username: 'sharer' });
  });

  afterEach(async function () {
    this.timeout(5000);
    await TestSetup.afterEach();
  });

  // Each blueprint gets distinct content (its own cluster) unless `x` repeats,
  // and a stored hero preview unless `preview: false`.
  async function seed(
    opts: {
      category?: string;
      ratingCount?: number;
      x?: number;
      preview?: boolean | 'stale';
      isPublished?: boolean;
    } = {}
  ) {
    // Cluster keys are origin-relative, so distinct content needs a varying gap.
    const x = opts.x ?? 2 + Math.floor(Math.random() * 1e6);
    const doc = await TestDbHelper.createTestBlueprint(
      owner._id as Types.ObjectId,
      {
        ratingCount: opts.ratingCount ?? 0,
        isPublished: opts.isPublished ?? true,
        data: {
          version: '1.0',
          blueprintItems: [
            { id: 'Generator', position: { x: 0, y: 0 } },
            { id: 'Battery', position: { x, y: 0 } },
          ],
          info: { name: 'x' },
        },
      } as any
    );
    if (opts.category)
      await BlueprintModel.model.updateOne({ _id: doc._id }, { category: opts.category });
    if (opts.preview !== false) {
      const modifiedAt = doc.modifiedAt as Date;
      await PreviewImageModel.model.create({
        blueprintId: doc._id,
        variant: 'hero.webp',
        bytes: await solidTile(opts.ratingCount ?? 0),
        contentType: 'image/webp',
        renderedAt: new Date(),
        sourceModifiedAt:
          opts.preview === 'stale' ? new Date(modifiedAt.getTime() - 1000) : modifiedAt,
        renderVersion: PREVIEW_RENDER_VERSION,
      });
    }
    return doc;
  }

  describe('parseCollageFilter', function () {
    it('accepts known categories, their subcategories, rooms and owner ids', function () {
      const id = new Types.ObjectId().toString();
      expect(
        parseCollageFilter({
          category: 'power',
          subcategory: 'generator',
          rooms: 'park,latrine',
          owner: id,
        })
      ).to.deep.equal({
        category: 'power',
        subcategory: 'generator',
        rooms: ['latrine', 'park'],
        owner: id,
      });
      expect(parseCollageFilter({ sort: 'popular', dlc: 'EXPANSION1_ID' })).to.deep.equal(
        emptyFilter
      );
    });

    it('rejects anything outside the enums', function () {
      expect(parseCollageFilter({ category: 'nope' })).to.equal(null);
      expect(parseCollageFilter({ category: 'power', subcategory: 'aquatuner' })).to.equal(null);
      expect(parseCollageFilter({ subcategory: 'generator' })).to.equal(null);
      expect(parseCollageFilter({ rooms: 'park,dungeon' })).to.equal(null);
      expect(parseCollageFilter({ rooms: 'park,latrine,washroom,barracks' })).to.equal(null);
      expect(parseCollageFilter({ owner: 'not-an-id' })).to.equal(null);
    });
  });

  describe('collage layout', function () {
    it('places five tiles as one large square and a 2x2 grid, all inside the card', function () {
      const tiles = collageLayout(5);
      expect(tiles).to.have.length(5);
      expect(tiles[0].size).to.be.greaterThan(tiles[1].size * 2);
      for (const t of tiles) {
        expect(t.left).to.be.at.least(0);
        expect(t.top).to.be.at.least(0);
        expect(t.left + t.size).to.be.at.most(CARD_WIDTH);
        expect(t.top + t.size).to.be.at.most(CARD_HEIGHT);
      }
    });

    it('uses a row of three for three or four tiles, and no tiles below three', function () {
      expect(collageLayout(4)).to.have.length(3);
      expect(collageLayout(3)).to.have.length(3);
      expect(collageLayout(2)).to.deep.equal([]);
    });

    it('composes a 1200x630 JPEG for every tile count', async function () {
      this.timeout(10000);
      const tile = await solidTile(10);
      for (const n of [0, 3, 5]) {
        const meta = await sharp(await composeCollage(Array(n).fill(tile))).metadata();
        expect([meta.format, meta.width, meta.height]).to.deep.equal([
          'jpeg',
          CARD_WIDTH,
          CARD_HEIGHT,
        ]);
      }
    });

    it('composes the logo card once and shares it', async function () {
      expect(await composeCollage([])).to.equal(await composeCollage([]));
    });
  });

  describe('pickCollageTiles', function () {
    it('takes the most-rated public blueprints with fresh previews, one per duplicate cluster', async function () {
      await seed({ category: 'power', ratingCount: 9, x: 1 });
      await seed({ category: 'power', ratingCount: 8, x: 1 }); // identical copy of the first
      await seed({ category: 'power', ratingCount: 7, preview: 'stale' });
      await seed({ category: 'power', ratingCount: 6, preview: false });
      await seed({ category: 'power', ratingCount: 5, isPublished: false });
      await seed({ category: 'cooling', ratingCount: 4 });
      await seed({ category: 'power', ratingCount: 3 });

      const tiles = await pickCollageTiles({ ...emptyFilter, category: 'power' });
      const reds = await Promise.all(tiles.map(async t => (await sharp(t).raw().toBuffer())[0]));
      expect(reds).to.deep.equal([9, 3]);
    });

    it('reads past a top of the listing with no usable previews', async function () {
      this.timeout(10000);
      // 45 top-rated blueprints with no stored preview: more than one batch
      await BlueprintModel.model.insertMany(
        Array.from({ length: 45 }, () =>
          TestDataFactory.createBlueprint(owner._id as Types.ObjectId, { ratingCount: 100 } as any)
        )
      );
      for (let i = 1; i <= 3; i++) await seed({ ratingCount: i });
      expect(await pickCollageTiles(emptyFilter)).to.have.length(3);
    });

    it('caps at five tiles', async function () {
      for (let i = 0; i < 7; i++) await seed({ ratingCount: i });
      expect(await pickCollageTiles(emptyFilter)).to.have.length(5);
    });
  });

  describe('GET /api/social/collage.jpg', function () {
    it('400s on an invalid filter', async function () {
      const res = await TestSetup.request().get('/api/social/collage.jpg?category=nope');
      expect(res.status).to.equal(400);
    });

    it('serves a cacheable JPEG card', async function () {
      this.timeout(10000);
      for (let i = 0; i < 5; i++) await seed({ category: 'power', ratingCount: i });
      const res = await TestSetup.request().get(
        '/api/social/collage.jpg?category=power&v=20261011'
      );
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.match(/image\/jpeg/);
      expect(res.headers['cache-control']).to.equal('public, max-age=86400');
      const meta = await sharp(res.body).metadata();
      expect([meta.width, meta.height]).to.deep.equal([CARD_WIDTH, CARD_HEIGHT]);
    });
  });

  describe('crawler meta', function () {
    it('gives a Discover category its own title, count and collage', async function () {
      await seed({ category: 'oxygenGen' });
      await seed({ category: 'oxygenGen' });
      const res = await TestSetup.request()
        .get('/discover?category=oxygenGen&subcategory=electrolyzer&sort=popular')
        .set('User-Agent', SLACKBOT);
      expect(res.status).to.equal(200);
      expect(res.text).to.contain(
        '<meta property="og:title" content="Electrolyzer · Oxygen blueprints" />'
      );
      expect(res.text).to.contain(
        'content="Browse 0 electrolyzer oxygen blueprints for Oxygen Not Included."'
      );
      // No blueprints in the subcategory: the site image, not an empty collage
      expect(res.text).to.contain('/images/site-preview-large-wide.png');

      const all = await TestSetup.request()
        .get('/discover?category=oxygenGen&sort=popular&utm_source=slack')
        .set('User-Agent', SLACKBOT);
      expect(all.text).to.contain('content="Oxygen blueprints"');
      expect(all.text).to.contain('Browse 2 oxygen blueprints');
      expect(all.text).to.contain('/api/social/collage.jpg?category=oxygenGen&amp;v=');
      // Canonical og:url: sort and tracking params dropped
      expect(all.text).to.contain(`content="${process.env.HOST}/discover?category=oxygenGen"`);
    });

    it('names a profile and collages its owner’s blueprints', async function () {
      await seed();
      await seed({ isPublished: false });
      const res = await TestSetup.request().get('/profile/sharer').set('User-Agent', SLACKBOT);
      expect(res.text).to.contain('content="sharer&#39;s blueprints"');
      expect(res.text).to.contain('content="1 blueprint by sharer for Oxygen Not Included."');
      expect(res.text).to.contain(`/api/social/collage.jpg?owner=${owner._id}&amp;v=`);
    });

    it('keeps search terms out of the collage and escapes them in the title', async function () {
      const res = await TestSetup.request()
        .get('/discover?name=%22%3E%3Cb%3Ex')
        .set('User-Agent', SLACKBOT);
      expect(res.text).to.contain('Blueprints matching “&quot;&gt;&lt;b&gt;x”');
      expect(res.text).to.not.contain('collage.jpg');
    });
  });

  describe('WebsiteMeta', function () {
    it('makes image urls absolute and adds a large Twitter card', function () {
      const tags = new WebsiteMeta().getHtmlTags();
      expect(tags).to.contain(
        `<meta property="og:image" content="${process.env.HOST}/images/site-preview-large-wide.png" />`
      );
      expect(tags).to.contain('<meta property="og:site_name" content="Blueprint Not Included" />');
      expect(tags).to.contain('<meta name="twitter:card" content="summary_large_image" />');
      expect(tags).to.not.contain('site-preview-large-square');
    });

    it('builds a dated, canonical collage url', function () {
      const url = collageUrl(
        { ...emptyFilter, rooms: ['park'], category: 'decor' },
        new Date('2026-10-11T12:00:00Z')
      );
      expect(url).to.equal(
        `${process.env.HOST}/api/social/collage.jpg?category=decor&rooms=park&v=20261011`
      );
    });
  });
});
