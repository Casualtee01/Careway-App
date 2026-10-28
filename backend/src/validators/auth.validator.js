const { body } = require('express-validator');

const passwordRules = body('password')
  .isString().withMessage('Password is required')
  .isLength({ min: 10, max: 128 }).withMessage('Password must be 10 to 128 characters')
  .matches(/[a-z]/).withMessage('Password must include a lowercase letter')
  .matches(/[A-Z]/).withMessage('Password must include an uppercase letter')
  .matches(/[0-9]/).withMessage('Password must include a number');

const registerPatient = [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 32 }),
  passwordRules
];

const registerDoctor = [
  ...registerPatient,
  body('specialty').optional().isMongoId(),
  body('qualifications').optional().isArray({ max: 20 }),
  body('qualifications.*').optional().isString().trim().isLength({ min: 1, max: 160 }),
  body('experienceYears').optional().isInt({ min: 0, max: 80 }).toInt(),
  body('clinicName').optional().isString().trim().isLength({ max: 160 }),
  body('clinicAddress').optional().isString().trim().isLength({ max: 500 }),
  body('consultationFee').optional().isFloat({ min: 0 }).toFloat(),
  body('timezone').optional().isString().isLength({ min: 1, max: 100 })
];

const login = [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 128 })
];

module.exports = { registerPatient, registerDoctor, login };