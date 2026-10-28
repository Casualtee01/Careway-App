const express = require('express');
const { body, param } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const controller = require('../controllers/admin.controller');

const router = express.Router();
router.use('/admin', authenticate, authorize('admin'));

router.get('/admin/dashboard', controller.dashboard);
router.get('/admin/users', controller.listUsers);
router.get('/admin/users/:id', param('id').isMongoId(), validate, controller.getUser);
router.patch('/admin/users/:id/status', [param('id').isMongoId(), body('isActive').isBoolean().toBoolean()], validate, controller.setUserStatus);
router.get('/admin/doctors', controller.listDoctors);
router.patch('/admin/doctors/:id/approve', param('id').isMongoId(), validate, controller.approveDoctor);
router.patch('/admin/doctors/:id/reject', param('id').isMongoId(), validate, controller.rejectDoctor);
router.get('/admin/appointments', controller.listAppointments);
router.get('/admin/appointments/:id', param('id').isMongoId(), validate, controller.getAppointment);
router.patch('/admin/appointments/:id/cancel', [param('id').isMongoId(), body('reason').trim().isLength({ min: 3, max: 1000 })], validate, controller.cancelAppointment);

module.exports = router;