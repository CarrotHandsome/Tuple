const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware/auth.middleware');
const {
  sendMessage,
  getMessages,
} = require('../controllers/messaging.controller');

router.use(authMiddleware);

router.post('/', sendMessage);
router.get('/:groupId', getMessages);


module.exports = router;
