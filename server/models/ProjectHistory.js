const mongoose = require('mongoose');

const projectHistorySchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['created', 'updated', 'status_changed', 'deleted', 'assigned']
  },
  fieldName: {
    type: String
  },
  oldValue: {
    type: String
  },
  newValue: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient history queries
projectHistorySchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('ProjectHistory', projectHistorySchema);
