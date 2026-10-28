const Notification = require('../models/Notification');

async function createNotification(notification) {
  try {
    return await Notification.create(notification);
  } catch (error) {
    console.error('Notification creation failed:', error.message);
    return null;
  }
}

async function sendEmail({ to, subject, text }) {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM) return false;
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
  return true;
}

module.exports = { createNotification, sendEmail };