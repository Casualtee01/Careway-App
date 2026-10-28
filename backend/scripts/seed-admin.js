require('dotenv').config();

const readline = require('node:readline/promises');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const connectDatabase = require('../src/config/db');
const { validateEnvironment } = require('../src/config/env');
const User = require('../src/models/User');

const bootstrapLockId = 'initial-admin';

async function ask(question) {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await terminal.question(question)).trim();
  } finally {
    terminal.close();
  }
}

function askSecret(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('ADMIN_PASSWORD is required when input is not an interactive terminal');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();

    function finish(error) {
      stdin.removeListener('data', onData);
      stdin.setRawMode(wasRaw || false);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    }

    function onData(chunk) {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') return finish(new Error('Admin setup cancelled'));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u007f' || character === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (character >= ' ') {
          value += character;
          process.stdout.write('*');
        }
      }
    }

    stdin.on('data', onData);
  });
}

function validatePassword(password) {
  return typeof password === 'string'
    && password.length >= 10
    && password.length <= 128
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password);
}

async function confirmProductionSeed() {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.ADMIN_SEED_CONFIRM === 'CREATE ADMIN') return;
  const confirmation = await ask('Production database selected. Type CREATE ADMIN to continue: ');
  if (confirmation !== 'CREATE ADMIN') throw new Error('Confirmation did not match; no changes were made');
}

async function createAdmin() {
  validateEnvironment();
  await confirmProductionSeed();

  const name = process.env.ADMIN_NAME?.trim() || await ask('Admin display name: ');
  const email = (process.env.ADMIN_EMAIL?.trim() || await ask('Admin email: ')).toLowerCase();
  const password = process.env.ADMIN_PASSWORD || await askSecret('Admin password (input hidden): ');

  if (name.length < 2 || name.length > 120) throw new Error('Admin name must be between 2 and 120 characters');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('A valid admin email is required');
  if (!validatePassword(password)) throw new Error('Password must be 10 to 128 characters and include lowercase, uppercase, and numeric characters');

  await connectDatabase();
  const existingAdminCount = await User.countDocuments({ role: 'admin' });
  if (existingAdminCount > 0) {
    const sameAdmin = await User.exists({ role: 'admin', email });
    if (sameAdmin) {
      console.log('The configured admin account already exists; no changes were made.');
      return;
    }
    throw new Error('An admin account already exists; refusing to create another admin');
  }

  const existingUser = await User.findOne({ email }).select('_id role');
  if (existingUser) throw new Error(`The configured email already belongs to a ${existingUser.role}; no account was changed`);

  const locks = mongoose.connection.collection('adminbootstraplocks');
  const lockToken = crypto.randomUUID();
  const lockExpiry = new Date(Date.now() + 10 * 60 * 1000);
  try {
    await locks.insertOne({ _id: bootstrapLockId, token: lockToken, expiresAt: lockExpiry });
  } catch (error) {
    if (error.code === 11000) {
      const reclaimed = await locks.updateOne(
        { _id: bootstrapLockId, expiresAt: { $lte: new Date() } },
        { $set: { token: lockToken, expiresAt: lockExpiry } }
      );
      if (!reclaimed.modifiedCount) throw new Error('Another admin bootstrap is running; no account was changed');
    } else {
      throw error;
    }
  }

  try {
    const raceCheck = await User.countDocuments({ role: 'admin' });
    if (raceCheck > 0) throw new Error('An admin account was created concurrently; no additional account was created');
    if (await User.exists({ email })) throw new Error('An account with the configured email was created concurrently; no account was changed');

    await User.create({ name, email, password, role: 'admin' });
    console.log('Admin account created. Sign in through the Careway frontend login page.');
  } finally {
    await locks.deleteOne({ _id: bootstrapLockId, token: lockToken });
  }
}

createAdmin()
  .catch((error) => {
    console.error('Admin bootstrap failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
