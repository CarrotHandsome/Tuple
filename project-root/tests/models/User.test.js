const User = require('../../shared/models/User');
const { connect, disconnect, clearDatabase } = require('../testSetup');

describe('User Model', () => {
  beforeAll(async () => await connect());
  afterAll(async () => await disconnect());
  afterEach(async () => await clearDatabase());

  it('should create a valid user successfully', async () => {
    const user = await User.create({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
      profile_info: { display_name: 'Alice', bio: 'Hello!' },
      status: 'online',
    });

    expect(user._id).toBeDefined();
    expect(user.username).toBe('alice');
    expect(user.email).toBe('alice@example.com');
    expect(user.status).toBe('online');
    expect(user.profile_info.display_name).toBe('Alice');
  });

  it('should default status to offline', async () => {
    const user = await User.create({
      username: 'bob',
      email: 'bob@example.com',
      password_hash: 'hashed_password',
    });
    expect(user.status).toBe('offline');
  });

  it('should require username', async () => {
    await expect(User.create({
      email: 'noname@example.com',
      password_hash: 'hashed_password',
    })).rejects.toThrow();
  });

  it('should require email', async () => {
    await expect(User.create({
      username: 'noEmail',
      password_hash: 'hashed_password',
    })).rejects.toThrow();
  });

  it('should require password_hash', async () => {
    await expect(User.create({
      username: 'noPassword',
      email: 'nopassword@example.com',
    })).rejects.toThrow();
  });

  it('should enforce unique username', async () => {
    await User.create({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
    });
    await expect(User.create({
      username: 'alice',
      email: 'alice2@example.com',
      password_hash: 'hashed_password',
    })).rejects.toThrow();
  });

  it('should enforce unique email', async () => {
    await User.create({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
    });
    await expect(User.create({
      username: 'alice2',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
    })).rejects.toThrow();
  });

  it('should only allow valid status values', async () => {
    await expect(User.create({
      username: 'badstatus',
      email: 'badstatus@example.com',
      password_hash: 'hashed_password',
      status: 'away',
    })).rejects.toThrow();
  });
});
