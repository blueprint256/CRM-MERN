const express = require('express');
const { body, validationResult } = require('express-validator');
const Folder = require('../models/Folder');
const Asset = require('../models/Asset');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/folders - Get all folders (tree structure)
router.get('/', authenticate, async (req, res) => {
  try {
    const { flat, parentId } = req.query;

    let query = {};

    if (parentId) {
      query.parent = parentId === 'root' ? null : parentId;
    }

    const folders = await Folder.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('campaign', 'name')
      .sort({ path: 1, name: 1 });

    if (flat === 'true') {
      return res.json({ folders });
    }

    // Build tree structure
    const buildTree = (folders, parentId = null) => {
      return folders
        .filter(f => {
          const fParent = f.parent ? f.parent.toString() : null;
          return fParent === parentId;
        })
        .map(folder => ({
          ...folder.toObject(),
          children: buildTree(folders, folder._id.toString())
        }));
    };

    const tree = buildTree(folders);
    res.json({ folders: tree });
  } catch (error) {
    logger.logError(error, { context: 'folders.getAll', userId: req.user._id });
    res.status(500).json({ error: 'Error fetching folders' });
  }
});

// GET /api/folders/:id - Get single folder with contents
router.get('/:id', authenticate, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('parent', 'name path')
      .populate('campaign', 'name color');

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Get breadcrumbs
    const breadcrumbs = await folder.getBreadcrumbs();

    // Get subfolders
    const subfolders = await Folder.find({ parent: folder._id })
      .sort({ name: 1 });

    // Get assets in this folder (with pagination)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const [assets, totalAssets] = await Promise.all([
      Asset.find({ folder: folder._id, status: 'active' })
        .populate('uploadedBy', 'firstName lastName')
        .populate('labels', 'name color')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Asset.countDocuments({ folder: folder._id, status: 'active' })
    ]);

    res.json({
      folder,
      breadcrumbs,
      subfolders,
      assets,
      pagination: {
        page,
        limit,
        total: totalAssets,
        pages: Math.ceil(totalAssets / limit)
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'folders.getOne', folderId: req.params.id });
    res.status(500).json({ error: 'Error fetching folder' });
  }
});

// POST /api/folders - Create new folder
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Folder name is required').isLength({ max: 100 }),
  body('parentId').optional(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, parentId, color, description, type, campaignId } = req.body;

    // Check for duplicate name in same parent
    const existing = await Folder.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      parent: parentId || null
    });

    if (existing) {
      return res.status(400).json({ error: 'A folder with this name already exists in this location' });
    }

    // Validate parent exists
    if (parentId) {
      const parent = await Folder.findById(parentId);
      if (!parent) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
    }

    const folder = new Folder({
      name,
      parent: parentId || null,
      color: color || '#6c757d',
      description: description || '',
      type: type || 'general',
      campaign: campaignId || null,
      createdBy: req.user._id
    });

    await folder.save();
    await folder.populate([
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'parent', select: 'name path' }
    ]);

    logger.info('Folder created', { folderId: folder._id, userId: req.user._id });
    res.status(201).json({ folder });
  } catch (error) {
    logger.logError(error, { context: 'folders.create', userId: req.user._id });
    res.status(500).json({ error: 'Error creating folder' });
  }
});

// PUT /api/folders/:id - Update folder
router.put('/:id', authenticate, [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check permission
    if (folder.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'system') {
      return res.status(403).json({ error: 'Not authorized to update this folder' });
    }

    const { name, color, description, icon } = req.body;

    if (name !== undefined) folder.name = name;
    if (color !== undefined) folder.color = color;
    if (description !== undefined) folder.description = description;
    if (icon !== undefined) folder.icon = icon;

    await folder.save();
    await folder.populate([
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'parent', select: 'name path' }
    ]);

    logger.info('Folder updated', { folderId: folder._id, userId: req.user._id });
    res.json({ folder });
  } catch (error) {
    logger.logError(error, { context: 'folders.update', folderId: req.params.id });
    res.status(500).json({ error: 'Error updating folder' });
  }
});

// POST /api/folders/:id/move - Move folder to new parent
router.post('/:id/move', authenticate, [
  body('parentId').optional()
], async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const { parentId } = req.body;

    // Cannot move to self or descendant
    if (parentId === folder._id.toString()) {
      return res.status(400).json({ error: 'Cannot move folder into itself' });
    }

    if (parentId) {
      const newParent = await Folder.findById(parentId);
      if (!newParent) {
        return res.status(404).json({ error: 'Target folder not found' });
      }

      // Check if new parent is a descendant of this folder
      const children = await folder.getChildren();
      if (children.some(c => c._id.toString() === parentId)) {
        return res.status(400).json({ error: 'Cannot move folder into its own subfolder' });
      }
    }

    folder.parent = parentId || null;
    await folder.save();

    // Update all children's paths
    const children = await folder.getChildren();
    for (const child of children) {
      await child.save(); // Triggers pre-save hook to update path
    }

    logger.info('Folder moved', { folderId: folder._id, newParentId: parentId });
    res.json({ folder });
  } catch (error) {
    logger.logError(error, { context: 'folders.move', folderId: req.params.id });
    res.status(500).json({ error: 'Error moving folder' });
  }
});

// DELETE /api/folders/:id - Delete folder
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check permission
    if (folder.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'system') {
      return res.status(403).json({ error: 'Not authorized to delete this folder' });
    }

    const { moveContentsTo } = req.query;

    // Get all children folders
    const children = await folder.getChildren();

    // Get all assets in this folder and subfolders
    const folderIds = [folder._id, ...children.map(c => c._id)];
    const assets = await Asset.find({ folder: { $in: folderIds } });

    if (moveContentsTo) {
      // Move all contents to specified folder
      const targetFolder = moveContentsTo === 'root' ? null : moveContentsTo;

      await Asset.updateMany(
        { folder: { $in: folderIds } },
        { folder: targetFolder }
      );

      // Move subfolders to target
      await Folder.updateMany(
        { parent: folder._id },
        { parent: targetFolder }
      );
    } else if (assets.length > 0 || children.length > 0) {
      return res.status(400).json({
        error: 'Folder is not empty',
        assetsCount: assets.length,
        subfoldersCount: children.length,
        hint: 'Use ?moveContentsTo=root or ?moveContentsTo=<folderId> to move contents before deleting'
      });
    }

    // Delete the folder
    await Folder.findByIdAndDelete(req.params.id);

    logger.info('Folder deleted', { folderId: req.params.id, userId: req.user._id });
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'folders.delete', folderId: req.params.id });
    res.status(500).json({ error: 'Error deleting folder' });
  }
});

module.exports = router;
