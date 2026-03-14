const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:    { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
  joined_at: { type: Date, default: Date.now },
}, { _id: false });

const inviteSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:     { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  created_at: { type: Date, default: Date.now },
}, { _id: false });

const groupSchema = new mongoose.Schema({
  group_name: { type: String, required: true, trim: true },
  owner_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:    [memberSchema],
  invites:    [inviteSchema],
  metadata: {
    description: { type: String },
    avatar_url:  { type: String },
  },
  last_message_at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
