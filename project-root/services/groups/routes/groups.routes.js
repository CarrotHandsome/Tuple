const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware/auth.middleware');
const {
  createGroup,
  joinGroup,
  getGroups,
  getGroupById,
  leaveGroup,
  deleteGroup,
  updateGroup,
  inviteUser,
  respondToInvite,
} = require('../controllers/groups.controller');

// All routes require authentication
router.use(authMiddleware);

router.post('/', createGroup);
router.post('/:id/join', joinGroup);
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.delete('/:id/leave', leaveGroup);
router.delete('/:id', deleteGroup);
router.post('/:id/invite', inviteUser);
router.post('/:id/invite/respond', respondToInvite);
router.patch('/:id', updateGroup);
//router.delete('/:id/members/:userId', banUser);

module.exports = router;
