require('dotenv').config();

function validateEnvironment() {
  process.env.PORT ||= '5000';
  process.env.NODE_ENV ||= 'development';
  process.env.JWT_EXPIRES_IN ||= '15m';
  process.env.REFRESH_TOKEN_EXPIRES_IN ||= '7d';

  const required = ['MONGODB_URI', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'COOKIE_SECRET'];
  if (process.env.NODE_ENV === 'production') required.push('CLIENT_URL');
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  if (process.env.NODE_ENV === 'production') {
    for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'COOKIE_SECRET']) {
      if (process.env[key].length < 32 || process.env[key].startsWith('replace_with_')) {
        throw new Error(`${key} must be a unique secret of at least 32 characters in production`);
      }
    }

    const origins = process.env.CLIENT_URL.split(',').map((origin) => origin.trim());
    if (origins.some((origin) => {
      try {
        const url = new URL(origin);
        return !['http:', 'https:'].includes(url.protocol)
          || url.origin === 'null'
          || url.username !== ''
          || url.password !== ''
          || url.pathname !== '/'
          || url.search
          || url.hash;
      } catch {
        return true;
      }
    })) {
      throw new Error('CLIENT_URL must contain comma-separated frontend origins, not full URLs with paths');
    }
  }

  return process.env;
}

module.exports = { validateEnvironment };