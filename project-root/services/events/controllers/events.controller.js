const mongoose = require('mongoose');
const Event = require('../../../shared/models/Event');
const Group = require('../../../shared/models/Group');

// Helper: check if a user is a member of a group
const isMember = (group, userId) =>
  group.members.some(m => m.user_id.toString() === userId.toString());

// POST /events
const createEvent = async (req, res) => {
  try {
    const { group_id, title, description, start_time, end_time, attendees, reminders } = req.body;

    if (!group_id || !title || !start_time || !end_time) {
      return res.status(400).json({ error: 'group_id, title, start_time and end_time are required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(group_id)) {
      return res.status(400).json({ error: 'Invalid group_id.' });
    }

    const start = new Date(start_time);
    const end   = new Date(end_time);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid start_time or end_time.' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'start_time must be before end_time.' });
    }

    const group = await Group.findById(group_id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!isMember(group, req.user._id)) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    const event = await Event.create({
      group_id,
      title,
      description:  description || '',
      start_time:   start,
      end_time:     end,
      created_by:   req.user._id,
      attendees:    attendees || [req.user._id],
      reminders:    reminders
        ? reminders.map(r => ({ remind_at: new Date(r) }))
        : [],
    });

    return res.status(201).json({ event });
  } catch (err) {
    console.error('createEvent error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /events/group/:groupId
const getGroupEvents = async (req, res) => {
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

    const events = await Event.find({ group_id: groupId }).sort({ start_time: 1 });

    return res.status(200).json({ events });
  } catch (err) {
    console.error('getGroupEvents error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /events/all
const getAllEvents = async (req, res) => {
  try {
    // Find all groups the user is a member of
    const groups = await Group.find({ 'members.user_id': req.user._id });
    const groupIds = groups.map(g => g._id);

    const events = await Event.find({ group_id: { $in: groupIds } }).sort({ start_time: 1 });

    return res.status(200).json({ events });
  } catch (err) {
    console.error('getAllEvents error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /events/:id
const getEventById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid event ID.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const group = await Group.findById(event.group_id);
    if (!group || !isMember(group, req.user._id)) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    return res.status(200).json({ event });
  } catch (err) {
    console.error('getEventById error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// PUT /events/:id
const updateEvent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid event ID.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (event.created_by.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the event creator can edit this event.' });
    }

    const { title, description, start_time, end_time, attendees, reminders } = req.body;

    const start = start_time ? new Date(start_time) : event.start_time;
    const end   = end_time   ? new Date(end_time)   : event.end_time;

    if (start >= end) {
      return res.status(400).json({ error: 'start_time must be before end_time.' });
    }

    if (title)       event.title       = title;
    if (description !== undefined) event.description = description;
    if (start_time)  event.start_time  = start;
    if (end_time)    event.end_time    = end;
    if (attendees)   event.attendees   = attendees;
    if (reminders)   event.reminders   = reminders.map(r => ({ remind_at: new Date(r) }));

    await event.save();

    return res.status(200).json({ event });
  } catch (err) {
    console.error('updateEvent error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// DELETE /events/:id
const deleteEvent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid event ID.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (event.created_by.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the event creator can delete this event.' });
    }

    await Event.findByIdAndDelete(event._id);

    return res.status(200).json({ message: 'Event deleted successfully.' });
  } catch (err) {
    console.error('deleteEvent error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = {
  createEvent,
  getGroupEvents,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
