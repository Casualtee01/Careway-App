const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email address is invalid']
  },
  phone: { type: String, trim: true, maxlength: 32 },
  password: { type: String, required: true, minlength: 10, select: false },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient', immutable: true },
  profileImage: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false }
}, { timestamps: true, toJSON: { virtuals: true, transform: hidePrivateFields } });

function hidePrivateFields(document, result) {
  delete result.password;
  delete result.__v;
  return result;
}

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);