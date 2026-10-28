const { body, param, query } = require('express-validator');

const updateDoctorProfile = [
  body('specialty').optional({ nullable: true }).isMongoId(),
  body('qualifications').optional().isArray({ max: 20 }),
  body('qualifications.*').optional().isString().trim().isLength({ min: 1, max: 160 }),
  body('experienceYears').optional().isInt({ min: 0, max: 80 }).toInt(),
  body('bio').optional().isString().trim().isLength({ max: 3000 }),
  body('clinicName').optional().isString().trim().isLength({ max: 160 }),
  body('clinicAddress').optional().isString().trim().isLength({ max: 500 }),
  body('consultationFee').optional().isFloat({ min: 0 }).toFloat(),
  body('timezone').optional().isString().isLength({ min: 1, max: 100 })
];

const doctorSearch = [
  query('specialty').optional().isMongoId(),
  query('minFee').optional().isFloat({ min: 0 }).toFloat(),
  query('maxFee').optional().isFloat({ min: 0 }).toFloat(),
  query('name').optional().isString().trim().isLength({ max: 120 }),
  query('location').optional().isString().trim().isLength({ max: 160 }),
  query('clinicName').optional().isString().trim().isLength({ max: 160 }),
  query('availableDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  query('sort').optional().isIn(['fee', 'name', 'experience']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
];

const idParam = [param('id').isMongoId()];

module.exports = { updateDoctorProfile, doctorSearch, idParam };