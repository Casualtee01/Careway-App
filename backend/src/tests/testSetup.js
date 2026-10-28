process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_access_secret_0123456789_abcdefghij';
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_0123456789_abcdef';
process.env.COOKIE_SECRET = 'test_cookie_secret_0123456789_abcdefghij';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.CLIENT_URL = 'http://localhost:5173';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Specialty = require('../models/Specialty');

async function setupTestDatabase() {
  const uriFile = path.join(__dirname, '.mongo-test-uri');
  const uri = process.env.TEST_MONGODB_URI || JSON.parse(fs.readFileSync(uriFile, 'utf8')).uri;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}

async function clearTestDatabase() {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
}

async function closeTestDatabase() {
  await mongoose.disconnect();
}

async function createAccount({ role = 'patient', name = 'Test User', email, password = 'StrongPassword123!', isActive = true, approvalStatus = 'approved', availability } = {}) {
  const uniqueEmail = email || `${role}-${Math.random().toString(36).slice(2)}@example.test`;
  const user = await User.create({ name, email: uniqueEmail, password, role, isActive });
  if (role !== 'doctor') return user;

  const specialty = await Specialty.findOneAndUpdate(
    { name: 'Test Specialty' },
    { $setOnInsert: { name: 'Test Specialty' } },
    { upsert: true, new: true }
  );
  await DoctorProfile.create({
    user: user._id,
    specialty: specialty._id,
    approvalStatus,
    timezone: 'UTC',
    availability: availability || {
      weeklySchedule: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: '00:00', endTime: '23:59', breaks: [] })),
      appointmentDurationMinutes: 30,
      unavailableDates: [],
      exceptions: []
    }
  });
  return user;
}

async function accessToken(email, password = 'StrongPassword123!') {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (response.status !== 200) throw new Error(`Test login failed for ${email}: ${response.body.message}`);
  return response.body.data.accessToken;
}

module.exports = { app, request, mongoose, User, DoctorProfile, setupTestDatabase, clearTestDatabase, closeTestDatabase, createAccount, accessToken };