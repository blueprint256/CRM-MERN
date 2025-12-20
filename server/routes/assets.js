const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Asset = require('../models/Asset');
const Folder = require('../models/Folder');
const { authenticate } = require('../middleware/auth');
const { uploadToS3, deleteFromS3, getKeyFromUrl } = require('../config/s3');
const logger = require('../utils/logger');
const multer = require('multer');
const sharp = require('sharp');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, documents
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

// Helper to generate thumbnail for images
const generateThumbnail = async (buffer, mimeType) => {
  if (!mimeType.startsWith('image/') || mimeType === 'image/svg+xml') {
    return null;
  }

  try {
    const thumbnail = await sharp(buffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return thumbnail;
  } catch (error) {
    logger.warn('Failed to generate thumbnail', { error: error.message });
    return null;
  }
};

// Helper to get image dimensions
const getImageDimensions = async (buffer, mimeType) => {
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  try {
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    return null;
  }
};

// GET /api/assets - Get all assets with filtering and pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      folder,
      campaign,
      labels,
      search,
      status = 'active',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { status };

    // Filter by type
    if (type) query.type = type;

    // Filter by folder
    if (folder) {
      query.folder = folder === 'root' ? null : folder;
    }

    // Filter by campaign
    if (campaign) query.campaigns = campaign;

    // Filter by labels
    if (labels) {
      const labelIds = labels.split(',');
      query.labels = { $in: labelIds };
    }

    // Search
    if (search) {
      query.$text = { $search: search };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .populate('uploadedBy', 'firstName lastName email')
        .populate('labels', 'name color')
        .populate('folder', 'name path')
        .populate('campaigns', 'name color')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Asset.countDocuments(query)
    ]);

    res.json({
      assets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'assets.getAll', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching assets' });
  }
});

// GET /api/assets/stats - Get asset statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await Asset.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    const totalAssets = stats.reduce((sum, s) => sum + s.count, 0);
    const totalSize = stats.reduce((sum, s) => sum + s.totalSize, 0);

    res.json({
      stats: {
        byType: stats,
        totalAssets,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize)
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'assets.stats' });
    res.status(500).json({ error: 'Error fetching asset stats' });
  }
});

// Helper for formatting bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// GET /api/assets/:id - Get single asset
router.get('/:id', authenticate, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName email')
      .populate('labels', 'name color')
      .populate('folder', 'name path')
      .populate('campaigns', 'name color')
      .populate('usedIn', 'title stage');

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json({ asset });
  } catch (error) {
    logger.logError(error, { context: 'assets.getOne', assetId: req.params.id });
    res.status(500).json({ error: 'Error fetching asset' });
  }
});

// POST /api/assets/upload - Upload new asset
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { folderId, campaignId, title, description, labels, tags } = req.body;

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const s3Key = `assets/${req.user._id}/${filename}`;

    // Upload to S3
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));

    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    // Generate and upload thumbnail if image
    let thumbnailKey = null;
    let thumbnailUrl = null;
    const thumbnail = await generateThumbnail(req.file.buffer, req.file.mimetype);
    if (thumbnail) {
      thumbnailKey = `assets/${req.user._id}/thumbnails/${timestamp}-thumb.jpg`;
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: 'image/jpeg'
      }));
      thumbnailUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailKey}`;
    }

    // Get dimensions for images
    const dimensions = await getImageDimensions(req.file.buffer, req.file.mimetype);

    // Create asset record
    const asset = new Asset({
      filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      s3Key,
      s3Url,
      thumbnailKey,
      thumbnailUrl,
      dimensions,
      title: title || req.file.originalname,
      description: description || '',
      folder: folderId || null,
      campaigns: campaignId ? [campaignId] : [],
      labels: labels ? JSON.parse(labels) : [],
      tags: tags ? JSON.parse(tags) : [],
      uploadedBy: req.user._id
    });

    await asset.save();
    await asset.populate([
      { path: 'uploadedBy', select: 'firstName lastName email' },
      { path: 'labels', select: 'name color' },
      { path: 'folder', select: 'name path' }
    ]);

    logger.info('Asset uploaded', { assetId: asset._id, userId: req.user._id, filename });
    res.status(201).json({ asset });
  } catch (error) {
    logger.logError(error, { context: 'assets.upload', userId: req.user._id });
    res.status(500).json({ error: 'Error uploading asset' });
  }
});

// POST /api/assets/upload-multiple - Upload multiple assets
router.post('/upload-multiple', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { folderId, campaignId } = req.body;
    const assets = [];
    const errors = [];

    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    for (const file of req.files) {
      try {
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const s3Key = `assets/${req.user._id}/${filename}`;

        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype
        }));

        const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

        // Generate thumbnail
        let thumbnailKey = null;
        let thumbnailUrl = null;
        const thumbnail = await generateThumbnail(file.buffer, file.mimetype);
        if (thumbnail) {
          thumbnailKey = `assets/${req.user._id}/thumbnails/${timestamp}-thumb.jpg`;
          await s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: thumbnailKey,
            Body: thumbnail,
            ContentType: 'image/jpeg'
          }));
          thumbnailUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailKey}`;
        }

        const dimensions = await getImageDimensions(file.buffer, file.mimetype);

        const asset = new Asset({
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          s3Key,
          s3Url,
          thumbnailKey,
          thumbnailUrl,
          dimensions,
          title: file.originalname,
          folder: folderId || null,
          campaigns: campaignId ? [campaignId] : [],
          uploadedBy: req.user._id
        });

        await asset.save();
        assets.push(asset);
      } catch (err) {
        errors.push({ filename: file.originalname, error: err.message });
      }
    }

    logger.info('Multiple assets uploaded', { count: assets.length, userId: req.user._id });
    res.status(201).json({ assets, errors });
  } catch (error) {
    logger.logError(error, { context: 'assets.uploadMultiple', userId: req.user._id });
    res.status(500).json({ error: 'Error uploading assets' });
  }
});

// PUT /api/assets/:id - Update asset metadata
router.put('/:id', authenticate, [
  body('title').optional().trim().isLength({ max: 200 }),
  body('description').optional().isLength({ max: 1000 }),
  body('alt').optional().isLength({ max: 200 }),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check permission
    if (asset.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'system') {
      return res.status(403).json({ error: 'Not authorized to update this asset' });
    }

    const { title, description, alt, credits, tags, labels, folder } = req.body;

    if (title !== undefined) asset.title = title;
    if (description !== undefined) asset.description = description;
    if (alt !== undefined) asset.alt = alt;
    if (credits !== undefined) asset.credits = credits;
    if (tags !== undefined) asset.tags = tags;
    if (labels !== undefined) asset.labels = labels;
    if (folder !== undefined) asset.folder = folder || null;

    await asset.save();
    await asset.populate([
      { path: 'uploadedBy', select: 'firstName lastName email' },
      { path: 'labels', select: 'name color' },
      { path: 'folder', select: 'name path' }
    ]);

    logger.info('Asset updated', { assetId: asset._id, userId: req.user._id });
    res.json({ asset });
  } catch (error) {
    logger.logError(error, { context: 'assets.update', assetId: req.params.id });
    res.status(500).json({ error: 'Error updating asset' });
  }
});

// POST /api/assets/:id/move - Move asset to folder
router.post('/:id/move', authenticate, [
  body('folderId').optional()
], async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const { folderId } = req.body;

    // Verify folder exists if provided
    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    asset.folder = folderId || null;
    await asset.save();

    logger.info('Asset moved', { assetId: asset._id, folderId, userId: req.user._id });
    res.json({ asset });
  } catch (error) {
    logger.logError(error, { context: 'assets.move', assetId: req.params.id });
    res.status(500).json({ error: 'Error moving asset' });
  }
});

// POST /api/assets/:id/duplicate - Duplicate an asset
router.post('/:id/duplicate', authenticate, async (req, res) => {
  try {
    const original = await Asset.findById(req.params.id);

    if (!original) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Create duplicate with new S3 copy
    const { S3Client, CopyObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const timestamp = Date.now();
    const newS3Key = original.s3Key.replace(/^(.+)(\.[^.]+)$/, `$1-copy-${timestamp}$2`);

    await s3Client.send(new CopyObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      CopySource: `${process.env.AWS_S3_BUCKET}/${original.s3Key}`,
      Key: newS3Key
    }));

    const newS3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${newS3Key}`;

    const duplicate = new Asset({
      ...original.toObject(),
      _id: undefined,
      filename: `copy-${original.filename}`,
      title: `${original.title} (Copy)`,
      s3Key: newS3Key,
      s3Url: newS3Url,
      versions: [],
      currentVersion: 1,
      usedIn: [],
      usageCount: 0,
      uploadedBy: req.user._id,
      createdAt: undefined,
      updatedAt: undefined
    });

    await duplicate.save();

    logger.info('Asset duplicated', { originalId: original._id, duplicateId: duplicate._id });
    res.status(201).json({ asset: duplicate });
  } catch (error) {
    logger.logError(error, { context: 'assets.duplicate', assetId: req.params.id });
    res.status(500).json({ error: 'Error duplicating asset' });
  }
});

// DELETE /api/assets/:id - Soft delete asset
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check permission
    if (asset.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'system') {
      return res.status(403).json({ error: 'Not authorized to delete this asset' });
    }

    // Soft delete
    await asset.softDelete(req.user._id);

    logger.info('Asset deleted (soft)', { assetId: asset._id, userId: req.user._id });
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'assets.delete', assetId: req.params.id });
    res.status(500).json({ error: 'Error deleting asset' });
  }
});

// DELETE /api/assets/:id/permanent - Permanently delete asset and S3 files
router.delete('/:id/permanent', authenticate, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Only system users can permanently delete
    if (req.user.role !== 'system') {
      return res.status(403).json({ error: 'Only system admins can permanently delete assets' });
    }

    // Delete from S3
    const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: asset.s3Key
    }));

    // Delete thumbnail if exists
    if (asset.thumbnailKey) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: asset.thumbnailKey
      })).catch(() => {}); // Ignore thumbnail delete errors
    }

    // Delete from database
    await Asset.findByIdAndDelete(req.params.id);

    logger.info('Asset permanently deleted', { assetId: req.params.id, userId: req.user._id });
    res.json({ message: 'Asset permanently deleted' });
  } catch (error) {
    logger.logError(error, { context: 'assets.permanentDelete', assetId: req.params.id });
    res.status(500).json({ error: 'Error permanently deleting asset' });
  }
});

module.exports = router;
