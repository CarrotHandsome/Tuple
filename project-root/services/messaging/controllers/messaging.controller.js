const mongoose = require('mongoose');
const Message = require('../../../shared/models/Message');
const Group   = require('../../../shared/models/Group');

// Helper: check if a user is a member of a group
const isMember = (group, userId) =>
  group.members.some(m => m.user_id.toString() === userId.toString());

// POST /messages
const sendMessage = async (req, res) => {
  try {
    const { group_id, content, attachments } = req.body;

    if (!group_id) {
      return res.status(400).json({ error: 'group_id is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(group_id)) {
      return res.status(400).json({ error: 'Invalid group_id.' });
    }

    if ((!content || content.trim() === '') && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message must have content or an attachment.' });
    }

    const group = await Group.findById(group_id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!isMember(group, req.user._id)) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    const message = await Message.create({
      group_id,
      sender_id: req.user._id,
      content:   content ? content.trim() : '',
    });

    // Update group's last_message_at so groups list stays sorted
    group.last_message_at = message.timestamp;
    await group.save();

    return res.status(201).json({ message });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /messages/:groupId
const getMessages = async (req, res) => {
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

    const messages = await Message.find({ group_id: groupId })
  .sort({ timestamp: 1 })
  .populate('sender_id', 'username');
  
    return res.status(200).json({ messages });
  } catch (err) {
    console.error('getMessages error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { sendMessage, getMessages };
