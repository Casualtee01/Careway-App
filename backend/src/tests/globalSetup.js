const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const uriFile = path.join(__dirname, '.mongo-test-uri');
const testDatabaseName = 'doctor_appointment_test';

function getDatabaseDetails(uri) {
  const parsed = new URL(uri);
  return { host: parsed.host.toLowerCase(), database: decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] || '') };
}

function assertIsolatedTestDatabase(uri) {
  let details;
  try {
    details = getDatabaseDetails(uri);
  } catch {
    throw new Error('TEST_MONGODB_URI must be a valid MongoDB connection string');
  }
  if (!/(^|[_-])(test|testing|spec)([_-]|$)/i.test(details.database)) {
    throw new Error('TEST_MONGODB_URI must use a dedicated database name containing test, testing, or spec');
  }
  if (process.env.MONGODB_URI) {
    const applicationDatabase = getDatabaseDetails(process.env.MONGODB_URI);
    if (details.host === applicationDatabase.host && details.database === applicationDatabase.database) {
      throw new Error('TEST_MONGODB_URI must not point to the application database');
    }
  }
}

function findSystemMongoBinary() {
  const configuredBinary = process.env.MONGOMS_SYSTEM_BINARY;
  const serverRoot = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'MongoDB', 'Server');
  const candidates = configuredBinary
    ? [configuredBinary]
    : fs.existsSync(serverRoot)
      ? fs.readdirSync(serverRoot)
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
        .map((version) => path.join(serverRoot, version, 'bin', 'mongod.exe'))
      : [];

  for (const binaryPath of candidates) {
    if (!fs.existsSync(binaryPath)) continue;
    const output = execFileSync(binaryPath, ['--version'], { encoding: 'utf8' });
    const version = /db version v(\d+\.\d+\.\d+)/.exec(output)?.[1];
    if (version) return { binaryPath, version };
  }
  return null;
}

module.exports = async function globalSetup() {
  process.env.MONGOMS_RESUME_DOWNLOAD ||= 'true';
  process.env.MONGOMS_MAX_RETRIES ||= '5';

  if (process.env.TEST_MONGODB_URI) {
    assertIsolatedTestDatabase(process.env.TEST_MONGODB_URI);
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.TEST_MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    await mongoose.connection.db.admin().command({ ping: 1 });
    await mongoose.disconnect();
    fs.writeFileSync(uriFile, JSON.stringify({ uri: process.env.TEST_MONGODB_URI, managed: false }));
    console.log('Using the configured isolated MongoDB test database.');
    return;
  }

  let mongoServer;
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const systemBinary = findSystemMongoBinary();
    const binary = systemBinary
      ? { systemBinary: systemBinary.binaryPath, version: systemBinary.version }
      : { version: process.env.MONGOMS_VERSION || '7.0.24' };
    mongoServer = await MongoMemoryServer.create({
      binary,
      instance: { dbName: testDatabaseName }
    });
    global.__DOCTOR_APPOINTMENT_MONGO_SERVER__ = mongoServer;
    fs.writeFileSync(uriFile, JSON.stringify({ uri: mongoServer.getUri(testDatabaseName), managed: true }));
    console.log('MongoDB test server started before Jest suites.');
  } catch (error) {
    await mongoServer?.stop();
    throw new Error(`Unable to start MongoDB test server: ${error.message}`);
  }
};
