const express = require('express');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { authRateLimiter } = require('../middleware/rateLimiter');
const controller = require('../controllers/auth.controller');
const validators = require('../validators/auth.validator');

const router = express.Router();

router.post('/register/patient', authRateLimiter, validators.registerPatient, validate, controller.registerPatient);
router.post('/register/doctor', authRateLimiter, validators.registerDoctor, validate, controller.registerDoctor);
router.post('/login', authRateLimiter, validators.login, validate, controller.login);
router.post('/refresh', authRateLimiter, controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;