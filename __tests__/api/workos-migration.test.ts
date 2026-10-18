import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';

import { TestSetup, TestDbHelper } from '../setup/testSetup';
import { UserModel } from '../../app/api/models/user';
import { migrateUsersToWorkOS } from '../../scripts/migrate-to-workos';

describe('WorkOS Migration Script', function () {
  beforeEach(async function () {
    this.timeout(5000);
    await TestDbHelper.cleanDatabase();
  });

  afterEach(async function () {
    this.timeout(5000);
    await TestSetup.afterEach();
  });

  // A pre-migration user (no authProvider at all). Inserted raw: going through
  // the model would apply the schema's authProvider default.
  async function insertPreMigrationUser(email: string, username: string) {
    const { insertedId } = await UserModel.model.collection.insertOne({ email, username });
    return insertedId;
  }

  async function createWorkosUser() {
    await UserModel.model.create({
      email: 'workos@example.com',
      username: 'workosuser',
      authProvider: 'workos',
      workosUserId: 'user_test123',
    });
  }

  describe('migrateUsersToWorkOS', function () {
    it('processes nothing and reports exact counts when every user already has authProvider', async function () {
      await UserModel.model.create({
        email: 'legacy@example.com',
        username: 'legacyuser',
        authProvider: 'legacy',
      });
      await createWorkosUser();

      const result = await migrateUsersToWorkOS();

      expect(result.totalProcessed).to.equal(0);
      expect(result.currentState).to.deep.equal({ total: 2, legacy: 1, workos: 1 });
    });

    it('should support dry-run mode without making changes', async function () {
      const userId = await insertPreMigrationUser('dryrun@example.com', 'dryrunuser');

      const result = await migrateUsersToWorkOS({ dryRun: true });

      expect(result.successCount).to.equal(1);

      // Verify user was NOT actually migrated (use lean to bypass schema default)
      const unchangedUser = await UserModel.model.findById(userId).lean();
      expect(unchangedUser?.authProvider).to.be.undefined;
    });
  });

  describe('Migration idempotency', function () {
    it('migrates users without authProvider to legacy, and is safe to run multiple times', async function () {
      const userId = await insertPreMigrationUser('idempotent@example.com', 'idempotentuser');
      await createWorkosUser();

      // Run migration first time
      const result1 = await migrateUsersToWorkOS();
      expect(result1.totalProcessed).to.equal(1);
      expect(result1.successCount).to.equal(1);
      expect(result1.errorCount).to.equal(0);
      expect(result1.errors).to.deep.equal([]);
      expect(result1.currentState).to.deep.equal({ total: 2, legacy: 1, workos: 1 });

      // Run migration second time
      const result2 = await migrateUsersToWorkOS();
      expect(result2.totalProcessed).to.equal(0); // No users to migrate

      // Verify user is in the migrated state — use lean() to read raw BSON, bypassing schema defaults
      const finalUser = await UserModel.model.findById(userId).lean();
      expect(finalUser?.authProvider).to.equal('legacy');
    });
  });
});
