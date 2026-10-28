function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let statusCode = error.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = statusCode >= 500 ? 'Internal server error' : error.message;
  let errors = error.errors || [];

  if (error.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists';
  } else if (error.name === 'ValidationError') {
    statusCode = 422;
    message = 'Request validation failed';
    errors = Object.values(error.errors).map(({ path, message: detail }) => ({ field: path, message: detail }));
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  }

  if (statusCode >= 500) {
    if (process.env.NODE_ENV === 'development') console.error(error);
    else console.error('Request failed:', error.name || 'Error');
  }
  res.status(statusCode).json({ success: false, message, errors });
}

module.exports = errorHandler;