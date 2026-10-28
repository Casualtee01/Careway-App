const DoctorProfile = require('../models/DoctorProfile');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const { setRefreshCookie, clearRefreshCookie } = require('../utils/sessionCookie');

const metadata = (req) => ({ userAgent: req.get('user-agent'), ipAddress: req.ip });

const registerPatient = asyncHandler(async (req, res) => {
  const user = await authService.registerPatient(req.body);
  res.status(201).json(new ApiResponse(201, { user }, 'Patient account created'));
});

const registerDoctor = asyncHandler(async (req, res) => {
  const result = await authService.registerDoctor(req.body);
  res.status(201).json(new ApiResponse(201, result, 'Doctor account created and submitted for approval'));
});

const login = asyncHandler(async (req, res) => {
  const session = await authService.login(req.body.email, req.body.password, metadata(req));
  setRefreshCookie(res, session.refreshToken);
  res.json(new ApiResponse(200, { accessToken: session.accessToken, user: session.user }, 'Signed in'));
});

const refresh = asyncHandler(async (req, res) => {
  const session = await authService.rotateRefreshToken(req.signedCookies.refreshToken, metadata(req));
  setRefreshCookie(res, session.refreshToken);
  res.json(new ApiResponse(200, { accessToken: session.accessToken, user: session.user }, 'Session refreshed'));
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.signedCookies.refreshToken);
  clearRefreshCookie(res);
  res.json(new ApiResponse(200, null, 'Signed out'));
});

const me = asyncHandler(async (req, res) => {
  let profile;
  if (req.user.role === 'doctor') profile = await DoctorProfile.findOne({ user: req.user._id }).populate('specialty', 'name');
  res.json(new ApiResponse(200, { user: req.user, ...(profile && { doctorProfile: profile }) }));
});

module.exports = { registerPatient, registerDoctor, login, refresh, logout, me };