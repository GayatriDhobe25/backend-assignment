// tests/auth.test.js

const request = require('supertest');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

// Import your auth routes or main app if routes registered there
const authRoutes = require('../routes/auth');

app.use(bodyParser.json());
app.use('/auth', authRoutes);  // adjust path if different

describe('Auth API', () => {
  test('POST /auth/login - invalid user', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'notfound@example.com', password: 'any' });
    
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('User not found or not verified');
  });

  // Add more tests like valid login, invalid password, rate limit etc.
});
