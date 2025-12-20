const mongoose = require('mongoose');

/**
 * Label Model - Gmail-style flexible tagging system
 * Labels can be applied to Content, Assets, and Campaigns
 * Supports both system-defined and user-created labels
 */
const labelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  color: {
    type: String,
    default: '#6c757d', // Bootstrap secondary gray
    match: /^#[0-9A-Fa-f]{6}$/
  },
  description: {
    type: String,
    default: '',
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['system', 'custom'],
    default: 'custom'
  },
  // What this label can be applied to
  appliesTo: [{
    type: String,
    enum: ['content', 'asset', 'campaign'],
    default: ['content', 'asset', 'campaign']
  }],
  // For organization-wide labels vs personal labels
  isGlobal: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index for unique label names per user (or global)
labelSchema.index({ name: 1, createdBy: 1 }, { unique: true });
labelSchema.index({ type: 1 });
labelSchema.index({ isGlobal: 1 });

// Pre-defined system labels (seeded on first run)
labelSchema.statics.getSystemLabels = function() {
  return [
    { name: 'urgent', color: '#dc3545', type: 'system', description: 'High priority items' },
    { name: 'evergreen', color: '#28a745', type: 'system', description: 'Timeless, reusable content' },
    { name: 'seasonal', color: '#fd7e14', type: 'system', description: 'Time-sensitive seasonal content' },
    { name: 'draft', color: '#6c757d', type: 'system', description: 'Work in progress' },
    { name: 'approved', color: '#20c997', type: 'system', description: 'Ready for publishing' },
    { name: 'needs-review', color: '#ffc107', type: 'system', description: 'Awaiting review' },
    { name: 'archived', color: '#6c757d', type: 'system', description: 'No longer active' }
  ];
};

module.exports = mongoose.model('Label', labelSchema);
