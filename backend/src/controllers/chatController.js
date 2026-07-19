import Message from '../models/Message.js';

// @desc    Get chat message history for a workspace
// @route   GET /api/chat/workspace/:workspaceId
// @access  Private (Workspace Member)
export const getWorkspaceMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ workspace: req.params.workspaceId })
      .populate('sender', 'fullName email profilePicture')
      .sort({ createdAt: 1 })
      .limit(100); // Limit to last 100 messages

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get direct messages history between two users
// @route   GET /api/chat/direct/:userId
// @access  Private
export const getDirectMessages = async (req, res, next) => {
  try {
    const myId = req.user.id;
    const peerId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: peerId },
        { sender: peerId, recipient: myId }
      ]
    })
      .populate('sender', 'fullName email profilePicture')
      .populate('recipient', 'fullName email profilePicture')
      .sort({ createdAt: 1 })
      .limit(100);

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message (REST fallback/file attachment)
// @route   POST /api/chat
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const { workspaceId, recipientId, content, type, fileUrl, fileName } = req.body;

    if (!content && !fileUrl) {
      return res.status(400).json({ message: 'Message content or file is required' });
    }

    const message = await Message.create({
      workspace: workspaceId || null,
      recipient: recipientId || null,
      sender: req.user.id,
      content: content || '',
      type: type || 'text',
      fileUrl: fileUrl || '',
      fileName: fileName || ''
    });

    const populatedMsg = await Message.findById(message._id)
      .populate('sender', 'fullName email profilePicture');

    res.status(201).json({
      success: true,
      message: populatedMsg
    });
  } catch (error) {
    next(error);
  }
};
