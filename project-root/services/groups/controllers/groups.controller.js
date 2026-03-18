const mongoose = require('mongoose');
const Group = require('../../../shared/models/Group');
const User  = require('../../../shared/models/User');

// POST /groups
const createGroup = async (req, res) => {
  try {
    const { group_name, description, is_private } = req.body;

    if (!group_name) {
      return res.status(400).json({ error: 'group_name is required.' });
    }

    const group = await Group.create({
      group_name,
      owner_id: req.user._id,
      members: [{ user_id: req.user._id, role: 'owner' }],
      metadata: { description: description || '' },
      is_private: is_private || false,
      last_message_at: new Date(),
    });

    return res.status(201).json({ message: 'Group created successfully.', group });
  } catch (err) {
    console.error('createGroup error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

const inviteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'username is required.' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!group.is_private) {
      return res.status(400).json({ error: 'This room is public. Invites are only for private rooms.' });
    }

    if (group.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the owner can invite users.' });
    }

    const invitee = await User.findOne({ username });
    if (!invitee) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const alreadyMember = group.members.some(
      m => m.user_id.toString() === invitee._id.toString()
    );
    if (alreadyMember) {
      return res.status(409).json({ error: 'User is already a member of this group.' });
    }

    const alreadyInvited = group.invites.some(
      i => i.user_id.toString() === invitee._id.toString()
    );
    if (alreadyInvited) {
      return res.status(409).json({ error: 'User already has a pending invite.' });
    }

    group.invites.push({
      user_id: invitee._id,
      invited_by: req.user._id,
    });
    await group.save();

    return res.status(200).json({ message: `Invite sent to ${username}.` });
  } catch (err) {
    console.error('inviteUser error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

const respondToInvite = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const { accept } = req.body;
    if (typeof accept !== 'boolean') {
      return res.status(400).json({ error: 'accept (boolean) is required.' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const invite = group.invites.find(
      i => i.user_id.toString() === req.user._id.toString() && i.status === 'pending'
    );
    if (!invite) {
      return res.status(404).json({ error: 'No pending invite found.' });
    }

    if (accept) {
      invite.status = 'accepted';
    } else {
      group.invites = group.invites.filter(
        i => i.user_id.toString() !== req.user._id.toString()
      );
    }

    await group.save();

    return res.status(200).json({
      message: accept ? 'Invite accepted.' : 'Invite declined.',
    });
  } catch (err) {
    console.error('respondToInvite error:', err);
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

    if (group.is_private) {
      const isOwner = group.owner_id.toString() === req.user._id.toString();
      const acceptedInvite = group.invites.find(
        i => i.user_id.toString() === req.user._id.toString() && i.status === 'accepted'
      );
      if (!acceptedInvite && !isOwner) {
        return res.status(403).json({ error: 'This room is private. You must be invited to join.' });
      }
      // group.invites = group.invites.filter(
      //   i => i.user_id.toString() !== req.user._id.toString()
      // );
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

const updateGroup = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (group.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the owner can update this group.' });
    }

    const { is_private } = req.body;

    if (typeof is_private === 'boolean') {
      group.is_private = is_private;
      if (is_private) {
        group.invites = group.members
          .filter(m => m.user_id.toString() !== group.owner_id.toString())
          .map(m => ({
            user_id: m.user_id,
            invited_by: group.owner_id,
            status: 'accepted',
          }));
      }
    }

    await group.save();

    return res.status(200).json({ group });
  } catch (err) {
    console.error('updateGroup error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

const banUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid ID.' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (group.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the owner can ban users.' });
    }

    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot ban yourself.' });
    }

    const isMember = group.members.some(
      m => m.user_id.toString() === req.params.userId
    );
    if (!isMember) {
      return res.status(404).json({ error: 'User is not a member of this group.' });
    }

    group.members = group.members.filter(
      m => m.user_id.toString() !== req.params.userId
    );
    group.invites = group.invites.filter(
      i => i.user_id.toString() !== req.params.userId
    );

    await group.save();

    return res.status(200).json({ message: 'User banned successfully.' });
  } catch (err) {
    console.error('banUser error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = {
  createGroup,
  joinGroup,
  getGroups,
  getGroupById,
  leaveGroup,
  deleteGroup,
  inviteUser,
  respondToInvite,
  updateGroup,
  banUser,
};
