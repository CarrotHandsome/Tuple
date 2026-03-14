const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Attachment = require('../../../shared/models/Attachment');
const Group = require('../../../shared/models/Group');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// File filter — images only
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Helper: check if a user is a member of a group
const isMember = (group, userId) =>
  group.members.some(m => m.user_id.toString() === userId.toString());

// POST /images/upload
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const { group_id, message_id } = req.body;

   if (!group_id) {
  fs.unlinkSync(req.file.path);
  return res.status(400).json({ error: 'group_id is required.' });
}

if (!mongoose.Types.ObjectId.isValid(group_id)) {
  fs.unlinkSync(req.file.path);
  return res.status(400).json({ error: 'Invalid group_id.' });
}

if (message_id && !mongoose.Types.ObjectId.isValid(message_id)) {
  fs.unlinkSync(req.file.path);
  return res.status(400).json({ error: 'Invalid message_id.' });
}

    const group = await Group.findById(group_id);
    if (!group) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!isMember(group, req.user._id)) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    const url = `/uploads/${req.file.filename}`;

    const attachment = await Attachment.create({
      type:        'image',
      url,
      uploaded_by: req.user._id,
      group_id,
      message_id: message_id || null,
    });

    return res.status(201).json({ attachment });
  } catch (err) {
    // Clean up uploaded file on unexpected error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('uploadImage error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /images/group/:groupId
const getGroupImages = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!isMember(group, req.user._id)) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    const attachments = await Attachment.find({ group_id: groupId, type: 'image' })
      .sort({ timestamp: -1 });

    return res.status(200).json({ attachments });
  } catch (err) {
    console.error('getGroupImages error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// DELETE /images/:id
const deleteImage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid attachment ID.' });
    }

    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }

    if (attachment.uploaded_by.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the uploader can delete this image.' });
    }

    // Delete the file from disk
    const filePath = path.join(__dirname, '..', attachment.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Attachment.findByIdAndDelete(attachment._id);

    return res.status(200).json({ message: 'Image deleted successfully.' });
  } catch (err) {
    console.error('deleteImage error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { upload, uploadImage, getGroupImages, deleteImage, uploadsDir };

