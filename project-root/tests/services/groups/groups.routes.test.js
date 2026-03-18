require('dotenv').config({ path: require('path').resolve(__dirname, '../../../services/groups/.env') });
const request = require('supertest');
const app = require('../../../services/groups/index');
const User = require('../../../shared/models/User');
const Group = require('../../../shared/models/Group');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase } = require('../../testSetup');

const createUserAndToken = async (username, email) => {
  const user = await User.create({
    username,
    email,
    password_hash: 'hashed_password',
  });
  const token = jwt.sign(
    { userId: user._id, username: user.username, jti: new mongoose.Types.ObjectId().toString() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  user.auth_tokens.push({ token });
  await user.save();
  return { user, token };
};

describe('Groups Routes', () => {
  beforeAll(async () => await connect(), 30000);
  afterAll(async () => await disconnect(), 30000);
  afterEach(async () => await clearDatabase());

  // --- CREATE GROUP ---
  describe('POST /groups', () => {
    it('should create a group successfully', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .post('/groups')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_name: 'Test Group' });

      expect(res.status).toBe(201);
      expect(res.body.group.group_name).toBe('Test Group');
    });

    it('should make the creator the owner and first member', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .post('/groups')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_name: 'Test Group' });

      expect(res.body.group.owner_id.toString()).toBe(user._id.toString());
      expect(res.body.group.members[0].user_id.toString()).toBe(user._id.toString());
    });

    it('should return 400 if group_name is missing', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .post('/groups')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .post('/groups')
        .send({ group_name: 'Test Group' });

      expect(res.status).toBe(401);
    });
  });

  // --- GET ALL GROUPS ---
  describe('GET /groups', () => {
    it('should return all groups regardless of membership', async () => {
      const { user: alice, token: aliceToken } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob } = await createUserAndToken('bob', 'bob@example.com');

      await Group.create({ group_name: 'Alice Group', owner_id: alice._id, members: [{ user_id: alice._id }] });
      await Group.create({ group_name: 'Bob Group',   owner_id: bob._id,   members: [{ user_id: bob._id }] });

      const res = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.groups).toHaveLength(2);
    });

    it('should return groups sorted by last_message_at descending', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');

      await Group.create({ group_name: 'Older Group', owner_id: user._id, members: [{ user_id: user._id }], last_message_at: new Date('2024-01-01') });
      await Group.create({ group_name: 'Newer Group', owner_id: user._id, members: [{ user_id: user._id }], last_message_at: new Date('2025-01-01') });

      const res = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.groups[0].group_name).toBe('Newer Group');
      expect(res.body.groups[1].group_name).toBe('Older Group');
    });

    it('should return an empty array if no groups exist', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.groups).toHaveLength(0);
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get('/groups');
      expect(res.status).toBe(401);
    });
  });

  // --- GET GROUP BY ID ---
  describe('GET /groups/:id', () => {
    it('should return a group for a member', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await Group.create({ group_name: 'Test Group', owner_id: user._id, members: [{ user_id: user._id }] });

      const res = await request(app)
        .get(`/groups/${group._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.group.group_name).toBe('Test Group');
    });

    it('should return 403 for a non-member', async () => {
      const { user } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await Group.create({ group_name: 'Test Group', owner_id: user._id, members: [{ user_id: user._id }] });

      const res = await request(app)
        .get(`/groups/${group._id}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for a nonexistent group', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/groups/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for an invalid group ID', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .get('/groups/notanid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  // --- JOIN GROUP ---
  describe('POST /groups/:id/join', () => {
    it('should allow a user to join a group', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await Group.create({ group_name: 'Test Group', owner_id: alice._id, members: [{ user_id: alice._id }] });

      const res = await request(app)
        .post(`/groups/${group._id}/join`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(200);
      const updated = await Group.findById(group._id);
      const isMember = updated.members.some(m => m.user_id.toString() === bob._id.toString());
      expect(isMember).toBe(true);
    });

    it('should return 409 if user is already a member', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await Group.create({ group_name: 'Test Group', owner_id: user._id, members: [{ user_id: user._id }] });

      const res = await request(app)
        .post(`/groups/${group._id}/join`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
    });

    it('should return 404 for a nonexistent group', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post(`/groups/${fakeId}/join`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // --- LEAVE GROUP ---
  describe('DELETE /groups/:id/leave', () => {
    it('should remove a non-owner member from the group', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await Group.create({ group_name: 'Test Group', owner_id: alice._id, members: [{ user_id: alice._id }, { user_id: bob._id }] });

      const res = await request(app)
        .delete(`/groups/${group._id}/leave`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(200);
      const updated = await Group.findById(group._id);
      const isMember = updated.members.some(m => m.user_id.toString() === bob._id.toString());
      expect(isMember).toBe(false);
    });

    it('should return 403 if user is not a member', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await Group.create({ group_name: 'Test Group', owner_id: alice._id, members: [{ user_id: alice._id }] });

      const res = await request(app)
        .delete(`/groups/${group._id}/leave`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });
  });

  // --- DELETE GROUP ---
  describe('DELETE /groups/:id', () => {
    it('should allow the owner to delete a group', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await Group.create({ group_name: 'Test Group', owner_id: user._id, members: [{ user_id: user._id }] });

      const res = await request(app)
        .delete(`/groups/${group._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const deleted = await Group.findById(group._id);
      expect(deleted).toBeNull();
    });

    it('should return 403 if user is not the owner', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await Group.create({ group_name: 'Test Group', owner_id: alice._id, members: [{ user_id: alice._id }, { user_id: bob._id }] });

      const res = await request(app)
        .delete(`/groups/${group._id}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for a nonexistent group', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/groups/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for an invalid group ID', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .delete('/groups/notanid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });
});
