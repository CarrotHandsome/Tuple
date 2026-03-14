const mongoose = require('mongoose');
const Group = require('../../shared/models/Group');
const User  = require('../../shared/models/User');
const { connect, disconnect, clearDatabase } = require('../testSetup');

describe('Group Model', () => {
  beforeAll(async () => await connect());
  afterAll(async () => await disconnect());
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
      members: [{ user_id: userId, role: 'owner' }],
    });

    expect(group._id).toBeDefined();
    expect(group.group_name).toBe('Test Group');
    expect(group.owner_id.toString()).toBe(userId.toString());
    expect(group.members).toHaveLength(1);
    expect(group.members[0].role).toBe('owner');
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

  it('should default member role to member', async () => {
    const group = await Group.create({
      group_name: 'Role Test Group',
      owner_id: userId,
      members: [{ user_id: userId }],
    });
    expect(group.members[0].role).toBe('member');
  });

  it('should only allow valid member roles', async () => {
    await expect(Group.create({
      group_name: 'Bad Role Group',
      owner_id: userId,
      members: [{ user_id: userId, role: 'superadmin' }],
    })).rejects.toThrow();
  });

  it('should store group metadata', async () => {
    const group = await Group.create({
      group_name: 'Meta Group',
      owner_id: userId,
      metadata: { description: 'A test description' },
    });
    expect(group.metadata.description).toBe('A test description');
  });

  it('should set last_message_at by default', async () => {
    const group = await Group.create({
      group_name: 'Timestamp Group',
      owner_id: userId,
    });
    expect(group.last_message_at).toBeDefined();
  });
});
