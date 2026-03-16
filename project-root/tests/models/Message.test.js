const mongoose = require('mongoose');
const Message = require('../../shared/models/Message');
const User    = require('../../shared/models/User');
const Group   = require('../../shared/models/Group');
const { connect, disconnect, clearDatabase } = require('../testSetup');

describe('Message Model', () => {
  beforeAll(async () => await connect());
  afterAll(async () => await disconnect());
  afterEach(async () => await clearDatabase());

  let userId, groupId;

  beforeEach(async () => {
    const user = await User.create({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
    });
    userId = user._id;

    const group = await Group.create({
      group_name: 'Test Group',
      owner_id: userId,
    });
    groupId = group._id;
  });

  it('should create a valid message successfully', async () => {
    const message = await Message.create({
      group_id:  groupId,
      sender_id: userId,
      content:   'Hello, world!',
    });

    expect(message._id).toBeDefined();
    expect(message.content).toBe('Hello, world!');
    expect(message.group_id.toString()).toBe(groupId.toString());
    expect(message.sender_id.toString()).toBe(userId.toString());
  });

  it('should require group_id', async () => {
    await expect(Message.create({
      sender_id: userId,
      content: 'No group',
    })).rejects.toThrow();
  });

  it('should require sender_id', async () => {
    await expect(Message.create({
      group_id: groupId,
      content: 'No sender',
    })).rejects.toThrow();
  });

  it('should default content to empty string', async () => {
    const message = await Message.create({
      group_id:  groupId,
      sender_id: userId,
    });
    expect(message.content).toBe('');
  });

  it('should set a default timestamp', async () => {
    const message = await Message.create({
      group_id:  groupId,
      sender_id: userId,
      content:   'Timestamp test',
    });
    expect(message.timestamp).toBeDefined();
  });
});
