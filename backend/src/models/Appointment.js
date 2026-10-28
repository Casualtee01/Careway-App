const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  appointmentType: { type: String, enum: ['in_person', 'online'], required: true },
  reason: { type: String, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'accepted', 'cancelled', 'completed'], default: 'pending' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 48 * 60 * 60 * 1000) },
  cancellationReason: { type: String, trim: true, maxlength: 1000 },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  acceptedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

appointmentSchema.pre('validate', function validateAppointmentInterval() {
  if (this.startAt && this.endAt && this.endAt <= this.startAt) {
    this.invalidate('endAt', 'Appointment end time must be after its start time');
  }
});

appointmentSchema.index({ patient: 1, startAt: -1 });
appointmentSchema.index({ doctor: 1, status: 1, startAt: 1, endAt: 1 });
appointmentSchema.index({ status: 1, startAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);