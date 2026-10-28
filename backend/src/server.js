const mongoose = require('mongoose');
const { validateEnvironment } = require('./config/env');
const connectDatabase = require('./config/db');
const safeErrorMessage = require('./utils/safeErrorMessage');

async function startServer() {
  let stage = 'configuration';
  let server;
  let expiryTimer;
  try {
    const environment = validateEnvironment();
    const app = require('./app');
    const { expireDuePendingAppointments } = require('./services/appointment.service');
    const port = Number(environment.PORT);

    stage = 'MongoDB connection';
    await connectDatabase();

    stage = 'HTTP listener';
    server = await new Promise((resolve, reject) => {
      const listener = app.listen(port, '0.0.0.0');
      const onError = (error) => reject(error);
      listener.once('error', onError);
      listener.once('listening', () => {
        listener.removeListener('error', onError);
        resolve(listener);
      });
    });
    server.on('error', (error) => {
      console.error('HTTP server error:', safeErrorMessage(error));
    });
    console.log(`API server listening on port ${port}`);

    expiryTimer = setInterval(() => {
      expireDuePendingAppointments().catch((error) => {
        console.error('Appointment expiry sweep failed:', safeErrorMessage(error));
      });
    }, 60 * 1000);
    expiryTimer.unref();

    const shutdown = (signal) => {
      console.log(`${signal} received; closing server`);
      clearInterval(expiryTimer);
      server.close(async (error) => {
        if (error) {
          console.error('Unable to close the HTTP server:', safeErrorMessage(error));
          process.exitCode = 1;
        }
        try {
          await mongoose.disconnect();
        } catch (disconnectError) {
          console.error('Unable to close the MongoDB connection:', safeErrorMessage(disconnectError));
          process.exitCode = 1;
        }
      });
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    return server;
  } catch (error) {
    console.error(`Unable to start the API server during ${stage}:`, safeErrorMessage(error));
    if (expiryTimer) clearInterval(expiryTimer);
    if (server?.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error('Unable to close the MongoDB connection after startup failure:', safeErrorMessage(disconnectError));
      }
    }
    process.exitCode = 1;
    return null;
  }
}

if (require.main === module) startServer();

module.exports = { startServer };