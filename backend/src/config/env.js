require('dotenv').config();

function validateEnvironment() {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'COOKIE_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production') {
    for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'COOKIE_SECRET']) {
      if (process.env[key].length < 32 || process.env[key].startsWith('replace_with_')) {
        throw new Error(`${key} must be a unique secret of at least 32 characters in production`);
      }
    }
  }

  process.env.PORT ||= '5000';
  process.env.NODE_ENV ||= 'development';
  process.env.JWT_EXPIRES_IN ||= '15m';
  process.env.REFRESH_TOKEN_EXPIRES_IN ||= '7d';
  return process.env;
}

module.exports = { validateEnvironment };