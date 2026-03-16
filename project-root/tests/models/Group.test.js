const mongoose = require('mongoose');
const Group = require('../../shared/models/Group');
const User  = require('../../shared/models/User');
const { connect, disconnect, clearDatabase } = require('../testSetup');

describe('Group Model', () => {
  beforeAll(async () => await connect(), 30000);
  afterAll(async () => await disconnect(), 30000);
  afterEach(async () => await clearDatabase());

  let userId;

  beforeEach(async () => {
    const user = await User.create({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
    });
    userId = user._id;
  });

  it('should create a valid group successfully', async () => {
    const group = await Group.create({
      group_name: 'Test Group',
      owner_id: userId,
      members: [{ user_id: userId }],
    });

    expect(group._id).toBeDefined();
    expect(group.group_name).toBe('Test Group');
    expect(group.owner_id.toString()).toBe(userId.toString());
    expect(group.members).toHaveLength(1);
  });

  it('should require group_name', async () => {
    await expect(Group.create({
      owner_id: userId,
    })).rejects.toThrow();
  });

  it('should require owner_id', async () => {
    await expect(Group.create({
      group_name: 'No Owner Group',
    })).rejects.toThrow();
  });

  it('should store member user_id correctly', async () => {
    const group = await Group.create({
      group_name: 'Member Test Group',
      owner_id: userId,
      members: [{ user_id: userId }],
    });
    expect(group.members[0].user_id.toString()).toBe(userId.toString());
  });

  it('should set last_message_at by default', async () => {
    const group = await Group.create({
      group_name: 'Timestamp Group',
      owner_id: userId,
    });
    expect(group.last_message_at).toBeDefined();
  });
});
