require('dotenv').config();
const connectDB  = require('./shared/db');
const User       = require('./shared/models/User');
const Group      = require('./shared/models/Group');
const Message    = require('./shared/models/Message');
const Attachment = require('./shared/models/Attachment');
const Event      = require('./shared/models/Event');

const seed = async () => {
  await connectDB();

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Group.deleteMany({}),
    Message.deleteMany({}),
    Attachment.deleteMany({}),
    Event.deleteMany({}),
  ]);
  console.log('Cleared existing collections.');

  // Create users
  const [alice, bob, carol] = await User.insertMany([
    {
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password_alice',
      profile_info: { display_name: 'Alice', bio: 'Hello, I am Alice.' },
      status: 'online',
    },
    {
      username: 'bob',
      email: 'bob@example.com',
      password_hash: 'hashed_password_bob',
      profile_info: { display_name: 'Bob', bio: 'Hello, I am Bob.' },
      status: 'offline',
    },
    {
      username: 'carol',
      email: 'carol@example.com',
      password_hash: 'hashed_password_carol',
      profile_info: { display_name: 'Carol', bio: 'Hello, I am Carol.' },
      status: 'offline',
    },
  ]);
  console.log('Created users: alice, bob, carol');

  // Create a group
  const group = await Group.create({
    group_name: 'Test Group',
    owner_id: alice._id,
    members: [
      { user_id: alice._id, role: 'owner' },
      { user_id: bob._id,   role: 'member' },
      { user_id: carol._id, role: 'member' },
    ],
    metadata: { description: 'A test group for seeding.' },
    last_message_at: new Date(),
  });
  console.log('Created group: Test Group');

  // Create messages
  const [msg1, msg2] = await Message.insertMany([
    {
      group_id:  group._id,
      sender_id: alice._id,
      content:   'Hey everyone, welcome to the group!',
      read_by:   [alice._id, bob._id],
    },
    {
      group_id:  group._id,
      sender_id: bob._id,
      content:   'Thanks Alice! Excited to be here.',
      read_by:   [alice._id, bob._id],
    },
  ]);
  console.log('Created messages');

  // Create an attachment
  await Attachment.create({
    type:        'image',
    url:         '/uploads/test_image.png',
    uploaded_by: alice._id,
    group_id:    group._id,
    message_id:  msg1._id,
  });
  console.log('Created attachment');

  // Create an event
  const start = new Date();
  start.setDate(start.getDate() + 3);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);

  await Event.create({
    group_id:    group._id,
    title:       'Team Kickoff',
    description: 'Our first group meeting.',
    start_time:  start,
    end_time:    end,
    created_by:  alice._id,
    attendees:   [alice._id, bob._id, carol._id],
    reminders:   [{ remind_at: new Date(start.getTime() - 60 * 60 * 1000) }],
  });
  console.log('Created event: Team Kickoff');

  console.log('\nSeed complete.');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
