const { body, param, query } = require('express-validator');

const createAppointment = [
  body('doctor').isMongoId(),
  body('startAt').isISO8601({ strict: true }).toDate(),
  body('appointmentType').isIn(['in_person', 'online']),
  body('reason').optional().isString().trim().isLength({ max: 2000 })
];

const cancelAppointment = [
  param('id').isMongoId(),
  body('reason').trim().isLength({ min: 3, max: 1000 })
];

const listAppointments = [
  query('status').optional().isIn(['pending', 'accepted', 'cancelled', 'completed'])
];

module.exports = { createAppointment, cancelAppointment, listAppointments };