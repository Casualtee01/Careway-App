const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const appointmentService = require('../services/appointment.service');

const create = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.createAppointment(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, { appointment }, 'Appointment booked successfully'));
});

const listMine = asyncHandler(async (req, res) => {
  const result = await appointmentService.listAppointments('patient', req.user._id, req.query);
  res.json(new ApiResponse(200, result));
});

const getMine = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentForUser(req.params.id, req.user);
  res.json(new ApiResponse(200, { appointment }));
});

const cancelMine = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(req.params.id, req.user, req.body.reason);
  res.json(new ApiResponse(200, { appointment }, 'Appointment cancelled'));
});

module.exports = { create, listMine, getMine, cancelMine };