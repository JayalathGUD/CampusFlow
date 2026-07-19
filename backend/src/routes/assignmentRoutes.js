import express from 'express';
import {
  getWorkspaceAssignments,
  createAssignment,
  updateAssignment,
  getCalendarAssignments
} from '../controllers/assignmentController.js';
import { protect, verifyWorkspaceAccess } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/calendar/me', getCalendarAssignments);
router.get('/:workspaceId', verifyWorkspaceAccess, getWorkspaceAssignments);
router.post('/:workspaceId', verifyWorkspaceAccess, createAssignment);
router.put('/detail/:assignmentId', updateAssignment);

export default router;
