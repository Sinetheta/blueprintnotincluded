import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { optimizePng } from '../../app/api/batch/png-optimize';

// The sprite sync writes every PNG through optimizePng, so this is the claim
// the whole committed art set rests on: smaller or equal, never a pixel changed.
describe('optimizePng', () => {
  const uiImageDir = path.join(__dirname, '../../frontend/src/assets/ui_image');
  const rawPixels = (png: Buffer) =>
    sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  it('re-encodes to the same pixels, never larger', async () => {
    // A small opaque-ish icon and a large one with soft alpha edges.
    for (const name of ['Wire.png', 'SolarPanel.png']) {
      const input = fs.readFileSync(path.join(uiImageDir, name));
      const output = await optimizePng(input);
      expect(output.length, `${name} grew`).to.be.at.most(input.length);
      const [a, b] = await Promise.all([rawPixels(input), rawPixels(output)]);
      expect(b.info, `${name} dimensions`).to.deep.include({
        width: a.info.width,
        height: a.info.height,
      });
      expect(b.data.equals(a.data), `${name} pixels changed`).to.equal(true);
    }
  });

  it('shrinks an export-style PNG', async () => {
    // The export encodes at libpng's default level with no filter search; the
    // committed files are already optimised, so build such a file to test on.
    const committed = fs.readFileSync(path.join(uiImageDir, 'AirFilter.png'));
    const exportStyle = await sharp(committed)
      .png({ compressionLevel: 6, adaptiveFiltering: false, palette: false })
      .toBuffer();
    const output = await optimizePng(exportStyle);
    expect(output.length).to.be.lessThan(exportStyle.length);
    expect(output.length, 'optimising twice should not beat optimising once').to.be.at.most(
      (await optimizePng(output)).length
    );
  });

  it('returns the input itself when it cannot do better', async () => {
    const committed = fs.readFileSync(path.join(uiImageDir, 'AirFilter.png'));
    const output = await optimizePng(committed);
    expect(output.length).to.equal(committed.length);
  });
});
