const DoctorProfile = require('../models/DoctorProfile');
const RefreshToken = require('../models/RefreshToken');
const Specialty = require('../models/Specialty');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { generateAccessToken, generateRefreshToken, hashToken } = require('../utils/generateToken');

async function registerPatient(input) {
  return User.create({ name: input.name, email: input.email, phone: input.phone, password: input.password, role: 'patient' });
}

async function registerDoctor(input) {
  if (input.specialty && !(await Specialty.exists({ _id: input.specialty, isActive: true }))) {
    throw new ApiError(400, 'Selected specialty is unavailable');
  }

  const user = await User.create({ name: input.name, email: input.email, phone: input.phone, password: input.password, role: 'doctor' });
  try {
    const profile = await DoctorProfile.create({
      user: user._id,
      specialty: input.specialty,
      qualifications: input.qualifications,
      experienceYears: input.experienceYears,
      clinicName: input.clinicName,
      clinicAddress: input.clinicAddress,
      consultationFee: input.consultationFee,
      timezone: input.timezone || 'UTC',
      approvalStatus: 'pending'
    });
    return { user, profile };
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }
}

async function createSession(user, metadata = {}) {
  const refresh = generateRefreshToken();
  await RefreshToken.create({
    user: user._id,
    tokenHash: refresh.tokenHash,
    expiresAt: refresh.expiresAt,
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress
  });
  return { accessToken: generateAccessToken(user), refreshToken: refresh.token, user };
}

async function login(email, password, metadata) {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  return createSession(user, metadata);
}

async function rotateRefreshToken(rawToken, metadata = {}) {
  if (!rawToken) throw new ApiError(401, 'Refresh session is invalid or expired');
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) });
  if (!stored) throw new ApiError(401, 'Refresh session is invalid or expired');
  if (stored.revokedAt) {
    await RefreshToken.updateMany({ user: stored.user, revokedAt: null }, { revokedAt: new Date() });
    throw new ApiError(401, 'Refresh session reuse detected; sign in again');
  }
  if (stored.expiresAt <= new Date()) {
    await RefreshToken.updateOne({ _id: stored._id, revokedAt: null }, { revokedAt: new Date() });
    throw new ApiError(401, 'Refresh session is invalid or expired');
  }

  const user = await User.findById(stored.user);
  if (!user || !user.isActive) {
    await RefreshToken.updateMany({ user: stored.user, revokedAt: null }, { revokedAt: new Date() });
    throw new ApiError(401, 'Invalid or inactive account');
  }

  const refresh = generateRefreshToken();
  const nextSession = await RefreshToken.create({ user: user._id, tokenHash: refresh.tokenHash, expiresAt: refresh.expiresAt, userAgent: metadata.userAgent, ipAddress: metadata.ipAddress });
  const consumed = await RefreshToken.updateOne(
    { _id: stored._id, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date(), replacedByHash: refresh.tokenHash } }
  );
  if (!consumed.modifiedCount) {
    await nextSession.deleteOne();
    await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
    throw new ApiError(401, 'Refresh session reuse detected; sign in again');
  }

  return { accessToken: generateAccessToken(user), refreshToken: refresh.token, user };
}

async function logout(rawToken) {
  if (rawToken) await RefreshToken.updateOne({ tokenHash: hashToken(rawToken), revokedAt: null }, { revokedAt: new Date() });
}

module.exports = { registerPatient, registerDoctor, login, rotateRefreshToken, logout, createSession };