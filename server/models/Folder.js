const mongoose = require('mongoose');

/**
 * Folder Model - Hierarchical organization for assets
 * Supports nested folders with full path tracking
 */
const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  color: {
    type: String,
    default: '#6c757d',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  icon: {
    type: String,
    default: 'folder' // Bootstrap icon name
  },
  // Parent folder for nesting
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true
  },
  // Full path for efficient querying (e.g., "/campaigns/summer-2025/images")
  path: {
    type: String,
    default: '/',
    index: true
  },
  // Depth level (0 = root)
  depth: {
    type: Number,
    default: 0
  },
  // Folder type for special handling
  type: {
    type: String,
    enum: ['general', 'campaign', 'template', 'archive', 'trash'],
    default: 'general'
  },
  // Associated campaign (optional)
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null
  },
  // Access control
  isPublic: {
    type: Boolean,
    default: false
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
folderSchema.index({ parent: 1, name: 1 });
folderSchema.index({ path: 'text' });
folderSchema.index({ createdBy: 1 });

// Pre-save hook to update path
folderSchema.pre('save', async function(next) {
  if (this.isModified('parent') || this.isModified('name')) {
    if (this.parent) {
      const parentFolder = await this.constructor.findById(this.parent);
      if (parentFolder) {
        this.path = `${parentFolder.path}${parentFolder.name}/`;
        this.depth = parentFolder.depth + 1;
      }
    } else {
      this.path = '/';
      this.depth = 0;
    }
  }
  next();
});

// Virtual for full path including this folder's name
folderSchema.virtual('fullPath').get(function() {
  return `${this.path}${this.name}`;
});

// Get all children (recursive)
folderSchema.methods.getChildren = async function() {
  return this.constructor.find({
    path: { $regex: `^${this.fullPath}/` }
  }).sort({ path: 1 });
};

// Get direct children only
folderSchema.methods.getDirectChildren = async function() {
  return this.constructor.find({ parent: this._id }).sort({ name: 1 });
};

// Get breadcrumb trail
folderSchema.methods.getBreadcrumbs = async function() {
  const parts = this.path.split('/').filter(p => p);
  const breadcrumbs = [];

  let currentPath = '/';
  for (const part of parts) {
    currentPath += part + '/';
    const folder = await this.constructor.findOne({ path: currentPath.slice(0, -part.length - 1) || '/', name: part });
    if (folder) {
      breadcrumbs.push({ _id: folder._id, name: folder.name, path: folder.fullPath });
    }
  }

  breadcrumbs.push({ _id: this._id, name: this.name, path: this.fullPath });
  return breadcrumbs;
};

folderSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Folder', folderSchema);
