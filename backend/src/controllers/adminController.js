import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import File from '../models/File.js';
import AIRequest from '../models/AIRequest.js';
import Resource from '../models/Resource.js';

// @desc    Get aggregate analytics metrics
// @route   GET /api/admin/analytics
// @access  Private (Admin Only)
export const getAnalytics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalWorkspaces = await Workspace.countDocuments();
    const totalNotes = await Note.countDocuments();
    const totalTasks = await Task.countDocuments();
    const totalFiles = await File.countDocuments();
    const totalResources = await Resource.countDocuments();
    const totalAIRequests = await AIRequest.countDocuments();

    // Grouping count for university demographics (simple aggregation)
    const universityDemographics = await User.aggregate([
      { $group: { _id: '$university', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Grouping counts for AI types
    const aiRequestBreakdown = await AIRequest.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        totalWorkspaces,
        totalNotes,
        totalTasks,
        totalFiles,
        totalResources,
        totalAIRequests,
        universityDemographics,
        aiRequestBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all users (with optional query filter)
// @route   GET /api/admin/users
// @access  Private (Admin Only)
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:userId
// @access  Private (Admin Only)
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Owner protection
    if (user.role === 'admin' && req.user.id !== user._id.toString()) {
      return res.status(403).json({ message: 'Cannot delete another admin user' });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all workspaces
// @route   GET /api/admin/workspaces
// @access  Private (Admin Only)
export const getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find()
      .populate('owner', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      workspaces
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a workspace
// @route   DELETE /api/admin/workspaces/:workspaceId
// @access  Private (Admin Only)
export const deleteWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    await workspace.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
