import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import WorkspaceMember from '../models/WorkspaceMember.js';

// Protect routes - Verify JWT Token
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ message: 'User not found with this token' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }
};

// Optional protect - If token is provided, verify it and attach user. Otherwise proceed as guest.
export const optionalProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = await User.findById(decoded.id) || undefined;
    next();
  } catch (err) {
    next();
  }
};

// Grant access to specific roles (e.g., admin)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user?.role || 'none'}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Verify user belongs to the requested workspace
export const verifyWorkspaceAccess = async (req, res, next) => {
  const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;

  if (!workspaceId) {
    return res.status(400).json({ message: 'Workspace ID is required' });
  }

  try {
    const membership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: req.user.id
    });

    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this workspace' });
    }

    req.workspaceMember = membership; // Save role/membership info for controller usage
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error verifying workspace access' });
  }
};
