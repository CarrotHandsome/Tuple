require('dotenv').config({ path: require('path').resolve(__dirname, '../../gateway/.env') });
const { io: Client } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { server, io } = require('../../gateway/index');
const User = require('../../shared/models/User');
const Group = require('../../shared/models/Group');
const Message = require('../../shared/models/Message');
const { connect, disconnect, clearDatabase } = require('../testSetup');

const PORT = 4001;
const URL = `http://localhost:${PORT}`;

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
      { user_id: ownerId },
      ...memberIds.map(id => ({ user_id: id })),
    ],
  });
};

const connectClient = (token) => {
  return new Promise((resolve, reject) => {
    const client = Client(URL, {
      auth: { token },
      forceNew: true,
    });
    client.on('connect', () => resolve(client));
    client.on('connect_error', (err) => reject(err));
  });
};

jest.setTimeout(10000);

describe('Socket.io Gateway', () => {
  beforeAll(async () => {
    await connect();
    await new Promise((resolve) => server.listen(PORT, resolve));
  }, 30000);

afterAll(async () => {
  await new Promise((resolve) => io.close(resolve));
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => setTimeout(resolve, 500));
  await disconnect();
}, 30000);

  afterEach(async () => await clearDatabase());

  // --- AUTHENTICATION ---
  describe('Authentication', () => {
    it('should reject connection if no token is provided', async () => {
      await expect(connectClient(null)).rejects.toThrow();
    });

    it('should reject connection if token is invalid', async () => {
      await expect(connectClient('notavalidtoken')).rejects.toThrow();
    });

    it('should reject connection if token has been invalidated', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      user.auth_tokens = [];
      await user.save();
      await expect(connectClient(token)).rejects.toThrow();
    });

    it('should connect successfully with a valid token', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const client = await connectClient(token);
      expect(client.connected).toBe(true);
      client.disconnect();
    });
  });

  // --- JOIN / LEAVE ROOM ---
  describe('join_room / leave_room', () => {
    it('should allow any authenticated user to join a room', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(bob._id);

      const client = await connectClient(token);

      await new Promise((resolve) => {
        client.emit('join_room', group._id.toString());
        setTimeout(resolve, 100);
      });

      expect(client.connected).toBe(true);
      client.disconnect();
    });

    it('should stop receiving room messages after leave_room', async () => {
      const { user: alice, token: aliceToken } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);

      const aliceClient = await connectClient(aliceToken);
      const bobClient = await connectClient(bobToken);

      const groupId = group._id.toString();

      await new Promise((resolve) => {
        aliceClient.emit('join_room', groupId);
        setTimeout(resolve, 100);
      });

      aliceClient.emit('leave_room', groupId);

      await new Promise((resolve) => setTimeout(resolve, 100));

      let received = false;
      aliceClient.on('message:new', () => { received = true; });

      bobClient.emit('join_room', groupId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      bobClient.emit('message:send', { group_id: groupId, content: 'Hello' });
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(received).toBe(false);

      aliceClient.disconnect();
      bobClient.disconnect();
    });
  });

  // --- MESSAGING ---
  describe('Messaging', () => {
    it('should save a message to the database when sent', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);
      const groupId = group._id.toString();

      const client = await connectClient(token);

      await new Promise((resolve) => {
        client.emit('join_room', groupId);
        setTimeout(resolve, 100);
      });

      client.emit('message:send', { group_id: groupId, content: 'Hello!' });
      await new Promise((resolve) => setTimeout(resolve, 300));

      const messages = await Message.find({ group_id: groupId });
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello!');

      client.disconnect();
    });

    it('should broadcast message:new to users in the room', async () => {
      const { user: alice, token: aliceToken } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id, [bob._id]);
      const groupId = group._id.toString();

      const aliceClient = await connectClient(aliceToken);
      const bobClient = await connectClient(bobToken);

      await new Promise((resolve) => {
        aliceClient.emit('join_room', groupId);
        bobClient.emit('join_room', groupId);
        setTimeout(resolve, 100);
      });

      const received = await new Promise((resolve) => {
        bobClient.on('message:new', (msg) => resolve(msg));
        aliceClient.emit('message:send', { group_id: groupId, content: 'Hey Bob!' });
      });

      expect(received.content).toBe('Hey Bob!');
      expect(received.username).toBe('alice');

      aliceClient.disconnect();
      bobClient.disconnect();
    });

    it('should send message:new back to the sender as well', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);
      const groupId = group._id.toString();

      const client = await connectClient(token);

      await new Promise((resolve) => {
        client.emit('join_room', groupId);
        setTimeout(resolve, 100);
      });

      const received = await new Promise((resolve) => {
        client.on('message:new', (msg) => resolve(msg));
        client.emit('message:send', { group_id: groupId, content: 'Hello!' });
      });

      expect(received.content).toBe('Hello!');
      client.disconnect();
    });

    it('should ignore empty messages', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);
      const groupId = group._id.toString();

      const client = await connectClient(token);

      await new Promise((resolve) => {
        client.emit('join_room', groupId);
        setTimeout(resolve, 100);
      });

      client.emit('message:send', { group_id: groupId, content: '' });
      await new Promise((resolve) => setTimeout(resolve, 200));

      const messages = await Message.find({ group_id: groupId });
      expect(messages).toHaveLength(0);

      client.disconnect();
    });

    it('should not save message if user is not a group member', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);
      const groupId = group._id.toString();

      const bobClient = await connectClient(bobToken);

      await new Promise((resolve) => {
        bobClient.emit('join_room', groupId);
        setTimeout(resolve, 100);
      });

      bobClient.emit('message:send', { group_id: groupId, content: 'Sneaky message' });
      await new Promise((resolve) => setTimeout(resolve, 200));

      const messages = await Message.find({ group_id: groupId });
      expect(messages).toHaveLength(0);

      bobClient.disconnect();
    });
  });

  // --- TYPING INDICATORS ---
  describe('Typing indicators', () => {
    it('should broadcast typing:start to other users in the room', async () => {
      const { user: alice, token: aliceToken } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);
      const groupId = group._id.toString();

      const aliceClient = await connectClient(aliceToken);
      const bobClient = await connectClient(bobToken);

      await new Promise((resolve) => {
        aliceClient.emit('join_room', groupId);
        bobClient.emit('join_room', groupId);
        setTimeout(resolve, 100);
      });

      const received = await new Promise((resolve) => {
        bobClient.on('typing:start', (data) => resolve(data));
        aliceClient.emit('typing:start', groupId);
      });

      expect(received.username).toBe('alice');
      expect(received.groupId).toBe(groupId);

      aliceClient.disconnect();
      bobClient.disconnect();
    });

    it('should broadcast typing:stop to other users in the room', async () => {
      const { user: alice, token: aliceToken } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);
      const groupId = group._id.toString();

      const aliceClient = await connectClient(aliceToken);
      const bobClient = await connectClient(bobToken);

      await new Promise((resolve) => {
        aliceClient.emit('join_room', groupId);
        bobClient.emit('join_room', groupId);
        setTimeout(resolve, 100);
      });

      const received = await new Promise((resolve) => {
        bobClient.on('typing:stop', (data) => resolve(data));
        aliceClient.emit('typing:stop', groupId);
      });

      expect(received.username).toBe('alice');
      aliceClient.disconnect();
      bobClient.disconnect();
    });

    it('should not send typing:start back to the sender', async () => {
      const { user: alice, token: aliceToken } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(alice._id);
      const groupId = group._id.toString();

      const aliceClient = await connectClient(aliceToken);

      await new Promise((resolve) => {
        aliceClient.emit('join_room', groupId);
        setTimeout(resolve, 100);
      });

      let received = false;
      aliceClient.on('typing:start', () => { received = true; });
      aliceClient.emit('typing:start', groupId);
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(received).toBe(false);
      aliceClient.disconnect();
    });
  });

  // --- ONLINE STATUS ---
  describe('Online status', () => {
    it('should set user status to online on connect', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const client = await connectClient(token);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updated = await User.findById(user._id);
      expect(updated.status).toBe('online');
      client.disconnect();
    });

    it('should set user status to offline on disconnect', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const client = await connectClient(token);
      await new Promise((resolve) => setTimeout(resolve, 100));

      await new Promise((resolve) => {
        client.on('disconnect', resolve);
        client.disconnect();
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      const updated = await User.findById(user._id);
      expect(updated.status).toBe('offline');
    });

    it('should broadcast user:status on connect', async () => {
      const { token: aliceToken } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');

      const bobClient = await connectClient(bobToken);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const received = await new Promise((resolve) => {
        bobClient.on('user:status', (data) => {
          if (data.status === 'online') resolve(data);
        });
        connectClient(aliceToken);
      });

      expect(received.status).toBe('online');
      bobClient.disconnect();
    });

    it('should broadcast user:status on disconnect', async () => {
      const { token: aliceToken } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');

      const aliceClient = await connectClient(aliceToken);
      const bobClient = await connectClient(bobToken);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const received = await new Promise((resolve) => {
        bobClient.on('user:status', (data) => {
          if (data.status === 'offline') resolve(data);
        });
        aliceClient.disconnect();
      });

      expect(received.status).toBe('offline');
      bobClient.disconnect();
    });
  });
});
