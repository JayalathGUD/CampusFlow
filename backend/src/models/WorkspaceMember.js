import mongoose from 'mongoose';

const WorkspaceMemberSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    }
  },
  { timestamps: true }
);

// Ensure a user cannot be added to a workspace twice
WorkspaceMemberSchema.index({ workspace: 1, user: 1 }, { unique: true });

export default mongoose.model('WorkspaceMember', WorkspaceMemberSchema);
