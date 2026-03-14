const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware/auth.middleware');
const {
  sendMessage,
  getMessages,
  markAsRead,
} = require('../controllers/messaging.controller');

router.use(authMiddleware);

router.post('/', sendMessage);
router.get('/:groupId', getMessages);
router.put('/:groupId/read', markAsRead);

module.exports = router;
