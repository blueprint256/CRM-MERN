const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  campaignName: {
    type: String,
    required: true,
    maxlength: 100
  },
  details: {
    type: String,
    default: ''
  },
  suggestedSlogan: {
    type: String,
    default: ''
  },
  imgDesign: {
    type: String,
    default: ''
  },
  generatedSlogan: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'in progress', 'finished', 'shelf'],
    default: 'pending',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  marketeer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  designer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  startDatetime: {
    type: Date,
    index: true
  },
  endDatetime: {
    type: Date
  },
  googleEventId: {
    type: String
  },
  // Canva integration fields
  canvaDesignId: {
    type: String,
    default: null
  },
  lastCanvaEdit: {
    type: Date,
    default: null
  },
  // Image version history
  imageHistory: [{
    url: String,
    source: {
      type: String,
      enum: ['upload', 'canva'],
      default: 'upload'
    },
    canvaDesignId: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Index for date queries
projectSchema.index({ startDatetime: 1 });
projectSchema.index({ status: 1, client: 1 });

module.exports = mongoose.model('Project', projectSchema);
