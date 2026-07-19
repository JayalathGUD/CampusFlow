import mongoose from 'mongoose';

const WorkspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a workspace name'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    semester: {
      type: String,
      default: 'Semester 1'
    },
    department: {
      type: String,
      default: 'Software Engineering'
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    inviteCode: {
      type: String,
      unique: true,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('Workspace', WorkspaceSchema);
