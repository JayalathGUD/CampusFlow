import mongoose from 'mongoose';

const AIRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['summarize', 'structure', 'quiz', 'flashcard'],
      required: true
    },
    prompt: {
      type: String,
      default: ''
    },
    response: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export default mongoose.model('AIRequest', AIRequestSchema);
