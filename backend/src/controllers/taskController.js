import Task from '../models/Task.js';

// @desc    Get all tasks for a workspace
// @route   GET /api/tasks/:workspaceId
// @access  Private (Workspace Member)
export const getWorkspaceTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ workspace: req.params.workspaceId })
      .populate('assignee', 'fullName email profilePicture')
      .populate('subtasks.assignee', 'fullName email profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks/:workspaceId
// @access  Private (Workspace Member)
export const createTask = async (req, res, next) => {
  try {
    const { title, description, assignee, priority, dueDate, status, subtasks } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const task = await Task.create({
      title,
      description: description || '',
      workspace: req.params.workspaceId,
      assignee: assignee || null,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      status: status || 'todo',
      subtasks: subtasks || []
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignee', 'fullName email profilePicture')
      .populate('subtasks.assignee', 'fullName email profilePicture');

    res.status(201).json({
      success: true,
      task: populatedTask
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a task status/details (Kanban Drag & Drop)
// @route   PUT /api/tasks/detail/:taskId
// @access  Private
export const updateTask = async (req, res, next) => {
  try {
    const { title, description, assignee, priority, dueDate, status, subtasks, subtaskId, subtaskCompleted } = req.body;
    
    let task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Direct toggle/update for nested subtask items
    if (subtaskId !== undefined) {
      const sub = task.subtasks.id(subtaskId);
      if (sub) {
        sub.isCompleted = subtaskCompleted !== undefined ? subtaskCompleted : !sub.isCompleted;
      }
      await task.save();
      const populatedTask = await Task.findById(task._id)
        .populate('assignee', 'fullName email profilePicture')
        .populate('subtasks.assignee', 'fullName email profilePicture');
      
      return res.status(200).json({
        success: true,
        task: populatedTask
      });
    }

    // Validation checks for status change
    if (status && status !== task.status) {
      // 1. Assignee lock: Only the assignee can change the status
      if (!task.assignee || task.assignee.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Only the assigned student can update the status of this task.' });
      }

      // 2. Forward-only progress check
      const statusOrder = ['todo', 'in_progress', 'review', 'completed'];
      const oldIndex = statusOrder.indexOf(task.status);
      const newIndex = statusOrder.indexOf(status);
      if (newIndex <= oldIndex) {
        return res.status(400).json({ message: 'Tasks can only be moved forward in progress status.' });
      }
    }

    const fieldsToUpdate = {
      title,
      description,
      assignee,
      priority,
      dueDate,
      status,
      subtasks
    };

    // Filter out undefined properties
    Object.keys(fieldsToUpdate).forEach(
      (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    task = await Task.findByIdAndUpdate(req.params.taskId, fieldsToUpdate, {
      new: true,
      runValidators: true
    })
      .populate('assignee', 'fullName email profilePicture')
      .populate('subtasks.assignee', 'fullName email profilePicture');

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/detail/:taskId
// @access  Private
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
