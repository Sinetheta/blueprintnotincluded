import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load test environment variables before any tests run
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Set test flag to suppress initialization logs
process.env.NODE_ENV = 'test';

// Suppress console output during tests to reduce noise
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Mock nodemailer to prevent SMTP connection errors in tests
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn((callback) => callback(null, true)),
    sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-message-id' }))
  }))
}));

// Mock Mailjet to prevent external API calls in tests
jest.mock('node-mailjet', () => {
  return jest.fn().mockImplementation(() => ({
    post: jest.fn(() => ({
      request: jest.fn(() => Promise.resolve({ body: { Messages: [{ Status: 'success' }] } }))
    }))
  }));
});


// Database setup and teardown for tests
beforeAll(async () => {
  // Give the app time to initialize and connect to database
  await new Promise(resolve => setTimeout(resolve, 2000));
});

afterAll(async () => {
  // Clean up database connections
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});