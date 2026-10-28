const express = require('express');
const { param } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const controller = require('../controllers/notification.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', controller.list);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', param('id').isMongoId(), validate, controller.markRead);

module.exports = router;