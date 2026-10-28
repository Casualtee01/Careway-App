const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const controller = require('../controllers/availability.controller');
const validators = require('../validators/availability.validator');

const router = express.Router();
router.use(authenticate, authorize('doctor'));
router.get('/availability', controller.getMine);
router.put('/availability', validators.availability, validate, controller.updateMine);

module.exports = router;