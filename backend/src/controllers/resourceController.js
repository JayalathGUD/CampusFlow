import Resource from '../models/Resource.js';
import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinary.js';

// @desc    Get all study resources (filtered by search term, category, subject)
// @route   GET /api/resources
// @access  Private
export const getResources = async (req, res, next) => {
  try {
    const { category, subject, q } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    // Only show approved resources (or own pending uploads) to general students
    if (!req.user) {
      query.isApproved = true;
    } else if (req.user.role !== 'admin') {
      const approvalFilter = {
        $or: [
          { isApproved: true },
          { uploadedBy: req.user.id }
        ]
      };

      if (query.$or) {
        // If we already have $or (from search query q), wrap in $and to prevent overwriting
        query.$and = [
          { $or: query.$or },
          approvalFilter
        ];
        delete query.$or;
      } else {
        query.$or = approvalFilter.$or;
      }
    }

    const resources = await Resource.find(query)
      .populate('uploadedBy', 'fullName email profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      resources
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload study resource
// @route   POST /api/resources
// @access  Private
export const uploadResource = async (req, res, next) => {
  try {
    const { title, category, subject, tags } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ message: 'Title and subject are required' });
    }

    let fileUrl = 'https://res.cloudinary.com/demo/image/upload/v1570975853/sample.jpg';
    let fileType = 'image/jpeg';

    if (req.file) {
      fileType = req.file.mimetype;
      const { originalname, buffer } = req.file;

      const isCloudinaryConfigured =
        process.env.CLOUDINARY_CLOUD_NAME &&
        !process.env.CLOUDINARY_CLOUD_NAME.includes('your_cloudinary');

      if (isCloudinaryConfigured) {
        try {
          // Upload to Cloudinary using stream uploader
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: 'auto',
                folder: 'campusflow_resources'
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
          // Fallback to local storage
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
    }

    const tagsArray = tags 
      ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()))
      : [];

    // Admins' uploads are approved by default, others start as pending approval (false)
    const isApproved = req.user.role === 'admin';

    const resource = await Resource.create({
      title,
      category: category || 'other',
      subject,
      fileUrl,
      fileType,
      uploadedBy: req.user.id,
      tags: tagsArray,
      isApproved
    });

    const populatedResource = await Resource.findById(resource._id)
      .populate('uploadedBy', 'fullName email profilePicture');

    res.status(201).json({
      success: true,
      resource: populatedResource
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a study resource
// @route   PUT /api/resources/:resourceId/approve
// @access  Private (Admin Only)
export const approveResource = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to approve resources' });
    }

    const resource = await Resource.findById(req.params.resourceId);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    resource.isApproved = true;
    await resource.save();

    res.status(200).json({
      success: true,
      message: 'Resource approved successfully',
      resource
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete study resource
// @route   DELETE /api/resources/:resourceId
// @access  Private
export const deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.resourceId);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (resource.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this resource' });
    }

    await resource.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Increment download count
// @route   PUT /api/resources/:resourceId/download
// @access  Private
export const incrementDownloads = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.resourceId);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    resource.downloadsCount += 1;
    await resource.save();

    res.status(200).json({
      success: true,
      downloadsCount: resource.downloadsCount
    });
  } catch (error) {
    next(error);
  }
};
