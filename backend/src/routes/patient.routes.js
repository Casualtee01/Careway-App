const express = require('express');
const { body, param } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const patient = require('../controllers/patient.controller');
const appointmentValidator = require('../validators/appointment.validator');

const router = express.Router();
router.use(authenticate, authorize('patient'));

router.get('/profile', patient.getProfile);
router.patch('/profile', [
  body('name').optional().trim().isLength({ min: 2, max: 120 }),
  body('phone').optional().trim().isLength({ max: 32 }),
  body('profileImage').optional().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 1000 })
], validate, patient.updateProfile);
router.get('/appointments', appointmentValidator.listAppointments, validate, patient.listAppointments);
router.get('/appointments/:id', param('id').isMongoId(), validate, patient.getAppointment);

module.exports = router;