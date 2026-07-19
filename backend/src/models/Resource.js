import mongoose from 'mongoose';

const ResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a resource title'],
      trim: true
    },
    category: {
      type: String,
      enum: ['notes', 'past_paper', 'presentation', 'other'],
      default: 'other'
    },
    subject: {
      type: String,
      required: [true, 'Please specify a subject'],
      trim: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      default: ''
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    downloadsCount: {
      type: Number,
      default: 0
    },
    tags: {
      type: [String],
      default: []
    },
    isApproved: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model('Resource', ResourceSchema);
