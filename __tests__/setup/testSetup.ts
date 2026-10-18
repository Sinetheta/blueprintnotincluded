import request from 'supertest';
import app from '../../app/app';
import { TestDbHelper } from '../helpers/testDb';
import { drainBackgroundTasks } from '../../app/api/services/background-tasks';

export class TestSetup {
  static async beforeEach() {
    await TestDbHelper.cleanDatabase();
    return await TestDbHelper.seedDatabase();
  }

  static async afterEach() {
    // Let the test's fire-and-forget writes finish before wiping what they
    // write to, so none of them lands in the next test.
    await drainBackgroundTasks();
    await TestDbHelper.cleanDatabase();
  }

  static request() {
    return request(app);
  }
}

export { TestDbHelper };
