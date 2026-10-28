const express = require('express');
const { param } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const controller = require('../controllers/doctor.controller');
const doctorValidator = require('../validators/doctor.validator');
const appointmentValidator = require('../validators/appointment.validator');

const router = express.Router();

router.get('/doctors', doctorValidator.doctorSearch, validate, controller.search);
router.get('/doctors/:id/availability', [param('id').isMongoId(), require('express-validator').query('date').isISO8601({ strict: true })], validate, controller.getPublicAvailability);
router.get('/doctors/:id', doctorValidator.idParam, validate, controller.getPublicProfile);

router.get('/doctor/profile', authenticate, authorize('doctor'), controller.getProfile);
router.patch('/doctor/profile', authenticate, authorize('doctor'), doctorValidator.updateDoctorProfile, validate, controller.updateProfile);
router.get('/doctor/appointments', authenticate, authorize('doctor'), appointmentValidator.listAppointments, validate, controller.listAppointments);
router.get('/doctor/appointments/:id', authenticate, authorize('doctor'), doctorValidator.idParam, validate, controller.getAppointment);
router.patch('/doctor/appointments/:id/accept', authenticate, authorize('doctor'), doctorValidator.idParam, validate, controller.acceptAppointment);
router.patch('/doctor/appointments/:id/cancel', authenticate, authorize('doctor'), appointmentValidator.cancelAppointment, validate, controller.cancelAppointment);
router.patch('/doctor/appointments/:id/complete', authenticate, authorize('doctor'), doctorValidator.idParam, validate, controller.completeAppointment);

module.exports = router;