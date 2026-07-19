import express from 'express';
import Announcement from '../models/Announcement.js';
import { protect, verifyWorkspaceAccess } from '../middleware/auth.js';

const router = express.Router();

// Apply auth protection for all announcement routes
router.use(protect);

// @desc    Get all announcements in a workspace
// @route   GET /api/announcements/:workspaceId
// @access  Private (Workspace Member Only)
router.get('/:workspaceId', verifyWorkspaceAccess, async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ workspace: req.params.workspaceId })
      .populate('author', 'fullName email profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      announcements
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create a new announcement in a workspace
// @route   POST /api/announcements/:workspaceId
// @access  Private (Workspace Member Only)
router.post('/:workspaceId', verifyWorkspaceAccess, async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Please add a title and content' });
    }

    const announcement = await Announcement.create({
      workspace: req.params.workspaceId,
      title,
      content,
      author: req.user.id
    });

    const populated = await announcement.populate('author', 'fullName email profilePicture');

    res.status(201).json({
      success: true,
      announcement: populated
    });
  } catch (error) {
    next(error);
  }
});

export default router;
