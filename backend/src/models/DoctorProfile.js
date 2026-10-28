const mongoose = require('mongoose');

const intervalSchema = new mongoose.Schema({
  startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }
}, { _id: false });

const availabilitySchema = new mongoose.Schema({
  weeklySchedule: [{
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    breaks: { type: [intervalSchema], default: [] }
  }],
  unavailableDates: { type: [String], default: [] },
  exceptions: [{
    date: { type: String, required: true },
    isUnavailable: { type: Boolean, default: false },
    intervals: { type: [intervalSchema], default: [] }
  }],
  appointmentDurationMinutes: { type: Number, min: 10, max: 240, default: 30 }
}, { _id: false });

const doctorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specialty: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialty' },
  qualifications: { type: [String], default: [] },
  experienceYears: { type: Number, min: 0, max: 80, default: 0 },
  bio: { type: String, trim: true, maxlength: 3000 },
  clinicName: { type: String, trim: true, maxlength: 160 },
  clinicAddress: { type: String, trim: true, maxlength: 500 },
  consultationFee: { type: Number, min: 0, default: 0 },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  timezone: {
    type: String,
    default: 'UTC',
    validate: {
      validator(value) {
        try {
          new Intl.DateTimeFormat('en-US', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      },
      message: 'Timezone must be a valid IANA timezone'
    }
  },
  availability: { type: availabilitySchema, default: () => ({}) }
}, { timestamps: true });

doctorProfileSchema.index({ approvalStatus: 1, specialty: 1, consultationFee: 1 });
doctorProfileSchema.index({ clinicName: 'text', clinicAddress: 'text' });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);