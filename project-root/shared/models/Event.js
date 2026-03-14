const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  remind_at: { type: Date, required: true },
  sent:      { type: Boolean, default: false },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  group_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String },
  start_time:  { type: Date, required: true },
  end_time:    { type: Date, required: true },
  created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendees:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reminders:   [reminderSchema],
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
