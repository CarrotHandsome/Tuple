const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware/auth.middleware');
const {
  createGroup,
  getUserGroups,
  getGroupById,
  inviteUser,
  respondToInvite,
  leaveGroup,
} = require('../controllers/groups.controller');

// All routes require authentication
router.use(authMiddleware);

router.post('/', createGroup);
router.get('/', getUserGroups);
router.get('/:id', getGroupById);
router.post('/:id/invite', inviteUser);
router.post('/:id/invite/respond', respondToInvite);
router.delete('/:id/leave', leaveGroup);

module.exports = router;
