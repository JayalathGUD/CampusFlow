import mongoose from 'mongoose';

const NoteVersionSchema = new mongoose.Schema(
  {
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    version: {
      type: Number,
      required: true
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Ensure index on note and version
NoteVersionSchema.index({ note: 1, version: 1 }, { unique: true });

export default mongoose.model('NoteVersion', NoteVersionSchema);
