const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware/auth.middleware');
const {
  createGroup,
  joinGroup,
  getGroups,
  getGroupById,
  leaveGroup,
  deleteGroup
} = require('../controllers/groups.controller');

// All routes require authentication
router.use(authMiddleware);

router.post('/', createGroup);
router.post('/:id/join', joinGroup);
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.delete('/:id/leave', leaveGroup);
router.delete('/:id', deleteGroup);

module.exports = router;
