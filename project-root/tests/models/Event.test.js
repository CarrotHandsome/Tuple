const mongoose = require('mongoose');
const Event = require('../../shared/models/Event');
const User  = require('../../shared/models/User');
const Group = require('../../shared/models/Group');
const { connect, disconnect, clearDatabase } = require('../testSetup');

describe('Event Model', () => {
  beforeAll(async () => await connect());
  afterAll(async () => await disconnect());
  afterEach(async () => await clearDatabase());

  let userId, groupId, startTime, endTime;

  beforeEach(async () => {
    const user = await User.create({
      username: 'alice',
      email: 'alice@example.com',
      password_hash: 'hashed_password',
    });
    userId = user._id;

    const group = await Group.create({
      group_name: 'Test Group',
      owner_id: userId,
    });
    groupId = group._id;

    startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 2);
  });

  it('should create a valid event successfully', async () => {
    const event = await Event.create({
      group_id:   groupId,
      title:      'Team Meeting',
      start_time: startTime,
      end_time:   endTime,
      created_by: userId,
    });

    expect(event._id).toBeDefined();
    expect(event.title).toBe('Team Meeting');
    expect(event.group_id.toString()).toBe(groupId.toString());
    expect(event.created_by.toString()).toBe(userId.toString());
  });

  it('should require group_id', async () => {
    await expect(Event.create({
      title:      'No Group Event',
      start_time: startTime,
      end_time:   endTime,
      created_by: userId,
    })).rejects.toThrow();
  });

  it('should require title', async () => {
    await expect(Event.create({
      group_id:   groupId,
      start_time: startTime,
      end_time:   endTime,
      created_by: userId,
    })).rejects.toThrow();
  });

  it('should require start_time', async () => {
    await expect(Event.create({
      group_id:   groupId,
      title:      'No Start Time',
      end_time:   endTime,
      created_by: userId,
    })).rejects.toThrow();
  });

  it('should require end_time', async () => {
    await expect(Event.create({
      group_id:   groupId,
      title:      'No End Time',
      start_time: startTime,
      created_by: userId,
    })).rejects.toThrow();
  });

  it('should require created_by', async () => {
    await expect(Event.create({
      group_id:   groupId,
      title:      'No Creator',
      start_time: startTime,
      end_time:   endTime,
    })).rejects.toThrow();
  });

  it('should store attendees as an array of user references', async () => {
    const event = await Event.create({
      group_id:   groupId,
      title:      'Attendee Test',
      start_time: startTime,
      end_time:   endTime,
      created_by: userId,
      attendees:  [userId],
    });
    expect(event.attendees).toHaveLength(1);
    expect(event.attendees[0].toString()).toBe(userId.toString());
  });

  it('should store reminders correctly', async () => {
    const remindAt = new Date(startTime.getTime() - 60 * 60 * 1000);
    const event = await Event.create({
      group_id:   groupId,
      title:      'Reminder Test',
      start_time: startTime,
      end_time:   endTime,
      created_by: userId,
      reminders:  [{ remind_at: remindAt }],
    });
    expect(event.reminders).toHaveLength(1);
    expect(event.reminders[0].remind_at.toISOString()).toBe(remindAt.toISOString());
    expect(event.reminders[0].sent).toBe(false);
  });
});
