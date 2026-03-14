require('dotenv').config({ path: require('path').resolve(__dirname, '../../../services/auth/.env') });
const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const authMiddleware = require('../../../services/auth/middleware/auth.middleware');
const User = require('../../../shared/models/User');
const { connect, disconnect, clearDatabase } = require('../../testSetup');

// A minimal Express app to test the middleware in isolation
const testApp = express();
testApp.use(express.json());
testApp.get('/protected', authMiddleware, (req, res) => {
  res.status(200).json({ message: 'Access granted', userId: req.user._id });
});

describe('Auth Middleware', () => {
  beforeAll(async () => await connect(), 30000);
  afterAll(async () => await disconnect(), 30000);
  afterEach(async () => await clearDatabase());

  let user, validToken;

  beforeEach(async () => {
    user = await User.create({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
    });

    validToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    user.auth_tokens.push({ token: validToken });
    await user.save();
  });

  it('should allow access with a valid token', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Access granted');
  });

  it('should return 401 if no authorization header is provided', async () => {
    const res = await request(testApp).get('/protected');
    expect(res.status).toBe(401);
  });

  it('should return 401 if authorization header does not start with Bearer', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', validToken);

    expect(res.status).toBe(401);
  });

  it('should return 401 if token is malformed', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer notarealtoken');

    expect(res.status).toBe(401);
  });

  it('should return 401 if token is expired', async () => {
    const expiredToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );

    user.auth_tokens.push({ token: expiredToken });
    await user.save();

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it('should return 401 if token has been removed from auth_tokens', async () => {
    user.auth_tokens = [];
    await user.save();

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(401);
  });

  it('should attach user and token to the request object', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.body.userId).toBe(user._id.toString());
  });
});
