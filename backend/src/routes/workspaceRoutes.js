import express from 'express';
import {
  createWorkspace,
  joinWorkspace,
  getMyWorkspaces,
  getWorkspaceMembers,
  updateMemberRole
} from '../controllers/workspaceController.js';
import { protect, verifyWorkspaceAccess } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createWorkspace);
router.post('/join', joinWorkspace);
router.get('/', getMyWorkspaces);

router.get('/:workspaceId/members', verifyWorkspaceAccess, getWorkspaceMembers);
router.put('/:workspaceId/members/:memberId', verifyWorkspaceAccess, updateMemberRole);

export default router;
