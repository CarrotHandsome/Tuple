const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  group_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  content:   { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },  
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
