require('dotenv').config({ path: require('path').resolve(__dirname, '../../services/messaging/.env') });
const request = require('supertest');
const app = require('../../services/messaging/index');
const User = require('../../shared/models/User');
const Group = require('../../shared/models/Group');
const Message = require('../../shared/models/Message');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase } = require('../testSetup');

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

const createGroup = async (ownerId, memberIds = []) => {
  return await Group.create({
    group_name: 'Test Group',
    owner_id: ownerId,
    members: [
      { user_id: ownerId, role: 'owner' },
      ...memberIds.map(id => ({ user_id: id, role: 'member' })),
    ],
    last_message_at: new Date('2024-01-01'),
  });
};

describe('Messaging Routes', () => {
  beforeAll(async () => await connect(), 30000);
  afterAll(async () => await disconnect(), 30000);
  afterEach(async () => await clearDatabase());

  // --- SEND MESSAGE ---
  describe('POST /messages', () => {
    it('should send a message successfully', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_id: group._id.toString(), content: 'Hello!' });

      expect(res.status).toBe(201);
      expect(res.body.message.content).toBe('Hello!');
    });

    it('should store the message with the correct sender and group', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_id: group._id.toString(), content: 'Hello!' });

      expect(res.body.message.sender_id.toString()).toBe(user._id.toString());
      expect(res.body.message.group_id.toString()).toBe(group._id.toString());
    });

    

    it('should update last_message_at on the group', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);
      const originalTime = group.last_message_at;

      await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_id: group._id.toString(), content: 'Hello!' });

      const updated = await Group.findById(group._id);
      expect(updated.last_message_at.getTime()).toBeGreaterThan(originalTime.getTime());
    });

    it('should return 400 if content is empty and no attachments', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_id: group._id.toString(), content: '' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if group_id is missing', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Hello!' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if group_id is invalid', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_id: 'notanid', content: 'Hello!' });

      expect(res.status).toBe(400);
    });

    it('should return 403 if user is not a member of the group', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ group_id: group._id.toString(), content: 'Hello!' });

      expect(res.status).toBe(403);
    });

    it('should return 404 if group does not exist', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ group_id: fakeId.toString(), content: 'Hello!' });

      expect(res.status).toBe(404);
    });
  });

  // --- GET MESSAGES ---
  describe('GET /messages/:groupId', () => {
    it('should return messages sorted oldest to newest', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      await Message.create({ group_id: group._id, sender_id: user._id, content: 'First',  timestamp: new Date('2024-01-01') });
      await Message.create({ group_id: group._id, sender_id: user._id, content: 'Second', timestamp: new Date('2024-01-02') });
      await Message.create({ group_id: group._id, sender_id: user._id, content: 'Third',  timestamp: new Date('2024-01-03') });

      const res = await request(app)
        .get(`/messages/${group._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.messages[0].content).toBe('First');
      expect(res.body.messages[1].content).toBe('Second');
      expect(res.body.messages[2].content).toBe('Third');
    });

    it('should return an empty array if there are no messages', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .get(`/messages/${group._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(0);
    });

    it('should return 403 if user is not a member', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);

      const res = await request(app)
        .get(`/messages/${group._id}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 400 for an invalid group ID', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .get('/messages/notanid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('should return 404 for a nonexistent group', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/messages/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
