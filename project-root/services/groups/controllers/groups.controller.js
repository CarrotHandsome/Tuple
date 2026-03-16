const mongoose = require('mongoose');
const Group = require('../../../shared/models/Group');
const User  = require('../../../shared/models/User');

// POST /groups
const createGroup = async (req, res) => {
  try {
    const { group_name, description } = req.body;

    if (!group_name) {
      return res.status(400).json({ error: 'group_name is required.' });
    }

    const group = await Group.create({
      group_name,
      owner_id: req.user._id,
      members: [{ user_id: req.user._id, role: 'owner' }],
      metadata: { description: description || '' },
      last_message_at: new Date(),
    });

    return res.status(201).json({ message: 'Group created successfully.', group });
  } catch (err) {
    console.error('createGroup error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

const joinGroup = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const alreadyMember = group.members.some(
      m => m.user_id.toString() === req.user._id.toString()
    );
    if (alreadyMember) {
      return res.status(409).json({ error: 'You are already a member of this group.' });
    }

    group.members.push({ user_id: req.user._id });
    await group.save();

    return res.status(200).json({ message: 'Joined group successfully.' });
  } catch (err) {
    console.error('joinGroup error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /groups
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({})
      .sort({ last_message_at: -1 });

    return res.status(200).json({ groups });
  } catch (err) {
    console.error('getGroups error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /groups/:id
const getGroupById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const isMember = group.members.some(
      m => m.user_id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    return res.status(200).json({ group });
  } catch (err) {
    console.error('getGroupById error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};



// DELETE /groups/:id/leave
const leaveGroup = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const isMember = group.members.some(
      m => m.user_id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    // If the owner leaves, delete the group
    if (group.owner_id.toString() === req.user._id.toString()) {
      await Group.findByIdAndDelete(group._id);
      return res.status(200).json({ message: 'Group deleted as owner left.' });
    }

    group.members = group.members.filter(
      m => m.user_id.toString() !== req.user._id.toString()
    );
    await group.save();

    return res.status(200).json({ message: 'You have left the group.' });
  } catch (err) {
    console.error('leaveGroup error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

const deleteGroup = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (group.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the owner can delete this group.' });
    }

    await Group.findByIdAndDelete(group._id);

    return res.status(200).json({ message: 'Group deleted successfully.' });
  } catch (err) {
    console.error('deleteGroup error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = {
  createGroup,
  joinGroup,
  getGroups,
  getGroupById,
  leaveGroup,
  deleteGroup
};
