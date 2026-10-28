const fs = require('fs');
const path = require('path');

const uriFile = path.join(__dirname, '.mongo-test-uri');

module.exports = async function globalTeardown() {
  try {
    await global.__DOCTOR_APPOINTMENT_MONGO_SERVER__?.stop();
    if (global.__DOCTOR_APPOINTMENT_MONGO_SERVER__) {
      console.log('MongoDB test server stopped after Jest suites.');
    }
  } finally {
    if (fs.existsSync(uriFile)) fs.unlinkSync(uriFile);
    delete global.__DOCTOR_APPOINTMENT_MONGO_SERVER__;
  }
};
