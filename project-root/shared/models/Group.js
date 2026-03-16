const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joined_at: { type: Date, default: Date.now },
}, { _id: false });

const inviteSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:     { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  created_at: { type: Date, default: Date.now },
}, { _id: false });

const groupSchema = new mongoose.Schema({
  group_name: { type: String, required: true, trim: true },
  owner_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:    [memberSchema],
  invites: [inviteSchema],
  last_message_at: { type: Date, default: Date.now },
  is_private: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
