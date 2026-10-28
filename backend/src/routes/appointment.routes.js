const express = require('express');
const { param } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const controller = require('../controllers/appointment.controller');
const validators = require('../validators/appointment.validator');

const router = express.Router();
router.use(authenticate, authorize('patient'));

router.post('/', validators.createAppointment, validate, controller.create);
router.get('/my-appointments', validators.listAppointments, validate, controller.listMine);
router.get('/:id', param('id').isMongoId(), validate, controller.getMine);
router.patch('/:id/cancel', validators.cancelAppointment, validate, controller.cancelMine);

module.exports = router;