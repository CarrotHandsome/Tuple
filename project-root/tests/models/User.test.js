const User = require('../../shared/models/User');
const { connect, disconnect, clearDatabase } = require('../testSetup');

describe('User Model', () => {
  beforeAll(async () => await connect(), 30000);
  afterAll(async () => await disconnect(), 30000);
  afterEach(async () => await clearDatabase());

  it('should create a valid user successfully', async () => {
    const user = await User.create({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
      status: 'online',
    });

    expect(user._id).toBeDefined();
    expect(user.username).toBe('alice');
    expect(user.email).toBe('alice@example.com');
    expect(user.status).toBe('online');
  });

  it('should save firstname and lastname when provided', async () => {
    const user = await User.create({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
      firstname: 'Alice',
      lastname: 'Smith',
    });
    expect(user.firstname).toBe('Alice');
    expect(user.lastname).toBe('Smith');
  });

  it('should allow creation without firstname and lastname', async () => {
    const user = await User.create({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
    });
    expect(user.firstname).toBeUndefined();
    expect(user.lastname).toBeUndefined();
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
