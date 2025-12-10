const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Prompt', promptSchema);
