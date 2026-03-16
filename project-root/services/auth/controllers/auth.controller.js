const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../../shared/models/User');

const SALT_ROUNDS = 10;

// POST /auth/register
const register = async (req, res) => {
  try {
    const { username, email, password, firstname, lastname } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required.' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already in use.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      username,
      email,
      password_hash,
      firstname, 
      lastname
    });

    return res.status(201).json({
      message: 'User registered successfully.',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// POST /auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
  { userId: user._id, username: user.username, jti: new mongoose.Types.ObjectId().toString() },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN }
);

    user.auth_tokens.push({ token });
    user.last_login = new Date();
    user.status = 'online';
    await user.save();

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// POST /auth/logout
const logout = async (req, res) => {
  try {
    const token = req.token;
    const user = req.user;

    user.auth_tokens = user.auth_tokens.filter(t => t.token !== token);
    user.status = 'offline';
    await user.save();

    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstname, lastname } = req.body;

    if (firstname === undefined && lastname === undefined) {
      return res.status(400).json({ error: 'At least one of firstname or lastname is required.' });
    }

    const updates = {};
    if (firstname !== undefined) updates.firstname = firstname;
    if (lastname !== undefined)  updates.lastname  = lastname;

    await User.findByIdAndUpdate(req.user._id, updates);

    return res.status(200).json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { register, login, logout, updateProfile };
