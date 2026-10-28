const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const appointmentService = require('../services/appointment.service');

const getProfile = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, { user: req.user }));
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'profileImage'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(updates).length) throw new ApiError(400, 'No permitted profile fields were provided');
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
  res.json(new ApiResponse(200, { user }, 'Profile updated'));
});

const listAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.listAppointments('patient', req.user._id, req.query);
  res.json(new ApiResponse(200, result));
});

const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentForUser(req.params.id, req.user);
  if (appointment.patient._id.toString() !== req.user._id.toString()) throw new ApiError(404, 'Appointment not found');
  res.json(new ApiResponse(200, { appointment }));
});

module.exports = { getProfile, updateProfile, listAppointments, getAppointment };