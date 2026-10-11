'use strict';

// Re-renders the previews of every blueprint with a rocket-interior facade.
//
// `npm run derive-rocket-interiors` writes rocketInterior/rocketInteriorOrigin
// and bumps modifiedAt so both preview tiers re-render. Staging and production
// share one database, so the first run landed while production still served
// the build before the facade fitter — whose placeRocketInterior let the
// control station outrank a stored origin. Production re-rendered those
// previews with the hull on the station, which on a hand-drawn hull is often
// rows away from the walls the author drew, and stored the result as fresh.
//
// Bumping modifiedAt again marks those previews stale, so the code that ranks
// the stored origin first draws them on their next request. Run it AFTER that
// code is live in production — run earlier, the old build would render them
// wrong a second time.
//
// Idempotent in effect: a second run only re-renders the same previews once
// more. Touches no blueprint content and no choice.

const FILTER = { rocketInterior: { $in: ['small', 'medium'] }, deletedAt: null };

module.exports = {
  async up(db) {
    const result = await db
      .collection('blueprints')
      .updateMany(FILTER, { $set: { modifiedAt: new Date() } });
    console.log(`rocket-interior preview refresh: ${result.modifiedCount} blueprints marked stale`);
  },

  // Nothing to reverse: the earlier modifiedAt carries no meaning of its own,
  // and putting it back would only mark the corrected previews fresh again
  // against an older timestamp (they would still be served — harmless, but
  // not a rollback of anything).
  async down() {},
};
