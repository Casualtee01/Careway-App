const { body, param, query } = require('express-validator');

const time = /^([01]\d|2[0-3]):[0-5]\d$/;

const availability = [
  body('timezone').isString().isLength({ min: 1, max: 100 }),
  body('appointmentDurationMinutes').isInt({ min: 10, max: 240 }).toInt(),
  body('weeklySchedule').isArray({ max: 7 }),
  body('weeklySchedule.*.dayOfWeek').isInt({ min: 0, max: 6 }).toInt(),
  body('weeklySchedule.*.startTime').matches(time),
  body('weeklySchedule.*.endTime').matches(time),
  body('weeklySchedule.*.breaks').optional().isArray({ max: 10 }),
  body('unavailableDates').optional().isArray({ max: 365 }),
  body('exceptions').optional().isArray({ max: 100 })
];

const availabilityDate = [param('id').isMongoId(), query('date').isISO8601({ strict: true })];

module.exports = { availability, availabilityDate };