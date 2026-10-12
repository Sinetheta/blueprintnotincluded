// Open Graph images for pages that list blueprints (Discover filters, profile
// pages). A blueprint page unfurls as that blueprint's own preview; a listing
// used to unfurl as the site default — one fixed, years-old example build —
// which reads as a random thumbnail next to a category's title.
//
// The card is a collage of the listing's top blueprints (the pattern Unsplash
// uses for topics and collections: one large tile, smaller ones beside it),
// composed with sharp from preview images that are *already stored* in the
// previewimages collection. It never renders a blueprint: a candidate without
// a fresh stored hero.webp is skipped, and with too few left the card falls
// back to the logo. Only unfurlers request these, and the result is cached in
// process and, via Cache-Control, by Cloudflare.
import * as path from 'path';
import mongoose from 'mongoose';
import sharp, { OverlayOptions } from 'sharp';
import { CATEGORIES, SUBCATEGORIES, ROOM_TYPE_IDS, Category } from '../../../lib/index';
import { BlueprintModel } from '../models/blueprint';
import { BlueprintSearchModel } from '../models/blueprint-search';
import { PreviewImageModel } from '../models/preview-image';
import { PreviewImageService } from './preview-image-service';
import { PUBLISHED_FILTER } from './blueprint-filter-service';

export interface CollageFilter {
  category: Category | null;
  subcategory: string | null;
  rooms: string[] | null;
  owner: string | null;
}

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
const BACKGROUND = '#0a1520'; // --bni-board-deep, the blueprint-navy theme
const TILE_BACKGROUND = '#1a3047';
const PAD = 24;
const GAP = 12;
const RADIUS = 12;
const MAX_TILES = 5;
// Candidates fetched per card: enough to survive duplicate copies (47% of the
// corpus is byte-identical to another blueprint) and missing previews.
const CANDIDATES = 40;
const MAX_ROOMS = 3;

const CACHE_TTL_MS = 6 * 60 * 60_000;
const CACHE_MAX_ENTRIES = 64;

const LOGO_PATH = path.resolve(__dirname, '../../public/android-chrome-256x256.png');

/**
 * Reads the collage filter from query params. Returns null when any param is
 * invalid — the image endpoint answers 400, the HTML path treats it as "no
 * filter". Unknown params (sort, dlc, name, …) are ignored: they change the
 * page's ordering or scope too finely to be worth a card of their own.
 */
export function parseCollageFilter(query: Record<string, unknown>): CollageFilter | null {
  const str = (key: string) => {
    const value = query[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  };

  const category = str('category');
  if (category != null && !(CATEGORIES as readonly string[]).includes(category)) return null;

  const subcategory = str('subcategory');
  if (subcategory != null) {
    if (category == null) return null;
    if (!SUBCATEGORIES[category as Category].includes(subcategory)) return null;
  }

  let rooms: string[] | null = null;
  const rawRooms = str('rooms');
  if (rawRooms != null) {
    rooms = rawRooms
      .split(',')
      .map(room => room.trim())
      .filter(room => room.length > 0);
    if (
      rooms.length === 0 ||
      rooms.length > MAX_ROOMS ||
      rooms.some(room => !(ROOM_TYPE_IDS as readonly string[]).includes(room))
    )
      return null;
    rooms = [...new Set(rooms)].sort();
  }

  const owner = str('owner');
  if (owner != null && !mongoose.Types.ObjectId.isValid(owner)) return null;

  return { category: category as Category | null, subcategory, rooms, owner };
}

/** Canonical query string for a filter — also the cache key. */
export function collageQuery(filter: CollageFilter): string {
  const params = new URLSearchParams();
  if (filter.category) params.set('category', filter.category);
  if (filter.subcategory) params.set('subcategory', filter.subcategory);
  if (filter.rooms) params.set('rooms', filter.rooms.join(','));
  if (filter.owner) params.set('owner', filter.owner);
  return params.toString();
}

/**
 * The public card url. `v` is the UTC date, so the url (and with it every
 * cache in front of the image) turns over daily as the top blueprints change.
 */
export function collageUrl(filter: CollageFilter, now = new Date()): string {
  const day = now.toISOString().slice(0, 10).replace(/-/g, '');
  const query = collageQuery(filter);
  return `${process.env.HOST ?? ''}/api/social/collage.jpg?${query ? `${query}&` : ''}v=${day}`;
}

/** The feed match for a filter: public, live blueprints only. */
export function collageMatch(filter: CollageFilter): Record<string, unknown> {
  const match: Record<string, unknown> = { deletedAt: null, isPublished: PUBLISHED_FILTER };
  if (filter.category) match.category = filter.category;
  if (filter.subcategory) match.subcategory = filter.subcategory;
  if (filter.rooms) match.rooms = { $in: filter.rooms };
  if (filter.owner) match.owner = new mongoose.Types.ObjectId(filter.owner);
  return match;
}

/**
 * Up to MAX_TILES hero previews for the filter's most-rated blueprints, one
 * per duplicate cluster, skipping any without a fresh stored preview.
 */
export async function pickCollageTiles(filter: CollageFilter): Promise<Buffer[]> {
  const candidates = await BlueprintModel.model
    .find(collageMatch(filter))
    .sort({ ratingCount: -1, viewCount: -1, createdAt: -1 })
    .limit(CANDIDATES)
    .select('_id modifiedAt')
    .lean();
  if (candidates.length === 0) return [];
  const ids = candidates.map(c => c._id);

  const [searchRows, previewRows] = await Promise.all([
    BlueprintSearchModel.model
      .find({ blueprintId: { $in: ids }, lang: 'en' })
      .select('blueprintId clusterKey')
      .lean(),
    // Metadata only: bytes are fetched for the chosen few below.
    PreviewImageModel.model
      .find({ blueprintId: { $in: ids }, variant: 'hero.webp' })
      .select('blueprintId sourceModifiedAt renderVersion')
      .lean(),
  ]);
  const clusterOf = new Map(searchRows.map(row => [String(row.blueprintId), row.clusterKey]));
  const previewOf = new Map(previewRows.map(row => [String(row.blueprintId), row]));

  const chosen: mongoose.Types.ObjectId[] = [];
  const seenClusters = new Set<string>();
  for (const candidate of candidates) {
    const id = String(candidate._id);
    const preview = previewOf.get(id);
    if (
      !preview ||
      !PreviewImageService.isRowFresh(
        preview.sourceModifiedAt,
        candidate.modifiedAt ?? null,
        preview.renderVersion
      )
    )
      continue;
    const cluster = clusterOf.get(id);
    if (cluster) {
      if (seenClusters.has(cluster)) continue;
      seenClusters.add(cluster);
    }
    chosen.push(candidate._id as mongoose.Types.ObjectId);
    if (chosen.length === MAX_TILES) break;
  }
  if (chosen.length === 0) return [];

  const rows = await PreviewImageModel.model
    .find({ blueprintId: { $in: chosen }, variant: 'hero.webp' })
    .select('blueprintId bytes')
    .lean();
  const bytesOf = new Map(
    rows.map(row => {
      // lean() may surface the bytes as a driver Binary instead of a Buffer.
      const bytes: any = row.bytes;
      return [String(row.blueprintId), Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.buffer)];
    })
  );
  return chosen.map(id => bytesOf.get(String(id))).filter((b): b is Buffer => b != null);
}

interface Placement {
  left: number;
  top: number;
  size: number;
}

/**
 * Tile positions for n previews on the 1200x630 card: one large square and a
 * 2x2 grid beside it for five, a row of three for three or four, and nothing
 * (the logo card) below three — one or two tiles read as an accident.
 */
export function collageLayout(n: number): Placement[] {
  if (n >= 5) {
    const big = CARD_HEIGHT - 2 * PAD; // 582
    const small = (CARD_WIDTH - 2 * PAD - big - 2 * GAP) / 2; // 273
    const gridLeft = PAD + big + GAP;
    const gridTop = PAD + (big - (2 * small + GAP)) / 2;
    return [
      { left: PAD, top: PAD, size: big },
      { left: gridLeft, top: gridTop, size: small },
      { left: gridLeft + small + GAP, top: gridTop, size: small },
      { left: gridLeft, top: gridTop + small + GAP, size: small },
      { left: gridLeft + small + GAP, top: gridTop + small + GAP, size: small },
    ];
  }
  if (n >= 3) {
    const size = (CARD_WIDTH - 2 * PAD - 2 * GAP) / 3; // 376
    const top = (CARD_HEIGHT - size) / 2;
    return [0, 1, 2].map(i => ({ left: PAD + i * (size + GAP), top, size }));
  }
  return [];
}

async function roundedTile(source: Buffer, size: number): Promise<Buffer> {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`
  );
  // Previews are transparent around the build; without a ground of their own
  // the tiles dissolve into the card's background.
  const flat = await sharp(source)
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: TILE_BACKGROUND })
    .png()
    .toBuffer();
  return sharp(flat)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/** Composes the card. Below three tiles it is the logo alone, centred. */
export async function composeCollage(tiles: Buffer[]): Promise<Buffer> {
  const layout = collageLayout(tiles.length);
  const overlays: OverlayOptions[] = [];
  if (layout.length === 0) {
    const size = 320;
    overlays.push({
      input: await sharp(LOGO_PATH).resize(size, size).png().toBuffer(),
      left: (CARD_WIDTH - size) / 2,
      top: (CARD_HEIGHT - size) / 2,
    });
  } else {
    for (let i = 0; i < layout.length; i++) {
      const { left, top, size } = layout[i];
      overlays.push({ input: await roundedTile(tiles[i], size), left, top });
    }
    const logoSize = 72;
    overlays.push({
      input: await sharp(LOGO_PATH).resize(logoSize, logoSize).png().toBuffer(),
      left: layout[0].left + 16,
      top: layout[0].top + 16,
    });
  }
  return sharp({
    create: { width: CARD_WIDTH, height: CARD_HEIGHT, channels: 3, background: BACKGROUND },
  })
    .composite(overlays)
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

const cache = new Map<string, { buffer: Buffer; expires: number }>();
const inFlight = new Map<string, Promise<Buffer>>();

/** The card for a filter, cached in process and single-flighted. */
export async function getCollage(filter: CollageFilter): Promise<Buffer> {
  const key = collageQuery(filter);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.buffer;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const build = (async () => {
    const buffer = await composeCollage(await pickCollageTiles(filter));
    cache.delete(key);
    if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
    cache.set(key, { buffer, expires: Date.now() + CACHE_TTL_MS });
    return buffer;
  })();
  inFlight.set(key, build);
  try {
    return await build;
  } finally {
    inFlight.delete(key);
  }
}

/** Test hook. */
export function clearCollageCache() {
  cache.clear();
}
