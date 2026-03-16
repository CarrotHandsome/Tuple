const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joined_at: { type: Date, default: Date.now },
}, { _id: false });

const groupSchema = new mongoose.Schema({
  group_name: { type: String, required: true, trim: true },
  owner_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:    [memberSchema],
  last_message_at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
