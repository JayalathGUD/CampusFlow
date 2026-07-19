import express from 'express';
import multer from 'multer';
import {
  getResources,
  uploadResource,
  incrementDownloads,
  approveResource,
  deleteResource
} from '../controllers/resourceController.js';
import { protect, optionalProtect } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

const router = express.Router();

router.get('/', optionalProtect, getResources);
router.put('/:resourceId/download', protect, incrementDownloads);

router.post('/', protect, upload.single('file'), uploadResource);
router.put('/:resourceId/approve', protect, approveResource);
router.delete('/:resourceId', protect, deleteResource);

export default router;
