import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null // null if direct message
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // null if channel/workspace message
    },
    content: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['text', 'file'],
      default: 'text'
    },
    fileUrl: {
      type: String,
      default: ''
    },
    fileName: {
      type: String,
      default: ''
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        emoji: String
      }
    ]
  },
  { timestamps: true }
);

// Helper index for retrieving messages efficiently
MessageSchema.index({ workspace: 1, createdAt: 1 });
MessageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });

export default mongoose.model('Message', MessageSchema);
