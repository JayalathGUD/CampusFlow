import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['task_assigned', 'new_message', 'file_uploaded', 'deadline_reminder'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model('Notification', NotificationSchema);
