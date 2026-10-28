const mongoose = require('mongoose');

const specialtySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 1000 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

specialtySchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Specialty', specialtySchema);