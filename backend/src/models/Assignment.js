import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add an assignment title'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    dueDate: {
      type: Date,
      required: [true, 'Please add a due date']
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'graded'],
      default: 'pending'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    reminders: {
      type: [Date],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.model('Assignment', AssignmentSchema);
