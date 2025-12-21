const mongoose = require('mongoose');

/**
 * Asset Model - Digital Asset Management (DAM)
 * Central repository for all marketing assets (images, videos, documents)
 * Supports versioning, metadata, and usage tracking
 */
const assetSchema = new mongoose.Schema({
  // === WORKSPACE REFERENCE (Required) ===
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },

  // File information
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true // in bytes
  },

  // S3 Storage
  s3Key: {
    type: String,
    required: true,
    unique: true
  },
  s3Url: {
    type: String,
    required: true
  },
  thumbnailKey: {
    type: String,
    default: null
  },
  thumbnailUrl: {
    type: String,
    default: null
  },

  // Asset type classification
  type: {
    type: String,
    enum: ['image', 'video', 'document', 'audio', 'other'],
    required: true,
    index: true
  },

  // Media-specific metadata
  dimensions: {
    width: { type: Number, default: null },
    height: { type: Number, default: null }
  },
  duration: {
    type: Number, // in seconds, for video/audio
    default: null
  },
  format: {
    type: String, // jpg, png, mp4, pdf, etc.
    default: null
  },

  // Descriptive metadata
  title: {
    type: String,
    default: '',
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    default: '',
    maxlength: 1000
  },
  alt: {
    type: String, // Alt text for accessibility
    default: '',
    maxlength: 200
  },
  credits: {
    type: String, // Photo credits, attribution
    default: ''
  },

  // Organization - Gmail-style labels
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],

  // Folder organization
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true
  },

  // Campaign association
  campaigns: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  }],

  // Tags for search (simple strings, separate from Labels)
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Version history
  versions: [{
    s3Key: { type: String, required: true },
    s3Url: { type: String, required: true },
    size: { type: Number },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' }
  }],
  currentVersion: {
    type: Number,
    default: 1
  },

  // Usage tracking - which content items use this asset
  usedIn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }],
  usageCount: {
    type: Number,
    default: 0
  },

  // Canva integration
  canvaDesignId: {
    type: String,
    default: null
  },
  canvaEditUrl: {
    type: String,
    default: null
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },

  // Source tracking
  source: {
    type: String,
    enum: ['upload', 'canva', 'import', 'ai-generated', 'external'],
    default: 'upload'
  },
  sourceUrl: {
    type: String, // Original URL if imported
    default: null
  },

  // Ownership
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
assetSchema.index({ type: 1, status: 1 });
assetSchema.index({ uploadedBy: 1, createdAt: -1 });
assetSchema.index({ folder: 1, status: 1 });
assetSchema.index({ tags: 1 });
assetSchema.index({ 'campaigns': 1 });
assetSchema.index({ title: 'text', description: 'text', originalName: 'text', tags: 'text' });

// Pre-save: determine asset type from mimeType
assetSchema.pre('save', function(next) {
  if (this.isModified('mimeType')) {
    if (this.mimeType.startsWith('image/')) {
      this.type = 'image';
    } else if (this.mimeType.startsWith('video/')) {
      this.type = 'video';
    } else if (this.mimeType.startsWith('audio/')) {
      this.type = 'audio';
    } else if (
      this.mimeType === 'application/pdf' ||
      this.mimeType.includes('document') ||
      this.mimeType.includes('text/')
    ) {
      this.type = 'document';
    } else {
      this.type = 'other';
    }

    // Extract format from mimeType
    const parts = this.mimeType.split('/');
    if (parts.length > 1) {
      this.format = parts[1].split(';')[0];
    }
  }
  next();
});

// Virtual for human-readable file size
assetSchema.virtual('sizeFormatted').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for aspect ratio
assetSchema.virtual('aspectRatio').get(function() {
  if (this.dimensions?.width && this.dimensions?.height) {
    return (this.dimensions.width / this.dimensions.height).toFixed(2);
  }
  return null;
});

// Method to add a new version
assetSchema.methods.addVersion = async function(newS3Key, newS3Url, newSize, userId, note = '') {
  // Save current version to history
  this.versions.push({
    s3Key: this.s3Key,
    s3Url: this.s3Url,
    size: this.size,
    createdAt: this.updatedAt,
    createdBy: userId,
    note
  });

  // Update to new version
  this.s3Key = newS3Key;
  this.s3Url = newS3Url;
  this.size = newSize;
  this.currentVersion += 1;

  // Keep only last 10 versions
  if (this.versions.length > 10) {
    this.versions = this.versions.slice(-10);
  }

  return this.save();
};

// Method to restore a previous version
assetSchema.methods.restoreVersion = async function(versionIndex, userId) {
  const version = this.versions[versionIndex];
  if (!version) throw new Error('Version not found');

  return this.addVersion(version.s3Key, version.s3Url, version.size, userId, 'Restored from version');
};

// Static method to get assets by folder with pagination
assetSchema.statics.getByFolder = async function(folderId, options = {}) {
  const { page = 1, limit = 20, type, status = 'active' } = options;
  const query = { folder: folderId, status };
  if (type) query.type = type;

  const [assets, total] = await Promise.all([
    this.find(query)
      .populate('uploadedBy', 'firstName lastName email')
      .populate('labels', 'name color')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    this.countDocuments(query)
  ]);

  return { assets, total, page, totalPages: Math.ceil(total / limit) };
};

// Soft delete
assetSchema.methods.softDelete = async function(userId) {
  this.status = 'deleted';
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

assetSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Asset', assetSchema);
