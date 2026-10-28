const AuditLog = require('../models/AuditLog');
const Specialty = require('../models/Specialty');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const specialties = await Specialty.find({ isActive: true }).sort({ name: 1 });
  res.json(new ApiResponse(200, { specialties }));
});

const create = asyncHandler(async (req, res) => {
  const specialty = await Specialty.create({ name: req.body.name, description: req.body.description });
  await AuditLog.create({ actor: req.user._id, action: 'specialty_created', targetType: 'Specialty', targetId: specialty._id });
  res.status(201).json(new ApiResponse(201, { specialty }, 'Specialty created'));
});

const update = asyncHandler(async (req, res) => {
  const updates = {};
  if (typeof req.body.name === 'string') updates.name = req.body.name.trim();
  if (typeof req.body.description === 'string') updates.description = req.body.description.trim();
  if (!Object.keys(updates).length) throw new ApiError(400, 'Provide a specialty name or description');
  const specialty = await Specialty.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
  if (!specialty) throw new ApiError(404, 'Specialty not found');
  await AuditLog.create({ actor: req.user._id, action: 'specialty_updated', targetType: 'Specialty', targetId: specialty._id });
  res.json(new ApiResponse(200, { specialty }, 'Specialty updated'));
});

const deactivate = asyncHandler(async (req, res) => {
  const specialty = await Specialty.findByIdAndUpdate(req.params.id, { $set: { isActive: false } }, { new: true });
  if (!specialty) throw new ApiError(404, 'Specialty not found');
  await AuditLog.create({ actor: req.user._id, action: 'specialty_deactivated', targetType: 'Specialty', targetId: specialty._id });
  res.json(new ApiResponse(200, { specialty }, 'Specialty deactivated'));
});

module.exports = { list, create, update, deactivate };