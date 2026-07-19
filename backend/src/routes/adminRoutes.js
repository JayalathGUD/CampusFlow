import express from 'express';
import {
  getAnalytics,
  getUsers,
  deleteUser,
  getWorkspaces,
  deleteWorkspace
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/analytics', getAnalytics);
router.get('/users', getUsers);
router.delete('/users/:userId', deleteUser);
router.get('/workspaces', getWorkspaces);
router.delete('/workspaces/:workspaceId', deleteWorkspace);

export default router;
