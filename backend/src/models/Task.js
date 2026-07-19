import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a task title'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    dueDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'completed'],
      default: 'todo'
    },
    subtasks: [
      {
        title: {
          type: String,
          required: true
        },
        isCompleted: {
          type: Boolean,
          default: false
        },
        assignee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null
        }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model('Task', TaskSchema);
