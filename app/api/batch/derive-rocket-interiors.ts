// Backfill script: mark the stored rocket interiors as such, and give the ones
// whose habitat is plain from the blueprint their hull facade.
//
// Usage:
//   ts-node app/api/batch/derive-rocket-interiors.ts [--dry-run] [--limit N]
//
// Only blueprints holding a RocketControlStation are read (the filter runs in
// Mongo, so the pass does not stream every stored blob). Of those, only the
// ones never saved since the rocket-interior choice existed are touched — the
// field is absent on them, where a save under the new editor always writes it,
// null included. For those:
//
// - `category` becomes 'rocketInterior' (and `subcategory` is cleared, since
//   the old one belongs to the old category). The category did not exist when
//   they were tagged, so no author could have picked it; the station is what
//   makes a blueprint a rocket interior.
// - `rocketInterior` and `rocketInteriorOrigin` are set from
//   fitRocketInterior (lib/src/blueprint/rocket-interior-fit.ts) when it finds
//   a plain fit, and `modifiedAt` is bumped so both preview tiers re-render
//   with the hull (the same bump update-thumbnail.ts makes). A blueprint
//   without a fit keeps the field absent, so a later run with a better fitter
//   can still reach it.
//
// A blueprint whose author has chosen — a module, or none — is reported and
// left alone. The blueprint content itself is never written.
//
// In the deploy image run the compiled output instead:
//   cd /bpni/build && npm run derive-rocket-interiors[:dry-run]

import * as fs from 'fs';
import * as path from 'path';
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import {
  BuildableElement,
  BuildMenuCategory,
  BuildMenuItem,
  ImageSource,
  OniItem,
  ROCKET_CONTROL_STATION_ID,
  RocketInteriorFit,
  SpriteInfo,
  SpriteModifier,
  fitRocketInterior,
} from '../../../lib/index';
import { BlueprintModel } from '../models/blueprint';
import { parseBatchArgs, sampledCursor, describeScope } from './batch-sampling';

dotenv.config();

// Same bootstrap as app.ts: the fitter reads OniItem build rules.
function loadGameDatabase() {
  const dbPath = path.resolve(__dirname, '../../../assets/database/database-2024.json');
  const json = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  ImageSource.init();
  BuildableElement.init();
  BuildableElement.load(json.elements);
  BuildMenuCategory.init();
  BuildMenuCategory.load(json.buildMenuCategories);
  BuildMenuItem.init();
  BuildMenuItem.load(json.buildMenuItems);
  SpriteInfo.init();
  SpriteInfo.load(json.uiSprites);
  SpriteModifier.init();
  SpriteModifier.load(json.spriteModifiers);
  OniItem.init();
  OniItem.load(json.buildings);
}

const increment = (counts: Map<string, number>, key: string) =>
  counts.set(key, (counts.get(key) ?? 0) + 1);

const report = (counts: Map<string, number>) =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ') || 'none';

async function run(dryRun: boolean, limit: number | null) {
  loadGameDatabase();

  const mongoUri = process.env.DB_URI;
  if (!mongoUri) throw new Error('DB_URI not set in environment');

  await mongoose.connect(mongoUri);
  BlueprintModel.init();

  const filter = { deletedAt: null, 'data.blueprintItems.id': ROCKET_CONTROL_STATION_ID };
  const cursor = sampledCursor(BlueprintModel.model, filter, limit);
  let processed = 0;
  let decided = 0;
  let updated = 0;
  const recategorized = new Map<string, number>();
  const fitted = new Map<string, number>();
  const unfitted = new Map<string, number>();

  for await (const doc of cursor) {
    processed++;
    if (doc.rocketInterior !== undefined) {
      decided++;
      continue;
    }

    const items: { id: string; position: { x: number; y: number } }[] =
      doc.data?.blueprintItems ?? [];
    const $set: Record<string, unknown> = {};

    if (doc.category !== 'rocketInterior') {
      increment(recategorized, `${doc.category ?? 'untagged'} -> rocketInterior`);
      $set.category = 'rocketInterior';
      $set.subcategory = null;
    }

    let fit: RocketInteriorFit | null = null;
    try {
      fit = fitRocketInterior(items, doc.data?.digCommands ?? []);
    } catch (err) {
      console.log(`fit failed for ${doc._id}:`, err);
    }
    if (fit != null) {
      increment(fitted, `${fit.module} by ${fit.evidence}`);
      $set.rocketInterior = fit.module;
      $set.rocketInteriorOrigin = fit.origin;
      $set.modifiedAt = new Date();
    } else {
      const stations = items.filter(item => item.id === ROCKET_CONTROL_STATION_ID).length;
      increment(unfitted, stations > 1 ? `${stations} stations` : 'no plain fit');
    }

    if (Object.keys($set).length === 0) continue;
    updated++;
    if (!dryRun) await BlueprintModel.model.updateOne({ _id: doc._id }, { $set });
  }

  console.log(describeScope(limit, dryRun));
  console.log(
    `Blueprints with a control station: ${processed}, updated: ${updated}, ` +
      `rocketInterior already set (left alone): ${decided}${dryRun ? ' (dry run)' : ''}`
  );
  console.log(`Category — ${report(recategorized)}`);
  console.log(`Hull fitted — ${report(fitted)}`);
  console.log(`Hull not fitted (category only) — ${report(unfitted)}`);
  await mongoose.disconnect();
}

const { dryRun, limit } = parseBatchArgs(process.argv);
run(dryRun, limit).catch(err => {
  console.error(err);
  process.exit(1);
});
