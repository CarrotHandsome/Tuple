require('dotenv').config({ path: require('path').resolve(__dirname, '../../services/events/.env') });
const request = require('supertest');
const app = require('../../services/events/index');
const User = require('../../shared/models/User');
const Group = require('../../shared/models/Group');
const Event = require('../../shared/models/Event');
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
  });
};

const futureDate = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
};

describe('Events Routes', () => {
  beforeAll(async () => await connect(), 30000);
  afterAll(async () => await disconnect(), 30000);
  afterEach(async () => await clearDatabase());

  // --- CREATE EVENT ---
  describe('POST /events', () => {
    it('should create an event successfully', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          group_id:   group._id.toString(),
          title:      'Team Meeting',
          start_time: futureDate(1),
          end_time:   futureDate(2),
        });

      expect(res.status).toBe(201);
      expect(res.body.event.title).toBe('Team Meeting');
    });

    it('should add creator to attendees by default', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          group_id:   group._id.toString(),
          title:      'Team Meeting',
          start_time: futureDate(1),
          end_time:   futureDate(2),
        });

      expect(res.body.event.attendees).toContain(user._id.toString());
    });

    it('should return 400 if title is missing', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          group_id:   group._id.toString(),
          start_time: futureDate(1),
          end_time:   futureDate(2),
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 if start_time is missing', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          group_id: group._id.toString(),
          title:    'Team Meeting',
          end_time: futureDate(2),
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 if start_time is after end_time', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          group_id:   group._id.toString(),
          title:      'Team Meeting',
          start_time: futureDate(2),
          end_time:   futureDate(1),
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 if group_id is invalid', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          group_id:   'notanid',
          title:      'Team Meeting',
          start_time: futureDate(1),
          end_time:   futureDate(2),
        });

      expect(res.status).toBe(400);
    });

    it('should return 403 if user is not a member of the group', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          group_id:   group._id.toString(),
          title:      'Team Meeting',
          start_time: futureDate(1),
          end_time:   futureDate(2),
        });

      expect(res.status).toBe(403);
    });

    it('should return 404 if group does not exist', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          group_id:   fakeId.toString(),
          title:      'Team Meeting',
          start_time: futureDate(1),
          end_time:   futureDate(2),
        });

      expect(res.status).toBe(404);
    });
  });

  // --- GET GROUP EVENTS ---
  describe('GET /events/group/:groupId', () => {
    it('should return events sorted by start_time ascending', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      await Event.create({ group_id: group._id, title: 'Later',  start_time: futureDate(3), end_time: futureDate(4), created_by: user._id });
      await Event.create({ group_id: group._id, title: 'Sooner', start_time: futureDate(1), end_time: futureDate(2), created_by: user._id });

      const res = await request(app)
        .get(`/events/group/${group._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.events[0].title).toBe('Sooner');
      expect(res.body.events[1].title).toBe('Later');
    });

    it('should return an empty array if no events exist', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .get(`/events/group/${group._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.events).toHaveLength(0);
    });

    it('should return 403 if user is not a member', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);

      const res = await request(app)
        .get(`/events/group/${group._id}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 400 for an invalid group ID', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .get('/events/group/notanid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('should return 404 for a nonexistent group', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/events/group/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // --- GET ALL EVENTS ---
  describe('GET /events/all', () => {
    it('should return events from all groups the user is a member of', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group1 = await createGroup(user._id);
      const group2 = await createGroup(user._id);

      await Event.create({ group_id: group1._id, title: 'Event 1', start_time: futureDate(1), end_time: futureDate(2), created_by: user._id });
      await Event.create({ group_id: group2._id, title: 'Event 2', start_time: futureDate(3), end_time: futureDate(4), created_by: user._id });

      const res = await request(app)
        .get('/events/all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.events).toHaveLength(2);
    });

    it('should not return events from groups the user is not a member of', async () => {
      const { user: alice, token: aliceToken } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob } = await createUserAndToken('bob', 'bob@example.com');
      const bobGroup = await createGroup(bob._id);

      await Event.create({ group_id: bobGroup._id, title: 'Bobs Event', start_time: futureDate(1), end_time: futureDate(2), created_by: bob._id });

      const res = await request(app)
        .get('/events/all')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.events).toHaveLength(0);
    });

    it('should return empty array if user has no groups', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .get('/events/all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.events).toHaveLength(0);
    });
  });

  // --- GET EVENT BY ID ---
  describe('GET /events/:id', () => {
    it('should return an event for a group member', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);
      const event = await Event.create({ group_id: group._id, title: 'My Event', start_time: futureDate(1), end_time: futureDate(2), created_by: user._id });

      const res = await request(app)
        .get(`/events/${event._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.event.title).toBe('My Event');
    });

    it('should return 403 for a non-member', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);
      const event = await Event.create({ group_id: group._id, title: 'My Event', start_time: futureDate(1), end_time: futureDate(2), created_by: alice._id });

      const res = await request(app)
        .get(`/events/${event._id}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for a nonexistent event', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/events/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for an invalid event ID', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .get('/events/notanid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  // --- UPDATE EVENT ---
  describe('PUT /events/:id', () => {
    it('should update an event successfully', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);
      const event = await Event.create({ group_id: group._id, title: 'Old Title', start_time: futureDate(1), end_time: futureDate(2), created_by: user._id });

      const res = await request(app)
        .put(`/events/${event._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.event.title).toBe('New Title');
    });

    it('should return 403 if user is not the creator', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id, [bob._id]);
      const event = await Event.create({ group_id: group._id, title: 'Alice Event', start_time: futureDate(1), end_time: futureDate(2), created_by: alice._id });

      const res = await request(app)
        .put(`/events/${event._id}`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ title: 'Bob Edited' });

      expect(res.status).toBe(403);
    });

    it('should return 400 if updated start_time is after end_time', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);
      const event = await Event.create({ group_id: group._id, title: 'Event', start_time: futureDate(1), end_time: futureDate(2), created_by: user._id });

      const res = await request(app)
        .put(`/events/${event._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ start_time: futureDate(5), end_time: futureDate(3) });

      expect(res.status).toBe(400);
    });

    it('should return 404 for a nonexistent event', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/events/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  // --- DELETE EVENT ---
  describe('DELETE /events/:id', () => {
    it('should delete an event successfully', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);
      const event = await Event.create({ group_id: group._id, title: 'To Delete', start_time: futureDate(1), end_time: futureDate(2), created_by: user._id });

      const res = await request(app)
        .delete(`/events/${event._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const deleted = await Event.findById(event._id);
      expect(deleted).toBeNull();
    });

    it('should return 403 if user is not the creator', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id, [bob._id]);
      const event = await Event.create({ group_id: group._id, title: 'Alice Event', start_time: futureDate(1), end_time: futureDate(2), created_by: alice._id });

      const res = await request(app)
        .delete(`/events/${event._id}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for a nonexistent event', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/events/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
