const mongoose = require('mongoose');

const bookingLockSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId },
  owner: { type: String },
  leaseUntil: { type: Date }
}, { versionKey: false });

module.exports = mongoose.model('BookingLock', bookingLockSchema);