const { DateTime } = require('luxon');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { withDoctorBookingLock } = require('./bookingLock');

function localDateTime(date, time, zone) {
  const value = DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm', { zone, setZone: true });
  if (!value.isValid) throw new ApiError(400, 'Invalid date, time, or timezone');
  return value;
}

function getScheduleForDate(profile, date) {
  const zone = profile.timezone;
  if (!DateTime.fromISO(date, { zone }).isValid || DateTime.fromISO(date, { zone }).toISODate() !== date) {
    throw new ApiError(400, 'Date must be a valid YYYY-MM-DD value');
  }

  const availability = profile.availability;
  if (availability.unavailableDates.includes(date)) return [];
  const exception = availability.exceptions.find((entry) => entry.date === date);
  if (exception?.isUnavailable) return [];
  if (exception) return exception.intervals;

  const dayOfWeek = DateTime.fromISO(date, { zone }).weekday % 7;
  return availability.weeklySchedule.filter((entry) => entry.dayOfWeek === dayOfWeek);
}

function generateSlots(profile, date) {
  const zone = profile.timezone;
  const durationMinutes = profile.availability.appointmentDurationMinutes;
  const windows = getScheduleForDate(profile, date);
  const slots = [];

  for (const window of windows) {
    const opening = localDateTime(date, window.startTime, zone);
    const closing = localDateTime(date, window.endTime, zone);
    if (closing <= opening) continue;

    for (let cursor = opening; cursor.plus({ minutes: durationMinutes }) <= closing; cursor = cursor.plus({ minutes: durationMinutes })) {
      const end = cursor.plus({ minutes: durationMinutes });
      const overlapsBreak = (window.breaks || []).some((pause) => {
        const breakStart = localDateTime(date, pause.startTime, zone);
        const breakEnd = localDateTime(date, pause.endTime, zone);
        return cursor < breakEnd && end > breakStart;
      });
      if (!overlapsBreak && cursor.toUTC() > DateTime.utc()) {
        slots.push({ startAt: cursor.toUTC().toJSDate(), endAt: end.toUTC().toJSDate() });
      }
    }
  }
  return slots.sort((left, right) => left.startAt - right.startAt);
}

async function listAvailableSlots(doctorId, date) {
  if (!(await User.exists({ _id: doctorId, role: 'doctor', isActive: true }))) throw new ApiError(404, 'Doctor not found');
  const profile = await DoctorProfile.findOne({ user: doctorId, approvalStatus: 'approved' });
  if (!profile) throw new ApiError(404, 'Doctor not found');
  const slots = generateSlots(profile, date);
  if (!slots.length) return [];

  const conflicts = await Appointment.find({
    doctor: doctorId,
    $or: [{ status: 'accepted' }, { status: 'pending', expiresAt: { $gt: new Date() } }],
    startAt: { $lt: slots[slots.length - 1].endAt },
    endAt: { $gt: slots[0].startAt }
  }).select('startAt endAt');

  return slots.filter((slot) => !conflicts.some((conflict) => slot.startAt < conflict.endAt && slot.endAt > conflict.startAt));
}

async function updateAvailability(doctorId, input) {
  if (!DateTime.now().setZone(input.timezone).isValid) throw new ApiError(400, 'Timezone must be a valid IANA timezone');
  const days = input.weeklySchedule.map((entry) => entry.dayOfWeek);
  if (new Set(days).size !== days.length) throw new ApiError(422, 'Availability can only contain one schedule per weekday');
  for (const entry of input.weeklySchedule) {
    if (entry.startTime >= entry.endTime) throw new ApiError(422, 'Each work period must end after it starts');
    for (const pause of entry.breaks || []) {
      if (pause.startTime >= pause.endTime || pause.startTime < entry.startTime || pause.endTime > entry.endTime) {
        throw new ApiError(422, 'Breaks must fit within working hours');
      }
    }
  }

  return withDoctorBookingLock(doctorId, async () => {
    const profile = await DoctorProfile.findOne({ user: doctorId });
    if (!profile) throw new ApiError(404, 'Doctor profile not found');
    const candidate = { ...input, exceptions: input.exceptions || [], unavailableDates: input.unavailableDates || [] };
    const appointments = await Appointment.find({
      doctor: doctorId,
      $or: [{ status: 'accepted' }, { status: 'pending', expiresAt: { $gt: new Date() } }],
      startAt: { $gt: new Date() }
    });

    for (const appointment of appointments) {
      const localStart = DateTime.fromJSDate(appointment.startAt, { zone: input.timezone });
      const localEnd = DateTime.fromJSDate(appointment.endAt, { zone: input.timezone });
      const date = localStart.toISODate();
      if (candidate.unavailableDates.includes(date)) throw new ApiError(409, 'Availability conflicts with an accepted appointment');
      const exception = candidate.exceptions.find((entry) => entry.date === date);
      const windows = exception ? (exception.isUnavailable ? [] : exception.intervals) : candidate.weeklySchedule.filter((entry) => entry.dayOfWeek === localStart.weekday % 7);
      const fits = windows.some((window) => {
        const start = localDateTime(date, window.startTime, input.timezone);
        const end = localDateTime(date, window.endTime, input.timezone);
        const blocked = (window.breaks || []).some((pause) => localStart < localDateTime(date, pause.endTime, input.timezone) && localEnd > localDateTime(date, pause.startTime, input.timezone));
        return localStart >= start && localEnd <= end && !blocked;
      });
      if (!fits) throw new ApiError(409, 'Availability conflicts with an accepted appointment');
    }

    profile.timezone = input.timezone;
    profile.availability = candidate;
    await profile.save();
    return profile;
  });
}

module.exports = { generateSlots, listAvailableSlots, updateAvailability, localDateTime };