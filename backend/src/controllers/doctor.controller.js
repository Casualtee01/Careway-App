const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const appointmentService = require('../services/appointment.service');
const doctorService = require('../services/doctor.service');
const { listAvailableSlots } = require('../services/availability.service');

const search = asyncHandler(async (req, res) => {
  const result = await doctorService.searchDoctors(req.query);
  res.json(new ApiResponse(200, result));
});

const getPublicProfile = asyncHandler(async (req, res) => {
  const profile = await doctorService.getPublicDoctor(req.params.id);
  res.json(new ApiResponse(200, { doctor: profile }));
});

const getPublicAvailability = asyncHandler(async (req, res) => {
  const slots = await listAvailableSlots(req.params.id, req.query.date);
  res.json(new ApiResponse(200, { date: req.query.date, slots }));
});

const getProfile = asyncHandler(async (req, res) => {
  const profile = await doctorService.getDoctorProfile(req.user._id);
  res.json(new ApiResponse(200, { doctorProfile: profile }));
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await doctorService.updateDoctorProfile(req.user._id, req.body);
  res.json(new ApiResponse(200, { doctorProfile: profile }, 'Doctor profile updated'));
});

const listAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.listAppointments('doctor', req.user._id, req.query);
  res.json(new ApiResponse(200, result));
});

const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentForUser(req.params.id, req.user);
  if (appointment.doctor._id.toString() !== req.user._id.toString()) throw new ApiError(404, 'Appointment not found');
  res.json(new ApiResponse(200, { appointment }));
});

const acceptAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.acceptAppointment(req.params.id, req.user._id);
  res.json(new ApiResponse(200, { appointment }, 'Appointment accepted'));
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(req.params.id, req.user, req.body.reason);
  res.json(new ApiResponse(200, { appointment }, 'Appointment cancelled'));
});

const completeAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.completeAppointment(req.params.id, req.user._id);
  res.json(new ApiResponse(200, { appointment }, 'Appointment completed'));
});

module.exports = { search, getPublicProfile, getPublicAvailability, getProfile, updateProfile, listAppointments, getAppointment, acceptAppointment, cancelAppointment, completeAppointment };