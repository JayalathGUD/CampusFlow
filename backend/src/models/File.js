import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a file name'],
      trim: true
    },
    url: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    folder: {
      type: String,
      default: '/' // For simple directory trees inside workspaces
    }
  },
  { timestamps: true }
);

export default mongoose.model('File', FileSchema);
