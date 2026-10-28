const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const availabilityService = require('../services/availability.service');
const doctorService = require('../services/doctor.service');

const getMine = asyncHandler(async (req, res) => {
  const profile = await doctorService.getDoctorProfile(req.user._id);
  res.json(new ApiResponse(200, { availability: profile.availability, timezone: profile.timezone }));
});

const updateMine = asyncHandler(async (req, res) => {
  const profile = await availabilityService.updateAvailability(req.user._id, req.body);
  res.json(new ApiResponse(200, { availability: profile.availability, timezone: profile.timezone }, 'Availability updated'));
});

module.exports = { getMine, updateMine };