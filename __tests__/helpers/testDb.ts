import mongoose, { Types } from 'mongoose';
import { UserModel } from '../../app/api/models/user';
import { BlueprintModel } from '../../app/api/models/blueprint';
import { BlueprintRatingModel } from '../../app/api/models/blueprint-rating';
import { upsertSearchRow } from '../../app/api/services/search-index-service';
import { TestDataFactory, TestUser, TestBlueprint } from '../factories/testData';

export class TestDbHelper {
  static async createTestUser(userData?: Partial<TestUser>) {
    const testUser = TestDataFactory.createUser(userData);
    return await UserModel.model.create(testUser);
  }

  static async createTestBlueprint(owner: Types.ObjectId, blueprintData?: Partial<TestBlueprint>) {
    const testBlueprint = TestDataFactory.createBlueprint(owner, blueprintData);
    const doc = await BlueprintModel.model.create(testBlueprint);
    // Mirror the save path: every blueprint gets its search row, so the
    // filterName tests exercise the real search pipeline. Awaited (unlike the
    // fire-and-forget production sync) so a test can search immediately.
    await upsertSearchRow(doc);
    return doc;
  }

  // Insert per-user rating docs and set the matching denormalized aggregate
  // on the blueprint — the same invariant the rate endpoint maintains.
  static async seedRatings(blueprintId: Types.ObjectId, ratings: { userId: string; value: number }[]) {
    if (ratings.length === 0) return;
    await BlueprintRatingModel.model.insertMany(
      ratings.map(rating => ({
        blueprintId,
        userId: rating.userId,
        value: rating.value,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );
    const average = ratings.reduce((sum, rating) => sum + rating.value, 0) / ratings.length;
    await BlueprintModel.model.updateOne(
      { _id: blueprintId },
      { $set: { ratingCount: ratings.length, ratingAverage: average } }
    );
  }

  // Writes run in parallel; every create* call builds its document from the
  // factory synchronously before its first await, so counters and _ids are
  // still assigned in source order.
  static async seedDatabase() {
    // Create test users with unique identifiers
    const timestamp = Date.now();
    const [user1, user2, user3] = await Promise.all([
      this.createTestUser({
        username: `blueprintmaster_${timestamp}`,
        email: `master_${timestamp}@blueprints.com`,
      }),
      this.createTestUser({
        username: `poweruser_${timestamp}`,
        email: `power_${timestamp}@blueprints.com`,
      }),
      this.createTestUser({
        username: `newbie_${timestamp}`,
        email: `newbie_${timestamp}@blueprints.com`,
      }),
    ]);

    // Create various blueprints for testing. The copy points at the popular
    // blueprint, so that id is minted up front.
    const now = Date.now();
    const popularId = new Types.ObjectId();
    const [popularBlueprint, recentBlueprint, oldBlueprint, copiedBlueprint] = await Promise.all([
      this.createTestBlueprint(user1._id as Types.ObjectId, {
        _id: popularId,
        name: 'Super Coal Generator Setup',
        createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        data: {
          version: '1.0',
          blueprintItems: [
            { id: 'Generator', x: 0, y: 0, element: 'Coal' },
            { id: 'Battery', x: 1, y: 0 },
            { id: 'Wire', x: 2, y: 0 },
          ],
          info: {
            name: 'Super Coal Generator Setup',
            description: 'Efficient coal power generation with automation',
          },
        },
      }),
      this.createTestBlueprint(user2._id as Types.ObjectId, {
        name: 'Oxygen Production Line',
        createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        data: {
          version: '1.0',
          blueprintItems: [
            { id: 'Electrolyzer', x: 0, y: 0 },
            { id: 'Pump', x: 1, y: 0 },
          ],
          info: {
            name: 'Oxygen Production Line',
            description: 'Basic oxygen production setup',
          },
        },
      }),
      this.createTestBlueprint(user3._id as Types.ObjectId, {
        name: 'Legacy Food System',
        createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        data: {
          version: '0.9',
          blueprintItems: [
            { id: 'FarmTile', x: 0, y: 0 },
            { id: 'MealLice', x: 0, y: 1 },
          ],
          info: {
            name: 'Legacy Food System',
            description: 'Old-style farming setup',
          },
        },
      }),
      this.createTestBlueprint(user3._id as Types.ObjectId, {
        name: 'Modified Coal Generator',
        isCopy: true,
        copyOf: popularId,
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        data: {
          version: '1.0',
          blueprintItems: [
            { id: 'Generator', x: 0, y: 0, element: 'Coal' },
            { id: 'Battery', x: 1, y: 0 },
            { id: 'Wire', x: 2, y: 0 },
            { id: 'Transformer', x: 3, y: 0 }, // Added modification
          ],
          info: {
            name: 'Modified Coal Generator',
            description: 'Coal generator with power transformation',
          },
        },
      }),
    ]);

    // popular: two ratings (avg 4.5); recent: one rating (avg 4); old/copied: unrated
    await Promise.all([
      this.seedRatings(popularBlueprint._id as Types.ObjectId, [
        { userId: (user2._id as Types.ObjectId).toString(), value: 5 },
        { userId: (user3._id as Types.ObjectId).toString(), value: 4 },
      ]),
      this.seedRatings(recentBlueprint._id as Types.ObjectId, [
        { userId: (user1._id as Types.ObjectId).toString(), value: 4 },
      ]),
    ]);

    return {
      users: { user1, user2, user3 },
      blueprints: { popularBlueprint, recentBlueprint, oldBlueprint, copiedBlueprint },
    };
  }

  // Every registered model's collection, not a hand-kept list: a collection
  // missing from the list leaks its rows into later specs' counts.
  static async cleanDatabase() {
    await Promise.all(
      Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({}))
    );
    TestDataFactory.reset();
  }
}
