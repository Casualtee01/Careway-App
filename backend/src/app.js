const cors = require('cors');
const cookieParser = require('cookie-parser');
const express = require('express');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => new URL(origin).origin);

app.use(helmet());
app.use(cors({
	origin(origin, callback) {
		if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
		const error = new Error('Origin is not allowed by CORS');
		error.statusCode = 403;
		return callback(error);
	},
	credentials: true
}));
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(mongoSanitize());
app.use(morgan(':method :status :response-time ms'));
app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;