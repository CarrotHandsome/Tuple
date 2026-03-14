require('dotenv').config({ path: require('path').resolve(__dirname, '../../../services/auth/.env') });
const request = require('supertest');
const app = require('../../../services/auth/index');
const User = require('../../../shared/models/User');
const { connect, disconnect, clearDatabase } = require('../../testSetup');

describe('Auth Routes', () => {
  beforeAll(async () => await connect(), 30000);
  afterAll(async () => await disconnect(), 30000);
  afterEach(async () => await clearDatabase());

  // --- REGISTER ---
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'alice', email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.user.username).toBe('alice');
      expect(res.body.user.email).toBe('alice@example.com');
      expect(res.body.user._id).toBeDefined();
    });

    it('should not return password_hash in response', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'alice', email: 'alice@example.com', password: 'password123' });

      expect(res.body.user.password_hash).toBeUndefined();
    });

    it('should return 400 if username is missing', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'alice', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'alice', email: 'alice@example.com' });

      expect(res.status).toBe(400);
    });

    it('should return 409 if username is already taken', async () => {
      await request(app)
        .post('/auth/register')
        .send({ username: 'alice', email: 'alice@example.com', password: 'password123' });

      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'alice', email: 'alice2@example.com', password: 'password123' });

      expect(res.status).toBe(409);
    });

    it('should return 409 if email is already taken', async () => {
      await request(app)
        .post('/auth/register')
        .send({ username: 'alice', email: 'alice@example.com', password: 'password123' });

      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'alice2', email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(409);
    });

    it('should hash the password before storing it', async () => {
      await request(app)
        .post('/auth/register')
        .send({ username: 'alice', email: 'alice@example.com', password: 'password123' });

      const user = await User.findOne({ username: 'alice' });
      expect(user.password_hash).not.toBe('password123');
      expect(user.password_hash).toMatch(/^\$2b\$/); // bcrypt hash prefix
    });
  });

  // --- LOGIN ---
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({ username: 'alice', email: 'alice@example.com', password: 'password123' });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('alice');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@example.com' });

      expect(res.status).toBe(400);
    });

    it('should return 401 if email does not exist', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('should return 401 if password is wrong', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should set user status to online after login', async () => {
      await request(app)
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      const user = await User.findOne({ email: 'alice@example.com' });
      expect(user.status).toBe('online');
    });

    it('should store the token in auth_tokens', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      const user = await User.findOne({ email: 'alice@example.com' });
      const tokenExists = user.auth_tokens.some(t => t.token === res.body.token);
      expect(tokenExists).toBe(true);
    });

    it('should allow multiple simultaneous sessions', async () => {
      const res1 = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      const res2 = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      const user = await User.findOne({ email: 'alice@example.com' });
      expect(user.auth_tokens.length).toBe(2);
      expect(res1.body.token).not.toBe(res2.body.token);
    });
  });

  // --- LOGOUT ---
  describe('POST /auth/logout', () => {
    let token;

    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({ username: 'alice', email: 'alice@example.com', password: 'password123' });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      token = res.body.token;
    });

    it('should logout successfully with a valid token', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should remove the token from auth_tokens on logout', async () => {
      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      const user = await User.findOne({ email: 'alice@example.com' });
      const tokenExists = user.auth_tokens.some(t => t.token === token);
      expect(tokenExists).toBe(false);
    });

    it('should set user status to offline after logout', async () => {
      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      const user = await User.findOne({ email: 'alice@example.com' });
      expect(user.status).toBe('offline');
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(401);
    });

    it('should only invalidate the token used, not all sessions', async () => {
      const res2 = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      const token2 = res2.body.token;

      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      const user = await User.findOne({ email: 'alice@example.com' });
      const token2Exists = user.auth_tokens.some(t => t.token === token2);
      expect(token2Exists).toBe(true);
    });
  });
});
