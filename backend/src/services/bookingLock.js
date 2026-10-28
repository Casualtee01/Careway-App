const crypto = require('crypto');
const BookingLock = require('../models/BookingLock');
const ApiError = require('../utils/ApiError');

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withDoctorBookingLock(doctorId, operation) {
  const owner = crypto.randomUUID();
  const deadline = Date.now() + 10000;
  let acquired = false;

  while (!acquired && Date.now() < deadline) {
    const now = new Date();
    try {
      const lock = await BookingLock.findOneAndUpdate(
        { _id: doctorId, $or: [{ leaseUntil: { $lte: now } }, { leaseUntil: { $exists: false } }] },
        { $set: { owner, leaseUntil: new Date(now.getTime() + 60000) } },
        { upsert: true, new: true }
      );
      acquired = lock?.owner === owner;
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
    if (!acquired) await delay(50);
  }

  if (!acquired) throw new ApiError(409, 'The doctor schedule is busy; retry the request');

  let rejectOnLostLock;
  let renewing = false;
  const lostLock = new Promise((resolve, reject) => {
    rejectOnLostLock = reject;
  });
  const heartbeat = setInterval(async () => {
    if (renewing) return;
    renewing = true;
    try {
      const result = await BookingLock.updateOne(
        { _id: doctorId, owner },
        { $set: { leaseUntil: new Date(Date.now() + 60000) } }
      );
      if (!result.matchedCount) throw new Error('Booking lock ownership was lost');
    } catch (error) {
      rejectOnLostLock(new ApiError(409, 'Booking lock was lost; retry the request'));
    } finally {
      renewing = false;
    }
  }, 20000);
  heartbeat.unref();

  try {
    return await Promise.race([Promise.resolve().then(operation), lostLock]);
  } finally {
    clearInterval(heartbeat);
    await BookingLock.deleteOne({ _id: doctorId, owner });
  }
}

module.exports = { withDoctorBookingLock };