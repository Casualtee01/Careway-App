const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginationMetadata } = require('../utils/pagination');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const [data, total] = await Promise.all([
    Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments({ recipient: req.user._id })
  ]);
  res.json(new ApiResponse(200, { data, pagination: paginationMetadata(page, limit, total) }));
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found');
  res.json(new ApiResponse(200, { notification }, 'Notification marked as read'));
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ recipient: req.user._id, isRead: false }, { $set: { isRead: true } });
  res.json(new ApiResponse(200, { updated: result.modifiedCount }, 'Notifications marked as read'));
});

module.exports = { list, markRead, markAllRead };