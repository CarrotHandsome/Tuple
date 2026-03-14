const mongoose = require('mongoose');
const Attachment = require('../../shared/models/Attachment');
const User       = require('../../shared/models/User');
const Group      = require('../../shared/models/Group');
const Message    = require('../../shared/models/Message');
const { connect, disconnect, clearDatabase } = require('../testSetup');

describe('Attachment Model', () => {
  beforeAll(async () => await connect());
  afterAll(async () => await disconnect());
  afterEach(async () => await clearDatabase());

  let userId, groupId, messageId;

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

    const message = await Message.create({
      group_id:  groupId,
      sender_id: userId,
      content:   'Message with attachment',
    });
    messageId = message._id;
  });

  it('should create a valid attachment successfully', async () => {
    const attachment = await Attachment.create({
      type:        'image',
      url:         '/uploads/test.png',
      uploaded_by: userId,
      group_id:    groupId,
      message_id:  messageId,
    });

    expect(attachment._id).toBeDefined();
    expect(attachment.type).toBe('image');
    expect(attachment.url).toBe('/uploads/test.png');
  });

  it('should require type', async () => {
    await expect(Attachment.create({
      url:         '/uploads/test.png',
      uploaded_by: userId,
      group_id:    groupId,
      message_id:  messageId,
    })).rejects.toThrow();
  });

  it('should require url', async () => {
    await expect(Attachment.create({
      type:        'image',
      uploaded_by: userId,
      group_id:    groupId,
      message_id:  messageId,
    })).rejects.toThrow();
  });

  it('should require uploaded_by', async () => {
    await expect(Attachment.create({
      type:       'image',
      url:        '/uploads/test.png',
      group_id:   groupId,
      message_id: messageId,
    })).rejects.toThrow();
  });

  it('should require group_id', async () => {
    await expect(Attachment.create({
      type:        'image',
      url:         '/uploads/test.png',
      uploaded_by: userId,
      message_id:  messageId,
    })).rejects.toThrow();
  });

  it('should require message_id', async () => {
    await expect(Attachment.create({
      type:        'image',
      url:         '/uploads/test.png',
      uploaded_by: userId,
      group_id:    groupId,
    })).rejects.toThrow();
  });

  it('should only allow valid type values', async () => {
    await expect(Attachment.create({
      type:        'video',
      url:         '/uploads/test.mp4',
      uploaded_by: userId,
      group_id:    groupId,
      message_id:  messageId,
    })).rejects.toThrow();
  });

  it('should allow type of file', async () => {
    const attachment = await Attachment.create({
      type:        'file',
      url:         '/uploads/test.pdf',
      uploaded_by: userId,
      group_id:    groupId,
      message_id:  messageId,
    });
    expect(attachment.type).toBe('file');
  });
});
