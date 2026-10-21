// Menu-sized thumbnails of the flat icons in ui_image/.
//
// The export's flat art is sized for the canvas (hundreds of px per cell, up to
// ~1800 px a side, 75 KB a file on average), but the build menu, the build and
// select side panels, the element picker and the terrain palette show the same
// files in <img> tags at 30-70 px. Opening every build-menu category once pulled
// 400 PNGs and 69 MB. These are the renditions those <img> tags use instead
// (`StringHelpers.iconThumbUrl`): the longest side capped at THUMB_MAX_PX, which
// covers a 64 px slot on a 2x display, as lossy WebP with alpha, a few KB each.
//
// Run by `npm run import:2024` after the ui_image sync, and on its own as
// `npm run icons:thumbs`. Content-aware like the sprite sync: a thumbnail is
// rewritten only when its bytes change and pruned when its source PNG is gone,
// so a re-run on an unchanged icon set leaves git clean.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export const THUMB_MAX_PX = 128;
export const THUMB_EXT = '.webp';

export interface ThumbnailStats {
  written: number;
  unchanged: number;
  removed: number;
}

export async function renderIconThumbnail(pngFile: string): Promise<Buffer> {
  return sharp(pngFile)
    .resize({
      width: THUMB_MAX_PX,
      height: THUMB_MAX_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85, alphaQuality: 90, effort: 6 })
    .toBuffer();
}

/**
 * Bring `destDir` to exactly one `<name>.webp` per `<name>.png` in `srcDir`.
 * `concurrency` bounds the number of sharp pipelines in flight.
 */
export async function syncIconThumbnails(
  srcDir: string,
  destDir: string,
  concurrency = 8
): Promise<ThumbnailStats> {
  fs.mkdirSync(destDir, { recursive: true });
  const stats: ThumbnailStats = { written: 0, unchanged: 0, removed: 0 };
  const sources = fs
    .readdirSync(srcDir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort();
  const wanted = new Set(sources.map((f) => f.replace(/\.png$/i, THUMB_EXT)));

  for (const entry of fs.readdirSync(destDir)) {
    if (wanted.has(entry)) continue;
    fs.rmSync(path.join(destDir, entry), { recursive: true, force: true });
    stats.removed++;
  }

  let next = 0;
  const worker = async () => {
    while (next < sources.length) {
      const file = sources[next++];
      const dest = path.join(destDir, file.replace(/\.png$/i, THUMB_EXT));
      const bytes = await renderIconThumbnail(path.join(srcDir, file));
      let same = false;
      try {
        same = fs.readFileSync(dest).equals(bytes);
      } catch {
        /* missing -> write */
      }
      if (same) stats.unchanged++;
      else {
        fs.writeFileSync(dest, bytes);
        stats.written++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, worker));
  return stats;
}

// Where the site keeps them. Only the frontend serves thumbnails; the backend's
// own ui_image root feeds the preview renderer, which draws from the full art.
export const FRONTEND_UI_IMAGE_DIR = path.join(__dirname, '../../../frontend/src/assets/ui_image');
export const FRONTEND_UI_THUMB_DIR = path.join(__dirname, '../../../frontend/src/assets/ui_thumb');

export async function syncSiteIconThumbnails(
  srcDir: string = FRONTEND_UI_IMAGE_DIR,
  destDir: string = FRONTEND_UI_THUMB_DIR
): Promise<ThumbnailStats> {
  const stats = await syncIconThumbnails(srcDir, destDir);
  console.log(
    '--- synced ui_thumb ->',
    path.normalize(destDir),
    `(written ${stats.written}, unchanged ${stats.unchanged}, removed ${stats.removed}) ---`
  );
  return stats;
}

if (require.main === module) {
  syncSiteIconThumbnails().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
