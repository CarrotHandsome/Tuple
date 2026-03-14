require('dotenv').config({ path: require('path').resolve(__dirname, '../../../services/groups/.env') });
const request = require('supertest');
const app = require('../../../services/groups/index');
const User = require('../../../shared/models/User');
const Group = require('../../../shared/models/Group');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase } = require('../../testSetup');

// Helper: create a user and a valid token for them
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

    it('should make the creator the owner', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .post('/groups')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_name: 'Test Group' });

      expect(res.body.group.owner_id.toString()).toBe(user._id.toString());
      expect(res.body.group.members[0].role).toBe('owner');
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

  // --- GET USER GROUPS ---
  describe('GET /groups', () => {
    it('should return all groups the user is a member of', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');

      await Group.create({
        group_name: 'Group 1',
        owner_id: user._id,
        members: [{ user_id: user._id, role: 'owner' }],
        last_message_at: new Date(),
      });
      await Group.create({
        group_name: 'Group 2',
        owner_id: user._id,
        members: [{ user_id: user._id, role: 'owner' }],
        last_message_at: new Date(),
      });

      const res = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.groups).toHaveLength(2);
    });

    it('should not return groups the user is not a member of', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob } = await createUserAndToken('bob', 'bob@example.com');

      await Group.create({
        group_name: 'Bobs Group',
        owner_id: bob._id,
        members: [{ user_id: bob._id, role: 'owner' }],
      });

      const res = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.groups).toHaveLength(0);
    });

    it('should return groups sorted by last_message_at descending', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');

      const older = new Date('2024-01-01');
      const newer = new Date('2025-01-01');

      await Group.create({
        group_name: 'Older Group',
        owner_id: user._id,
        members: [{ user_id: user._id, role: 'owner' }],
        last_message_at: older,
      });
      await Group.create({
        group_name: 'Newer Group',
        owner_id: user._id,
        members: [{ user_id: user._id, role: 'owner' }],
        last_message_at: newer,
      });

      const res = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.groups[0].group_name).toBe('Newer Group');
      expect(res.body.groups[1].group_name).toBe('Older Group');
    });

    it('should return an empty array if user has no groups', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.groups).toHaveLength(0);
    });
  });

  // --- GET GROUP BY ID ---
  describe('GET /groups/:id', () => {
    it('should return a group for a member', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: user._id,
        members: [{ user_id: user._id, role: 'owner' }],
      });

      const res = await request(app)
        .get(`/groups/${group._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.group.group_name).toBe('Test Group');
    });

    it('should return 403 for a non-member', async () => {
      const { user } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: user._id,
        members: [{ user_id: user._id, role: 'owner' }],
      });

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

  // --- INVITE USER ---
  describe('POST /groups/:id/invite', () => {
    it('should allow owner to invite a user', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      await createUserAndToken('bob', 'bob@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: user._id,
        members: [{ user_id: user._id, role: 'owner' }],
      });

      const res = await request(app)
        .post(`/groups/${group._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'bob' });

      expect(res.status).toBe(200);
    });

    it('should return 403 if requester is a plain member', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      await createUserAndToken('carol', 'carol@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: alice._id,
        members: [
          { user_id: alice._id, role: 'owner' },
          { user_id: bob._id, role: 'member' },
        ],
      });

      const res = await request(app)
        .post(`/groups/${group._id}/invite`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ username: 'carol' });

      expect(res.status).toBe(403);
    });

    it('should return 404 if invitee does not exist', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: user._id,
        members: [{ user_id: user._id, role: 'owner' }],
      });

      const res = await request(app)
        .post(`/groups/${group._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'nobody' });

      expect(res.status).toBe(404);
    });

    it('should return 409 if invitee is already a member', async () => {
      const { user: alice, token } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob } = await createUserAndToken('bob', 'bob@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: alice._id,
        members: [
          { user_id: alice._id, role: 'owner' },
          { user_id: bob._id, role: 'member' },
        ],
      });

      const res = await request(app)
        .post(`/groups/${group._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'bob' });

      expect(res.status).toBe(409);
    });

    it('should return 409 if invitee already has a pending invite', async () => {
      const { user: alice, token } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob } = await createUserAndToken('bob', 'bob@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: alice._id,
        members: [{ user_id: alice._id, role: 'owner' }],
        invites: [{ user_id: bob._id, invited_by: alice._id, status: 'pending' }],
      });

      const res = await request(app)
        .post(`/groups/${group._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'bob' });

      expect(res.status).toBe(409);
    });
  });

  // --- RESPOND TO INVITE ---
  describe('POST /groups/:id/invite/respond', () => {
    it('should add user to members when invite is accepted', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: alice._id,
        members: [{ user_id: alice._id, role: 'owner' }],
        invites: [{ user_id: bob._id, invited_by: alice._id, status: 'pending' }],
      });

      const res = await request(app)
        .post(`/groups/${group._id}/invite/respond`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ accept: true });

      expect(res.status).toBe(200);
      const updated = await Group.findById(group._id);
      const isMember = updated.members.some(m => m.user_id.toString() === bob._id.toString());
      expect(isMember).toBe(true);
    });

    it('should not add user to members when invite is declined', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: alice._id,
        members: [{ user_id: alice._id, role: 'owner' }],
        invites: [{ user_id: bob._id, invited_by: alice._id, status: 'pending' }],
      });

      const res = await request(app)
        .post(`/groups/${group._id}/invite/respond`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ accept: false });

      expect(res.status).toBe(200);
      const updated = await Group.findById(group._id);
      const isMember = updated.members.some(m => m.user_id.toString() === bob._id.toString());
      expect(isMember).toBe(false);
    });

    it('should return 404 if no pending invite exists', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: alice._id,
        members: [{ user_id: alice._id, role: 'owner' }],
      });

      const res = await request(app)
        .post(`/groups/${group._id}/invite/respond`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ accept: true });

      expect(res.status).toBe(404);
    });

    it('should return 400 if accept field is missing', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: alice._id,
        members: [{ user_id: alice._id, role: 'owner' }],
        invites: [{ user_id: bob._id, invited_by: alice._id, status: 'pending' }],
      });

      const res = await request(app)
        .post(`/groups/${group._id}/invite/respond`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // --- LEAVE GROUP ---
  describe('DELETE /groups/:id/leave', () => {
    it('should remove a non-owner member from the group', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: alice._id,
        members: [
          { user_id: alice._id, role: 'owner' },
          { user_id: bob._id, role: 'member' },
        ],
      });

      const res = await request(app)
        .delete(`/groups/${group._id}/leave`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(200);
      const updated = await Group.findById(group._id);
      const isMember = updated.members.some(m => m.user_id.toString() === bob._id.toString());
      expect(isMember).toBe(false);
    });

    it('should delete the group if the owner leaves', async () => {
      const { user: alice, token: aliceToken } = await createUserAndToken('alice', 'alice@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: alice._id,
        members: [{ user_id: alice._id, role: 'owner' }],
      });

      const res = await request(app)
        .delete(`/groups/${group._id}/leave`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      const deleted = await Group.findById(group._id);
      expect(deleted).toBeNull();
    });

    it('should return 403 if user is not a member', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');

      const group = await Group.create({
        group_name: 'Test Group',
        owner_id: alice._id,
        members: [{ user_id: alice._id, role: 'owner' }],
      });

      const res = await request(app)
        .delete(`/groups/${group._id}/leave`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });
  });
});
