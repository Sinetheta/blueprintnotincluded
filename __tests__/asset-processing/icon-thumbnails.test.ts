import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import {
  FRONTEND_UI_IMAGE_DIR,
  FRONTEND_UI_THUMB_DIR,
  THUMB_EXT,
  THUMB_MAX_PX,
  syncIconThumbnails,
} from '../../app/api/batch/icon-thumbnails';

describe('Icon thumbnails (ui_thumb)', function () {
  this.timeout(20000);

  describe('syncIconThumbnails', () => {
    let srcDir: string;
    let destDir: string;

    const writePng = async (name: string, width: number, height: number) => {
      await sharp({
        create: { width, height, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 0.5 } },
      })
        .png()
        .toFile(path.join(srcDir, name + '.png'));
    };

    beforeEach(async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-thumb-'));
      srcDir = path.join(root, 'ui_image');
      destDir = path.join(root, 'ui_thumb');
      fs.mkdirSync(srcDir);
      await writePng('Tall', 300, 900);
      await writePng('Tiny', 40, 20);
    });

    it('writes one capped WebP per PNG, keeping the aspect and never enlarging', async () => {
      const stats = await syncIconThumbnails(srcDir, destDir, 2);
      expect(stats).to.deep.equal({ written: 2, unchanged: 0, removed: 0 });

      const tall = await sharp(path.join(destDir, 'Tall' + THUMB_EXT)).metadata();
      expect(tall.format).to.equal('webp');
      expect(tall.hasAlpha).to.equal(true);
      expect(tall.height).to.equal(THUMB_MAX_PX);
      expect(tall.width).to.be.within(THUMB_MAX_PX / 3 - 1, THUMB_MAX_PX / 3 + 1);

      const tiny = await sharp(path.join(destDir, 'Tiny' + THUMB_EXT)).metadata();
      expect([tiny.width, tiny.height]).to.deep.equal([40, 20]);
    });

    it('is a no-op on a second run and prunes thumbnails whose PNG is gone', async () => {
      await syncIconThumbnails(srcDir, destDir, 2);
      const before = fs.statSync(path.join(destDir, 'Tall' + THUMB_EXT)).mtimeMs;

      expect(await syncIconThumbnails(srcDir, destDir, 2)).to.deep.equal({
        written: 0,
        unchanged: 2,
        removed: 0,
      });
      expect(fs.statSync(path.join(destDir, 'Tall' + THUMB_EXT)).mtimeMs).to.equal(before);

      fs.rmSync(path.join(srcDir, 'Tiny.png'));
      fs.writeFileSync(path.join(destDir, 'stray.txt'), 'x');
      expect(await syncIconThumbnails(srcDir, destDir, 2)).to.deep.equal({
        written: 0,
        unchanged: 1,
        removed: 2,
      });
      expect(fs.readdirSync(destDir)).to.deep.equal(['Tall' + THUMB_EXT]);
    });
  });

  // The committed set. The build menu, side panels, element picker and terrain
  // palette bind `thumbUrl`, so an icon without its thumbnail is a broken image
  // in the menu: regenerate with `npm run icons:thumbs` (or `import:2024`).
  describe('the committed thumbnails', () => {
    const names = (dir: string, ext: string) =>
      fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(ext))
        .map((f) => f.slice(0, -ext.length))
        .sort();

    it('cover exactly the frontend ui_image set', () => {
      const icons = names(FRONTEND_UI_IMAGE_DIR, '.png');
      const thumbs = names(FRONTEND_UI_THUMB_DIR, THUMB_EXT);
      expect(icons.length).to.be.greaterThan(1000);
      const missing = icons.filter((n) => !thumbs.includes(n));
      const stray = thumbs.filter((n) => !icons.includes(n));
      expect(missing, 'icons without a thumbnail (run npm run icons:thumbs)').to.deep.equal([]);
      expect(stray, 'thumbnails without an icon (run npm run icons:thumbs)').to.deep.equal([]);
    });

    it('are all within the size cap', async () => {
      for (const name of names(FRONTEND_UI_THUMB_DIR, THUMB_EXT)) {
        const meta = await sharp(path.join(FRONTEND_UI_THUMB_DIR, name + THUMB_EXT)).metadata();
        expect(Math.max(meta.width!, meta.height!), name).to.be.at.most(THUMB_MAX_PX);
      }
    });
  });
});
