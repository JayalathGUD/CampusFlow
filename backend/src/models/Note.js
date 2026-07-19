import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a note title'],
      trim: true
    },
    content: {
      type: String,
      default: ''
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lockedAt: {
      type: Date,
      default: null
    },
    tags: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.model('Note', NoteSchema);
