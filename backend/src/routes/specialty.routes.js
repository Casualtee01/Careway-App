const express = require('express');
const { body, param } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const controller = require('../controllers/specialty.controller');

const router = express.Router();
router.get('/specialties', controller.list);

router.post('/admin/specialties', authenticate, authorize('admin'), [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('description').optional().isString().trim().isLength({ max: 1000 })
], validate, controller.create);
router.patch('/admin/specialties/:id', authenticate, authorize('admin'), [
  param('id').isMongoId(),
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().isString().trim().isLength({ max: 1000 })
], validate, controller.update);
router.delete('/admin/specialties/:id', authenticate, authorize('admin'), param('id').isMongoId(), validate, controller.deactivate);

module.exports = router;