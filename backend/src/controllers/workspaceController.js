import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import User from '../models/User.js';

// Helper to generate a random 8-character invite code
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// @desc    Create a new workspace
// @route   POST /api/workspaces
// @access  Private
export const createWorkspace = async (req, res, next) => {
  try {
    const { name, description, semester, department } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Please add a workspace name' });
    }

    const inviteCode = generateInviteCode();

    const workspace = await Workspace.create({
      name,
      description,
      semester: semester || 'Semester 1',
      department: department || 'Software Engineering',
      owner: req.user.id,
      inviteCode
    });

    // Add owner as a member with the 'owner' role
    await WorkspaceMember.create({
      workspace: workspace._id,
      user: req.user.id,
      role: 'owner'
    });

    res.status(201).json({
      success: true,
      workspace
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join workspace via invite code
// @route   POST /api/workspaces/join
// @access  Private
export const joinWorkspace = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ message: 'Please provide an invite code' });
    }

    const workspace = await Workspace.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found with this invite code' });
    }

    // Check if already a member
    const isMember = await WorkspaceMember.findOne({
      workspace: workspace._id,
      user: req.user.id
    });

    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this workspace' });
    }

    // Add user as a standard member
    const membership = await WorkspaceMember.create({
      workspace: workspace._id,
      user: req.user.id,
      role: 'member'
    });

    res.status(200).json({
      success: true,
      message: `Successfully joined ${workspace.name}`,
      workspace
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all workspaces the current user belongs to
// @route   GET /api/workspaces
// @access  Private
export const getMyWorkspaces = async (req, res, next) => {
  try {
    const memberships = await WorkspaceMember.find({ user: req.user.id })
      .populate({
        path: 'workspace',
        populate: {
          path: 'owner',
          select: 'fullName email profilePicture'
        }
      });

    const workspaces = memberships.map(m => m.workspace).filter(w => w !== null);

    res.status(200).json({
      success: true,
      workspaces
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get workspace members list
// @route   GET /api/workspaces/:workspaceId/members
// @access  Private (Workspace Member Only)
export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const members = await WorkspaceMember.find({ workspace: req.params.workspaceId })
      .populate('user', 'fullName email profilePicture bio university degreeProgram');

    res.status(200).json({
      success: true,
      members
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update workspace member role
// @route   PUT /api/workspaces/:workspaceId/members/:memberId
// @access  Private (Owner/Admin Only)
export const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { workspaceId, memberId } = req.params;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Verify the caller has authorization (is Owner or Admin)
    const callerMembership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: req.user.id
    });

    if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
      return res.status(403).json({ message: 'Not authorized to update roles in this workspace' });
    }

    // Update target member's role (cannot change Owner role this way)
    const targetMembership = await WorkspaceMember.findById(memberId);
    if (!targetMembership) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (targetMembership.role === 'owner') {
      return res.status(400).json({ message: 'Cannot modify the owner\'s role' });
    }

    targetMembership.role = role;
    await targetMembership.save();

    res.status(200).json({
      success: true,
      membership: targetMembership
    });
  } catch (error) {
    next(error);
  }
};
