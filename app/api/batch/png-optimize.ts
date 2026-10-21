// Lossless recompression of the game's PNG art.
//
// The OniExtract2024 export writes its PNGs the way Unity's encoder hands them
// over: fast deflate, no filter search. Re-encoding the same pixels at zlib
// level 9 with adaptive per-row filtering takes about 16% off the committed
// `ui_image/` and `connection_sprites/` sets (110 MB -> 93 MB) with not a byte
// of image data changed -- the pixels are the pixels, only the container is
// tighter. The sprite sync in convert-export-2024.ts runs every PNG it writes
// through this, so the repository, the frontend build and the deploy image
// only ever carry the recompressed form.
//
// Deliberately lossless. sharp's `effort` and `quality` options switch the
// encoder to a 256-colour palette, which is where the big numbers come from
// (about 35% of the export size) and also where the gradients in the art go.
import sharp from 'sharp';

/**
 * Re-encode a PNG losslessly at maximum compression. Returns the input itself
 * when the re-encode is not smaller, so a hand-optimised file is never grown.
 */
export async function optimizePng(input: Buffer): Promise<Buffer> {
  const output = await sharp(input)
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();
  return output.length < input.length ? output : input;
}
