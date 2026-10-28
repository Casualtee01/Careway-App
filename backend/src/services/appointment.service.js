const { DateTime } = require('luxon');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { withDoctorBookingLock } = require('./bookingLock');
const { generateSlots } = require('./availability.service');
const { createNotification } = require('./notification.service');

async function createAppointment(patientId, input) {
  const doctor = await User.findOne({ _id: input.doctor, role: 'doctor', isActive: true }).select('_id');
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  const profile = await DoctorProfile.findOne({ user: doctor._id, approvalStatus: 'approved' });
  if (!profile) throw new ApiError(404, 'Doctor not found');
  const startAt = new Date(input.startAt);
  if (!Number.isFinite(startAt.getTime()) || startAt <= new Date()) throw new ApiError(400, 'Appointments must be scheduled in the future');

  const appointment = await withDoctorBookingLock(doctor._id, async () => {
    const activeDoctor = await User.exists({ _id: doctor._id, role: 'doctor', isActive: true });
    const currentProfile = await DoctorProfile.findOne({ user: doctor._id, approvalStatus: 'approved' });
    if (!activeDoctor || !currentProfile) throw new ApiError(404, 'Doctor not found');
    const localStart = DateTime.fromJSDate(startAt, { zone: currentProfile.timezone });
    const date = localStart.toISODate();
    const slot = generateSlots(currentProfile, date).find((candidate) => candidate.startAt.getTime() === startAt.getTime());
    if (!slot) throw new ApiError(409, 'The selected time is not an available appointment slot');

    const conflict = await Appointment.exists({
      doctor: doctor._id,
      $or: [{ status: 'accepted' }, { status: 'pending', expiresAt: { $gt: new Date() } }],
      startAt: { $lt: slot.endAt },
      endAt: { $gt: slot.startAt }
    });
    if (conflict) throw new ApiError(409, 'The selected appointment slot is unavailable');

    return Appointment.create({
      patient: patientId,
      doctor: doctor._id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      appointmentType: input.appointmentType,
      reason: input.reason,
      status: 'pending',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
    });
  });

  await createNotification({
    recipient: doctor._id,
    type: 'appointment_requested',
    title: 'New appointment request',
    message: 'A patient has requested an appointment.',
    relatedAppointment: appointment._id
  });
  return appointment;
}

async function listAppointments(ownerField, ownerId, query = {}) {
  await expireDuePendingAppointments();
  const filter = { [ownerField]: ownerId };
  if (query.status) filter.status = query.status;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const [data, total] = await Promise.all([
    Appointment.find(filter).sort({ startAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('patient', 'name profileImage').populate('doctor', 'name profileImage'),
    Appointment.countDocuments(filter)
  ]);
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getAppointmentForUser(appointmentId, user) {
  const appointment = await Appointment.findById(appointmentId)
    .populate('patient', 'name profileImage').populate('doctor', 'name profileImage');
  if (!appointment) throw new ApiError(404, 'Appointment not found');
  const ownerId = user._id.toString();
  const ownsAppointment = appointment.patient._id.toString() === ownerId || appointment.doctor._id.toString() === ownerId;
  if (!ownsAppointment && user.role !== 'admin') throw new ApiError(404, 'Appointment not found');
  return appointment;
}

async function acceptAppointment(appointmentId, doctorId) {
  if (!(await DoctorProfile.exists({ user: doctorId, approvalStatus: 'approved' }))) {
    throw new ApiError(403, 'Doctor profile is not approved');
  }

  return withDoctorBookingLock(doctorId, async () => {
    if (!(await User.exists({ _id: doctorId, role: 'doctor', isActive: true }))) throw new ApiError(403, 'Doctor account is inactive');
    const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctorId });
    if (!appointment) throw new ApiError(404, 'Appointment not found');
    if (appointment.status !== 'pending') throw new ApiError(409, 'Only pending appointments can be accepted');
    if (appointment.expiresAt <= new Date()) {
      await Appointment.updateOne(
        { _id: appointment._id, status: 'pending', expiresAt: { $lte: new Date() } },
        { $set: { status: 'cancelled', cancellationReason: 'Booking request expired', cancelledAt: new Date() } }
      );
      throw new ApiError(409, 'This appointment request has expired');
    }
    const conflict = await Appointment.exists({
      _id: { $ne: appointment._id },
      doctor: doctorId,
      $or: [{ status: 'accepted' }, { status: 'pending', expiresAt: { $gt: new Date() } }],
      startAt: { $lt: appointment.endAt },
      endAt: { $gt: appointment.startAt }
    });
    if (conflict) throw new ApiError(409, 'Another appointment conflicts with this time');

    const accepted = await Appointment.findOneAndUpdate(
      { _id: appointment._id, status: 'pending' },
      { $set: { status: 'accepted', acceptedAt: new Date() } },
      { new: true }
    );
    if (!accepted) throw new ApiError(409, 'Appointment status changed; reload and try again');
    await createNotification({
      recipient: accepted.patient,
      type: 'appointment_accepted',
      title: 'Appointment accepted',
      message: 'Your doctor accepted the appointment request.',
      relatedAppointment: accepted._id
    });
    return accepted;
  });
}

async function cancelAppointment(appointmentId, actor, reason) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new ApiError(404, 'Appointment not found');
  const isPatient = appointment.patient.toString() === actor._id.toString();
  const isDoctor = appointment.doctor.toString() === actor._id.toString();
  const isAdmin = actor.role === 'admin';
  if (!isPatient && !isDoctor && !isAdmin) throw new ApiError(404, 'Appointment not found');
  if (!['pending', 'accepted'].includes(appointment.status)) throw new ApiError(409, 'This appointment can no longer be cancelled');
  if (isPatient && appointment.startAt.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
    throw new ApiError(409, 'Patients must cancel at least 24 hours before the appointment');
  }

  const cancelled = await withDoctorBookingLock(appointment.doctor, async () => {
    const current = await Appointment.findById(appointment._id);
    if (!current || !['pending', 'accepted'].includes(current.status)) return null;
    if (isPatient && current.startAt.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      throw new ApiError(409, 'Patients must cancel at least 24 hours before the appointment');
    }
    return Appointment.findOneAndUpdate(
      { _id: current._id, status: { $in: ['pending', 'accepted'] } },
      { $set: { status: 'cancelled', cancellationReason: reason, cancelledBy: actor._id, cancelledAt: new Date() } },
      { new: true }
    );
  });
  if (!cancelled) throw new ApiError(409, 'Appointment status changed; reload and try again');

  await createNotification({
    recipient: isPatient ? appointment.doctor : appointment.patient,
    type: 'appointment_cancelled',
    title: 'Appointment cancelled',
    message: 'An appointment has been cancelled.',
    relatedAppointment: appointment._id
  });
  return cancelled;
}

async function completeAppointment(appointmentId, doctorId) {
  const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctorId });
  if (!appointment) throw new ApiError(404, 'Appointment not found');
  if (appointment.status !== 'accepted' || appointment.endAt > new Date()) {
    throw new ApiError(409, 'Only accepted appointments that have ended can be completed');
  }
  const completed = await Appointment.findOneAndUpdate(
    { _id: appointment._id, status: 'accepted', endAt: { $lte: new Date() } },
    { $set: { status: 'completed', completedAt: new Date() } },
    { new: true }
  );
  if (!completed) throw new ApiError(409, 'Appointment status changed; reload and try again');
  await createNotification({
    recipient: completed.patient,
    type: 'appointment_completed',
    title: 'Appointment completed',
    message: 'Your appointment has been marked complete.',
    relatedAppointment: completed._id
  });
  return completed;
}

async function expireDuePendingAppointments() {
  const now = new Date();
  const due = await Appointment.find({ status: 'pending', expiresAt: { $lte: now } }).select('_id doctor patient');
  let expiredCount = 0;
  for (const appointment of due) {
    const expired = await Appointment.findOneAndUpdate(
      { _id: appointment._id, status: 'pending', expiresAt: { $lte: now } },
      { $set: { status: 'cancelled', cancellationReason: 'Booking request expired', cancelledAt: now } },
      { new: true }
    );
    if (!expired) continue;
    expiredCount += 1;
    await Promise.all([
      createNotification({ recipient: expired.patient, type: 'appointment_expired', title: 'Appointment request expired', message: 'The doctor did not respond before the request expired.', relatedAppointment: expired._id }),
      createNotification({ recipient: expired.doctor, type: 'appointment_expired', title: 'Appointment request expired', message: 'A pending appointment request expired.', relatedAppointment: expired._id })
    ]);
  }
  return expiredCount;
}

module.exports = { createAppointment, listAppointments, getAppointmentForUser, acceptAppointment, cancelAppointment, completeAppointment, expireDuePendingAppointments };