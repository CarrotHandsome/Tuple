require('dotenv').config({ path: require('path').resolve(__dirname, '../../services/images/.env') });
const { uploadsDir } = require('../../services/images/controllers/images.controller');
const request = require('supertest');
const app = require('../../services/images/index');
const User = require('../../shared/models/User');
const Group = require('../../shared/models/Group');
const Attachment = require('../../shared/models/Attachment');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
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

// Path to a small real test image bundled with the tests
const testImagePath = path.join(__dirname, 'test-image.png');

// Create a minimal valid PNG file for testing
const createTestImage = () => {
  // 1x1 transparent PNG in binary
  const png = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
    'hex'
  );
  fs.writeFileSync(testImagePath, png);
};

const cleanupTestImage = () => {
  if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
};

// Clean up any files written to the uploads directory during tests
const cleanupUploads = () => {
  const uploadsDir = path.join(__dirname, '../../../services/images/uploads');
  if (fs.existsSync(uploadsDir)) {
    fs.readdirSync(uploadsDir).forEach(file => {
      fs.unlinkSync(path.join(uploadsDir, file));
    });
  }
};

describe('Images Routes', () => {
  beforeAll(async () => {
    await connect();
    createTestImage();
  }, 30000);

  afterAll(async () => {
    cleanupTestImage();
    cleanupUploads();
    await disconnect();
  }, 30000);

  afterEach(async () => {
    await clearDatabase();
    cleanupUploads();
  });

  // --- UPLOAD IMAGE ---
  describe('POST /images/upload', () => {
    it('should upload an image and create an attachment record', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/images/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('group_id', group._id.toString())
        .attach('image', testImagePath);

      expect(res.status).toBe(201);
      expect(res.body.attachment).toBeDefined();
      expect(res.body.attachment.type).toBe('image');
    });

 it('should save the file to disk', async () => {
  const { user, token } = await createUserAndToken('alice', 'alice@example.com');
  const group = await createGroup(user._id);

  const res = await request(app)
    .post('/images/upload')
    .set('Authorization', `Bearer ${token}`)
    .field('group_id', group._id.toString())
    .attach('image', testImagePath);

  expect(res.status).toBe(201);
  const filename = path.basename(res.body.attachment.url);
  expect(fs.existsSync(path.join(uploadsDir, filename))).toBe(true);
});

    it('should store the correct uploader and group on the attachment', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/images/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('group_id', group._id.toString())
        .attach('image', testImagePath);

      expect(res.body.attachment.uploaded_by.toString()).toBe(user._id.toString());
      expect(res.body.attachment.group_id.toString()).toBe(group._id.toString());
    });

    it('should return 400 if no image is provided', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .post('/images/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('group_id', group._id.toString());

      expect(res.status).toBe(400);
    });

    it('should return 400 if group_id is missing', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .post('/images/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', testImagePath);

      expect(res.status).toBe(400);
    });

    it('should return 400 if group_id is invalid', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .post('/images/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('group_id', 'notanid')
        .attach('image', testImagePath);

      expect(res.status).toBe(400);
    });

    it('should return 403 if user is not a member of the group', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);

      const res = await request(app)
        .post('/images/upload')
        .set('Authorization', `Bearer ${bobToken}`)
        .field('group_id', group._id.toString())
        .attach('image', testImagePath);

      expect(res.status).toBe(403);
    });

    it('should return 404 if group does not exist', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/images/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('group_id', fakeId.toString())
        .attach('image', testImagePath);

      expect(res.status).toBe(404);
    });

    it('should reject non-image file types', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      // Create a temporary text file
      const textFilePath = path.join(__dirname, 'test.txt');
      fs.writeFileSync(textFilePath, 'not an image');

      const res = await request(app)
        .post('/images/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('group_id', group._id.toString())
        .attach('image', textFilePath);

      fs.unlinkSync(textFilePath);
      expect(res.status).toBe(400);
    });
  });

  // --- GET GROUP IMAGES ---
  describe('GET /images/group/:groupId', () => {
    it('should return all images for a group', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);
      const fakeMessageId = new mongoose.Types.ObjectId();

      await Attachment.create({ type: 'image', url: '/uploads/img1.png', uploaded_by: user._id, group_id: group._id, message_id: fakeMessageId });
      await Attachment.create({ type: 'image', url: '/uploads/img2.png', uploaded_by: user._id, group_id: group._id, message_id: fakeMessageId });

      const res = await request(app)
        .get(`/images/group/${group._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.attachments).toHaveLength(2);
    });

    it('should return an empty array if no images exist', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);

      const res = await request(app)
        .get(`/images/group/${group._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.attachments).toHaveLength(0);
    });

    it('should return 403 if user is not a member', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id);

      const res = await request(app)
        .get(`/images/group/${group._id}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 400 for an invalid group ID', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .get('/images/group/notanid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('should return 404 for a nonexistent group', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/images/group/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // --- DELETE IMAGE ---
  describe('DELETE /images/:id', () => {
    it('should delete the attachment record successfully', async () => {
      const { user, token } = await createUserAndToken('alice', 'alice@example.com');
      const group = await createGroup(user._id);
      const fakeMessageId = new mongoose.Types.ObjectId();

      const attachment = await Attachment.create({
        type: 'image',
        url: '/uploads/to-delete.png',
        uploaded_by: user._id,
        group_id: group._id,
        message_id: fakeMessageId,
      });

      const res = await request(app)
        .delete(`/images/${attachment._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const deleted = await Attachment.findById(attachment._id);
      expect(deleted).toBeNull();
    });

    it('should return 403 if user is not the uploader', async () => {
      const { user: alice } = await createUserAndToken('alice', 'alice@example.com');
      const { user: bob, token: bobToken } = await createUserAndToken('bob', 'bob@example.com');
      const group = await createGroup(alice._id, [bob._id]);
      const fakeMessageId = new mongoose.Types.ObjectId();

      const attachment = await Attachment.create({
        type: 'image',
        url: '/uploads/alices-image.png',
        uploaded_by: alice._id,
        group_id: group._id,
        message_id: fakeMessageId,
      });

      const res = await request(app)
        .delete(`/images/${attachment._id}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for a nonexistent attachment', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/images/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for an invalid attachment ID', async () => {
      const { token } = await createUserAndToken('alice', 'alice@example.com');

      const res = await request(app)
        .delete('/images/notanid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });
});
