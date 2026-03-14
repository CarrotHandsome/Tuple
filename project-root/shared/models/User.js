const mongoose = require('mongoose');

const authTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, trim: true, lowercase: true },
  password_hash: { type: String, required: true },
  profile_info: {
    display_name: { type: String, trim: true },
    avatar_url:   { type: String },
    bio:          { type: String },
  },
  auth_tokens: [authTokenSchema],
  last_login:  { type: Date },
  status:      { type: String, enum: ['online', 'offline'], default: 'offline' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
