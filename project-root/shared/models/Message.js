const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  group_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  content:   { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  read_by:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }],
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
