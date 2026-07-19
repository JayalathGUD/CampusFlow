import express from 'express';
import {
  getWorkspaceTasks,
  createTask,
  updateTask,
  deleteTask
} from '../controllers/taskController.js';
import { protect, verifyWorkspaceAccess } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:workspaceId', verifyWorkspaceAccess, getWorkspaceTasks);
router.post('/:workspaceId', verifyWorkspaceAccess, createTask);

router.put('/detail/:taskId', updateTask);
router.delete('/detail/:taskId', deleteTask);

export default router;
