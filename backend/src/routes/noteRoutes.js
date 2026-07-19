import express from 'express';
import {
  getWorkspaceNotes,
  createNote,
  getNoteById,
  updateNote,
  saveNoteVersion,
  getNoteVersions
} from '../controllers/noteController.js';
import { protect, verifyWorkspaceAccess } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:workspaceId', verifyWorkspaceAccess, getWorkspaceNotes);
router.post('/:workspaceId', verifyWorkspaceAccess, createNote);

router.get('/detail/:noteId', getNoteById);
router.put('/detail/:noteId', updateNote);
router.get('/detail/:noteId/version', getNoteVersions);
router.post('/detail/:noteId/version', saveNoteVersion);

export default router;
