require('dotenv').config();

const { DateTime } = require('luxon');
const mongoose = require('mongoose');
const connectDatabase = require('../src/config/db');
const User = require('../src/models/User');
const Specialty = require('../src/models/Specialty');
const DoctorProfile = require('../src/models/DoctorProfile');
const Appointment = require('../src/models/Appointment');

async function findOrCreateUser(details) {
  let user = await User.findOne({ email: details.email });
  if (user) {
    if (user.role !== details.role) throw new Error(`Seed email ${details.email} is already assigned another role`);
    return user;
  }
  user = await User.create(details);
  return user;
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('The seed script cannot run in production');
  if (!process.env.SEED_PASSWORD || process.env.SEED_PASSWORD.length < 10) {
    throw new Error('Set SEED_PASSWORD to a password of at least 10 characters');
  }

  await connectDatabase();
  const specialtyNames = ['Cardiology', 'Dermatology', 'Family Medicine'];
  const specialties = await Promise.all(specialtyNames.map((name) => Specialty.findOneAndUpdate(
    { name },
    { $setOnInsert: { name, description: `${name} services` } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));

  const patient = await findOrCreateUser({
    name: 'Sample Patient', email: 'patient@example.test', password: process.env.SEED_PASSWORD, role: 'patient'
  });
  const doctors = await Promise.all([
    findOrCreateUser({ name: 'Sample Doctor One', email: 'doctor.one@example.test', password: process.env.SEED_PASSWORD, role: 'doctor' }),
    findOrCreateUser({ name: 'Sample Doctor Two', email: 'doctor.two@example.test', password: process.env.SEED_PASSWORD, role: 'doctor' })
  ]);

  const weeklySchedule = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: '00:00', endTime: '23:59', breaks: [] }));
  for (let index = 0; index < doctors.length; index += 1) {
    await DoctorProfile.findOneAndUpdate(
      { user: doctors[index]._id },
      { $setOnInsert: {
        user: doctors[index]._id,
        specialty: specialties[index],
        qualifications: ['MD'],
        experienceYears: 5 + index,
        clinicName: `Sample Clinic ${index + 1}`,
        clinicAddress: 'Development sample address',
        consultationFee: 100 + index * 25,
        approvalStatus: index === 0 ? 'approved' : 'pending',
        timezone: 'UTC',
        availability: { weeklySchedule, appointmentDurationMinutes: 30, unavailableDates: [], exceptions: [] }
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const startAt = DateTime.utc().plus({ days: 3 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 }).toJSDate();
  for (const doctor of doctors.slice(0, 1)) {
    await Appointment.updateOne(
      { patient: patient._id, doctor: doctor._id, startAt },
      { $setOnInsert: {
        patient: patient._id,
        doctor: doctor._id,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
        appointmentType: 'online',
        reason: 'Development sample appointment',
        status: 'pending'
      } },
      { upsert: true }
    );
  }

  console.log('Development seed data is ready. No administrator account was created.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });