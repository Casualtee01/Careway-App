const Appointment = require('../models/Appointment');
const AuditLog = require('../models/AuditLog');
const DoctorProfile = require('../models/DoctorProfile');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const appointmentService = require('../services/appointment.service');
const { getPagination, paginationMetadata } = require('../utils/pagination');

async function recordAdminAction(actor, action, targetType, targetId, details = {}) {
  await AuditLog.create({ actor, action, targetType, targetId, details });
}

const dashboard = asyncHandler(async (req, res) => {
  const [users, doctorsPending, appointmentsPending, appointmentsAccepted] = await Promise.all([
    User.countDocuments({ isActive: true }),
    DoctorProfile.countDocuments({ approvalStatus: 'pending' }),
    Appointment.countDocuments({ status: 'pending' }),
    Appointment.countDocuments({ status: 'accepted' })
  ]);
  res.json(new ApiResponse(200, { users, doctorsPending, appointmentsPending, appointmentsAccepted }));
});

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (['patient', 'doctor', 'admin'].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.isActive === 'true' || req.query.isActive === 'false') filter.isActive = req.query.isActive === 'true';
  const [data, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);
  res.json(new ApiResponse(200, { data, pagination: paginationMetadata(page, limit, total) }));
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json(new ApiResponse(200, { user }));
});

const setUserStatus = asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') throw new ApiError(422, 'isActive must be a boolean');
  if (req.params.id === req.user._id.toString() && !req.body.isActive) throw new ApiError(400, 'Administrators cannot deactivate their own account');
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isActive: req.body.isActive } }, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.isActive) await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await recordAdminAction(req.user._id, req.body.isActive ? 'user_activated' : 'user_deactivated', 'User', user._id);
  res.json(new ApiResponse(200, { user }, 'User status updated'));
});

const listDoctors = asyncHandler(async (req, res) => {
  const filter = {};
  if (['pending', 'approved', 'rejected'].includes(req.query.approvalStatus)) filter.approvalStatus = req.query.approvalStatus;
  const { page, limit, skip } = getPagination(req.query);
  const [data, total] = await Promise.all([
    DoctorProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate({ path: 'user', select: 'name email phone isActive createdAt' }).populate('specialty', 'name'),
    DoctorProfile.countDocuments(filter)
  ]);
  res.json(new ApiResponse(200, { data, pagination: paginationMetadata(page, limit, total) }));
});

const setDoctorApproval = (status) => asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findOneAndUpdate(
    { user: req.params.id },
    { $set: { approvalStatus: status } },
    { new: true, runValidators: true }
  ).populate('user', 'name email isActive');
  if (!profile) throw new ApiError(404, 'Doctor profile not found');
  await recordAdminAction(req.user._id, `doctor_${status}`, 'DoctorProfile', profile._id, { doctor: profile.user._id });
  res.json(new ApiResponse(200, { doctorProfile: profile }, `Doctor ${status}`));
});

const listAppointments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (['pending', 'accepted', 'cancelled', 'completed'].includes(req.query.status)) filter.status = req.query.status;
  const [data, total] = await Promise.all([
    Appointment.find(filter).sort({ startAt: -1 }).skip(skip).limit(limit)
      .populate('patient', 'name').populate('doctor', 'name'),
    Appointment.countDocuments(filter)
  ]);
  res.json(new ApiResponse(200, { data, pagination: paginationMetadata(page, limit, total) }));
});

const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id).populate('patient', 'name').populate('doctor', 'name');
  if (!appointment) throw new ApiError(404, 'Appointment not found');
  res.json(new ApiResponse(200, { appointment }));
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(req.params.id, req.user, req.body.reason);
  await recordAdminAction(req.user._id, 'appointment_cancelled', 'Appointment', appointment._id);
  res.json(new ApiResponse(200, { appointment }, 'Appointment cancelled'));
});

module.exports = {
  dashboard, listUsers, getUser, setUserStatus, listDoctors,
  approveDoctor: setDoctorApproval('approved'), rejectDoctor: setDoctorApproval('rejected'),
  listAppointments, getAppointment, cancelAppointment
};