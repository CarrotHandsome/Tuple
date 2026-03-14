const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  type:        { type: String, enum: ['image', 'file'], required: true },
  url:         { type: String, required: true },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  group_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Group',   required: true },
  message_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
  timestamp:   { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Attachment', attachmentSchema);
