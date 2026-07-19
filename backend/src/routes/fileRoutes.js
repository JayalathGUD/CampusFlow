import express from 'express';
import multer from 'multer';
import {
  getWorkspaceFiles,
  uploadFile,
  deleteFile
} from '../controllers/fileController.js';
import { protect, verifyWorkspaceAccess } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const router = express.Router();

router.use(protect);

router.get('/:workspaceId', verifyWorkspaceAccess, getWorkspaceFiles);
router.post('/:workspaceId', verifyWorkspaceAccess, upload.single('file'), uploadFile);
router.delete('/detail/:fileId', deleteFile);

export default router;
