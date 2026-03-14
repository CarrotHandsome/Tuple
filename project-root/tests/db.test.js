const mongoose = require('mongoose');
const { connect, disconnect } = require('./testSetup');

describe('Database Connection', () => {
  beforeAll(async () => await connect(), 30000);
  afterAll(async () => await disconnect(), 30000);

  it('should connect to the in-memory database successfully', () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  it('should disconnect cleanly', async () => {
    await mongoose.connection.close();
    expect(mongoose.connection.readyState).toBe(0); // 0 = disconnected
  });
});
