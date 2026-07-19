import Note from '../models/Note.js';
import NoteVersion from '../models/NoteVersion.js';

// @desc    Get all notes for a workspace
// @route   GET /api/notes/:workspaceId
// @access  Private (Workspace Member)
export const getWorkspaceNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ workspace: req.params.workspaceId })
      .populate('owner', 'fullName email profilePicture')
      .populate('lockedBy', 'fullName email profilePicture');

    res.status(200).json({
      success: true,
      notes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single note details
// @route   GET /api/notes/detail/:noteId
// @access  Private
export const getNoteById = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.noteId)
      .populate('owner', 'fullName email profilePicture')
      .populate('lockedBy', 'fullName email profilePicture');

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.status(200).json({
      success: true,
      note
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new note
// @route   POST /api/notes/:workspaceId
// @access  Private (Workspace Member)
export const createNote = async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Note title is required' });
    }

    const note = await Note.create({
      title,
      content: content || '',
      tags: tags || [],
      workspace: req.params.workspaceId,
      owner: req.user.id
    });

    res.status(201).json({
      success: true,
      note
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a note (auto-save)
// @route   PUT /api/notes/detail/:noteId
// @access  Private
export const updateNote = async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;
    const note = await Note.findById(req.params.noteId);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check locking mechanism: if locked by someone else, block updates
    if (note.lockedBy && note.lockedBy.toString() !== req.user.id) {
      return res.status(409).json({
        message: 'This document is currently being edited and locked by another user'
      });
    }

    note.title = title || note.title;
    note.content = content !== undefined ? content : note.content;
    note.tags = tags || note.tags;

    await note.save();

    res.status(200).json({
      success: true,
      note
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save snapshot version
// @route   POST /api/notes/detail/:noteId/version
// @access  Private
export const saveNoteVersion = async (req, res, next) => {
  try {
    const { content } = req.body;
    const noteId = req.params.noteId;

    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Find the latest version number
    const latestVersion = await NoteVersion.findOne({ note: noteId }).sort({ version: -1 });
    const versionNum = latestVersion ? latestVersion.version + 1 : 1;

    const snapshot = await NoteVersion.create({
      note: noteId,
      content: content || note.content,
      version: versionNum,
      savedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      version: snapshot
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get note version history
// @route   GET /api/notes/detail/:noteId/version
// @access  Private
export const getNoteVersions = async (req, res, next) => {
  try {
    const versions = await NoteVersion.find({ note: req.params.noteId })
      .populate('savedBy', 'fullName email profilePicture')
      .sort({ version: -1 });

    res.status(200).json({
      success: true,
      versions
    });
  } catch (error) {
    next(error);
  }
};
