const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./auth.routes');
const patientRoutes = require('./patient.routes');
const doctorRoutes = require('./doctor.routes');
const appointmentRoutes = require('./appointment.routes');
const availabilityRoutes = require('./availability.routes');
const adminRoutes = require('./admin.routes');
const specialtyRoutes = require('./specialty.routes');
const notificationRoutes = require('./notification.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    data: { status: connected ? 'ok' : 'unavailable', database: connected ? 'connected' : 'disconnected', timestamp: new Date().toISOString() }
  });
});

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use(doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/doctor', availabilityRoutes);
router.use(adminRoutes);
router.use(specialtyRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;