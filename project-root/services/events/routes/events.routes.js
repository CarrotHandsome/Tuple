const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware/auth.middleware');
const {
  createEvent,
  getGroupEvents,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} = require('../controllers/events.controller');

router.use(authMiddleware);

router.post('/', createEvent);
router.get('/all', getAllEvents);
router.get('/group/:groupId', getGroupEvents);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

module.exports = router;
