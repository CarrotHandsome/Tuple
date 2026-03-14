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

// GET /groups
const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({ 'members.user_id': req.user._id })
      .sort({ last_message_at: -1 });

    return res.status(200).json({ groups });
  } catch (err) {
    console.error('getUserGroups error:', err);
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

// POST /groups/:id/invite
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

    // Check that the requester is an owner or admin
    const requesterMember = group.members.find(
      m => m.user_id.toString() === req.user._id.toString()
    );
    if (!requesterMember || !['owner', 'admin'].includes(requesterMember.role)) {
      return res.status(403).json({ error: 'Only owners and admins can invite users.' });
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
      i => i.user_id.toString() === invitee._id.toString() && i.status === 'pending'
    );
    if (alreadyInvited) {
      return res.status(409).json({ error: 'User already has a pending invite.' });
    }

    group.invites.push({
      user_id: invitee._id,
      invited_by: req.user._id,
      status: 'pending',
    });
    await group.save();

    return res.status(200).json({ message: `Invite sent to ${username}.` });
  } catch (err) {
    console.error('inviteUser error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// POST /groups/:id/invite/respond
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
      return res.status(404).json({ error: 'No pending invite found for this user.' });
    }

    if (accept) {
      invite.status = 'accepted';
      group.members.push({ user_id: req.user._id, role: 'member' });
    } else {
      invite.status = 'declined';
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

module.exports = {
  createGroup,
  getUserGroups,
  getGroupById,
  inviteUser,
  respondToInvite,
  leaveGroup,
};
