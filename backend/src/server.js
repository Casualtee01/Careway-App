const mongoose = require('mongoose');
const { validateEnvironment } = require('./config/env');
const environment = validateEnvironment();
const app = require('./app');
const connectDatabase = require('./config/db');
const { expireDuePendingAppointments } = require('./services/appointment.service');

const port = Number(environment.PORT || 5000);

async function startServer() {
  try {
    await connectDatabase();
    const server = app.listen(port, () => {
      console.log(`API server listening on port ${port}`);
    });
    const expiryTimer = setInterval(() => {
      expireDuePendingAppointments().catch(() => console.error('Appointment expiry sweep failed'));
    }, 60 * 1000);
    expiryTimer.unref();

    const shutdown = (signal) => {
      console.log(`${signal} received; closing server`);
      clearInterval(expiryTimer);
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    return server;
  } catch (error) {
    if (environment.NODE_ENV === 'development') console.error('Unable to start the API server:', error.message);
    else console.error('Unable to start the API server; verify configuration and database availability.');
    process.exit(1);
  }
}

if (require.main === module) startServer();

module.exports = { startServer };