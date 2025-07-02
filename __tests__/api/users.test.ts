import { TestSetup } from '../setup/testSetup';

describe('User Management API', () => {
  let testData: any;

  beforeEach(async () => {
    testData = await TestSetup.beforeEach();
  });

  afterEach(async () => {
    await TestSetup.afterEach();
  });

  describe('GET /api/checkusername', () => {
    test('should correctly identify existing usernames', async () => {
      // Use the actual username from our test data
      const username = testData.users.user1.username;
      
      const response = await TestSetup.request()
        .get('/api/checkusername')
        .query({ username });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usernameExists');
      expect(response.body.usernameExists).toBe(true);
    });

    test('should correctly identify available usernames', async () => {
      const response = await TestSetup.request()
        .get('/api/checkusername')
        .query({ username: 'nonexistentuser123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usernameExists');
      expect(response.body.usernameExists).toBe(false);
    });

    test('should handle missing username parameter', async () => {
      const response = await TestSetup.request()
        .get('/api/checkusername');

      // Should handle missing parameter gracefully
      expect([400, 200]).toContain(response.status);
    });
  });
});