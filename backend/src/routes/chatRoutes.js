import express from 'express';
import {
  getWorkspaceMessages,
  getDirectMessages,
  sendMessage
} from '../controllers/chatController.js';
import { protect, verifyWorkspaceAccess } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/workspace/:workspaceId', verifyWorkspaceAccess, getWorkspaceMessages);
router.get('/direct/:userId', getDirectMessages);
router.post('/', sendMessage);

export default router;
