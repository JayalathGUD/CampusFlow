import File from '../models/File.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';

// @desc    Get all files in a workspace
// @route   GET /api/files/:workspaceId
// @access  Private (Workspace Member)
export const getWorkspaceFiles = async (req, res, next) => {
  try {
    const files = await File.find({ workspace: req.params.workspaceId })
      .populate('uploadedBy', 'fullName email profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      files
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload file to workspace
// @route   POST /api/files/:workspaceId
// @access  Private (Workspace Member)
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { folder } = req.body;
    const { originalname, size, mimetype, buffer } = req.file;

    let fileUrl = '';

    // Check Cloudinary keys configuration
    const isCloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      !process.env.CLOUDINARY_CLOUD_NAME.includes('your_cloudinary');

    if (isCloudinaryConfigured) {
      try {
        // Upload to Cloudinary using stream uploader since we use memoryStorage
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'auto',
              folder: 'campusflow_assets'
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(buffer);
        });
        fileUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload failed, falling back to local file:', uploadError);
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const uniqueFilename = `${Date.now()}-${originalname}`;
        const filePath = path.join(uploadDir, uniqueFilename);
        await fs.promises.writeFile(filePath, buffer);
        fileUrl = `${req.protocol}://${req.get('host')}/uploads/${uniqueFilename}`;
      }
    } else {
      // Save locally
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const uniqueFilename = `${Date.now()}-${originalname}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      await fs.promises.writeFile(filePath, buffer);
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${uniqueFilename}`;
    }

    const file = await File.create({
      name: originalname,
      url: fileUrl,
      size,
      type: mimetype,
      workspace: req.params.workspaceId,
      uploadedBy: req.user.id,
      folder: folder || '/'
    });

    const populatedFile = await File.findById(file._id).populate('uploadedBy', 'fullName email profilePicture');

    res.status(201).json({
      success: true,
      file: populatedFile
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete file
// @route   DELETE /api/files/detail/:fileId
// @access  Private
export const deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Optional: Delete from Cloudinary if uploader keys are active
    // Delete from database
    await file.deleteOne();

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
