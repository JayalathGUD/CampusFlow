import mongoose from 'mongoose';

const AnnouncementSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Please add an announcement title'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Please add announcement content']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('Announcement', AnnouncementSchema);
