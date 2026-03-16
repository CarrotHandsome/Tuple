require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('../shared/db');
const User = require('../shared/models/User');
const Group = require('../shared/models/Group');
const Message = require('../shared/models/Message');

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// --- AUTH MIDDLEWARE ---
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('No token provided.'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error('Invalid or expired token.'));
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('User not found.'));
    }

    const tokenExists = user.auth_tokens.some(t => t.token === token);
    if (!tokenExists) {
      return next(new Error('Token has been invalidated.'));
    }

    socket.user = user;
    socket.token = token;
    next();
  } catch (err) {
    next(new Error('Authentication error.'));
  }
});

// --- CONNECTION ---
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.user.username}`);


  // Mark user online
  await User.findByIdAndUpdate(socket.user._id, { status: 'online' });
  io.emit('user:status', { userId: socket.user._id, status: 'online' });

  // --- JOIN ROOM ---
  socket.on('join_room', (groupId) => {
  socket.join(groupId);
  console.log(`${socket.user.username} joined room ${groupId}`);
});

  // --- LEAVE ROOM ---
  socket.on('leave_room', (groupId) => {
    socket.leave(groupId);
    console.log(`${socket.user.username} left room ${groupId}`);
  });

  //CREATE ROOM
  socket.on('room:created', (group) => {
    io.emit('room:created', group);
  });
  //DELETE ROOM
  socket.on('room:deleted', (groupId) => {
    io.emit('room:deleted', { groupId });
  });

  // --- SEND MESSAGE ---
  socket.on('message:send', async (data) => {
    try {
      const { group_id, content } = data;

      if (!group_id || !content || content.trim() === '') return;

      const group = await Group.findById(group_id);
      if (!group) return;

      const isMember = group.members.some(
        m => m.user_id.toString() === socket.user._id.toString()
      );
      if (!isMember) return;

      const message = await Message.create({
        group_id,
        sender_id: socket.user._id,
        content:   content.trim(),
      });
      

      // Update group's last_message_at
      group.last_message_at = message.timestamp;
      await group.save();

      // Broadcast to everyone in the room including sender
      io.to(group_id).emit('message:new', {
        _id:       message._id,
        group_id:  message.group_id,
        sender_id: message.sender_id,
        username:  socket.user.username,
        content:   message.content,
        timestamp: message.timestamp,
      });
    } catch (err) {
      console.error('message:send error:', err);
    }
  });

  // --- TYPING INDICATORS ---
  socket.on('typing:start', (groupId) => {
    socket.to(groupId).emit('typing:start', {
      userId:   socket.user._id,
      username: socket.user.username,
      groupId,
    });
  });

  socket.on('typing:stop', (groupId) => {
    socket.to(groupId).emit('typing:stop', {
      userId:   socket.user._id,
      username: socket.user.username,
      groupId,
    });
  });

  // --- DISCONNECT ---
  socket.on('disconnect', async () => {
    await User.findByIdAndUpdate(socket.user._id, { status: 'offline' });
    io.emit('user:status', { userId: socket.user._id, status: 'offline' });
  });
});

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  connectDB().then(() => {
    server.listen(PORT, () => {
      console.log(`Socket.io gateway running on port ${PORT}`);
    });
  });
}

module.exports = { io, server };
