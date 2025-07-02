import { TestSetup } from '../setup/testSetup';

describe('Authentication API', () => {
  let testData: any;

  beforeEach(async () => {
    testData = await TestSetup.beforeEach();
  });

  afterEach(async () => {
    await TestSetup.afterEach();
  });

  describe('POST /api/register', () => {
    test('should successfully create a new user', async () => {
      const newUser = {
        username: 'newuser123',
        email: 'newuser@test.com',
        password: 'testpassword123'
      };

      const response = await TestSetup.request()
        .post('/api/register')
        .send(newUser);

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('POST /api/login', () => {
    test('should successfully login with valid credentials', async () => {
      // First create a user with a known password
      const testPassword = 'testpassword123';
      const registerResponse = await TestSetup.request()
        .post('/api/register')
        .send({
          username: 'loginuser',
          email: 'loginuser@test.com',
          password: testPassword
        });

      expect(registerResponse.status).toBe(200);

      // Now test login with the same credentials
      const loginResponse = await TestSetup.request()
        .post('/api/login')
        .send({
          username: 'loginuser',
          password: testPassword
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
    });

    test('should reject login with invalid credentials', async () => {
      const response = await TestSetup.request()
        .post('/api/login')
        .send({
          username: testData.users.user1.username, // Valid username from test data
          password: 'wrongpassword'                 // But wrong password
        });

      expect(response.status).toBe(401);
    });

    test('should reject login with nonexistent user', async () => {
      const response = await TestSetup.request()
        .post('/api/login')
        .send({
          username: 'nonexistentuser',
          password: 'anypassword'
        });

      expect(response.status).toBe(401);
    });

    test('should handle missing username parameter', async () => {
      const response = await TestSetup.request()
        .post('/api/login')
        .send({ password: 'somepassword' });

      expect(response.status).toBe(401);
    });

    test('should handle missing password parameter', async () => {
      const response = await TestSetup.request()
        .post('/api/login')
        .send({ username: 'someuser' });

      expect(response.status).toBe(401);
    });

    test('should handle completely missing login parameters', async () => {
      const response = await TestSetup.request()
        .post('/api/login')
        .send({});

      expect(response.status).toBe(401);
    });
  });
});
