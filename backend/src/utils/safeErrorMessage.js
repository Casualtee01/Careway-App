const sensitiveEnvironmentKeys = [
  'MONGODB_URI',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'COOKIE_SECRET',
  'SMTP_PASS'
];

function safeErrorMessage(error) {
  let message = error instanceof Error ? error.message : String(error);

  for (const key of sensitiveEnvironmentKeys) {
    const value = process.env[key];
    if (value) message = message.replaceAll(value, '[REDACTED]');
  }

  message = message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, 'mongodb://[REDACTED]')
    .replace(/([a-z][a-z\d+.-]*:\/\/)[^/@\s]+:[^/@\s]+@/gi, '$1[REDACTED]@');

  const name = error instanceof Error ? error.name : 'Error';
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  return `${name}${code ? ` (${code})` : ''}: ${message}`;
}

module.exports = safeErrorMessage;
