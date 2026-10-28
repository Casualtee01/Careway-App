const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function generateAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer: 'doctor-appointment-api',
    audience: 'doctor-appointment-client'
  });
}

function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + parseDuration(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'));
  return { token, tokenHash, expiresAt };
}

function hashToken(token) {
  return crypto.createHmac('sha256', process.env.REFRESH_TOKEN_SECRET).update(token).digest('hex');
}

function parseDuration(value) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error('REFRESH_TOKEN_EXPIRES_IN must use s, m, h, or d units');
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(match[1]) * units[match[2]];
}

module.exports = { generateAccessToken, generateRefreshToken, hashToken };