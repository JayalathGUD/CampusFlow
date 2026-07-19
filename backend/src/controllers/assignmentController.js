import Assignment from '../models/Assignment.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import Task from '../models/Task.js';

// @desc    Get all assignments for a workspace
// @route   GET /api/assignments/:workspaceId
// @access  Private (Workspace Member)
export const getWorkspaceAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.find({ workspace: req.params.workspaceId })
      .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      assignments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new assignment
// @route   POST /api/assignments/:workspaceId
// @access  Private (Workspace Member)
export const createAssignment = async (req, res, next) => {
  try {
    const { title, description, dueDate, status, progress, reminders } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: 'Assignment title and due date are required' });
    }

    const assignment = await Assignment.create({
      title,
      description: description || '',
      dueDate,
      workspace: req.params.workspaceId,
      status: status || 'pending',
      progress: progress || 0,
      reminders: reminders || []
    });

    res.status(201).json({
      success: true,
      assignment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update assignment progress/status
// @route   PUT /api/assignments/detail/:assignmentId
// @access  Private
export const updateAssignment = async (req, res, next) => {
  try {
    const { title, description, dueDate, status, progress, reminders } = req.body;
    let assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const fieldsToUpdate = {
      title,
      description,
      dueDate,
      status,
      progress,
      reminders
    };

    // Filter out undefined
    Object.keys(fieldsToUpdate).forEach(
      (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    assignment = await Assignment.findByIdAndUpdate(req.params.assignmentId, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      assignment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active assignments across all user workspaces (Calendar Schedule)
// @route   GET /api/assignments/calendar/me
// @access  Private
export const getCalendarAssignments = async (req, res, next) => {
  try {
    // Find all workspaces current user belongs to
    const memberships = await WorkspaceMember.find({ user: req.user.id });
    const workspaceIds = memberships.map(m => m.workspace);

    const tasks = await Task.find({
      workspace: { $in: workspaceIds },
      dueDate: { $ne: null }
    })
      .populate('workspace', 'name')
      .sort({ dueDate: 1 });

    // Map tasks to resemble the Assignment model for frontend consumption
    const formattedAssignments = tasks.map(t => ({
      _id: t._id,
      title: t.title,
      dueDate: t.dueDate,
      workspace: t.workspace,
      status: t.status === 'completed' ? 'submitted' : 'pending'
    }));

    res.status(200).json({
      success: true,
      assignments: formattedAssignments
    });
  } catch (error) {
    next(error);
  }
};
