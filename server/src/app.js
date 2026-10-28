const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const config = require('./config');
const { authenticate } = require('./middleware/auth');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const healthRoutes = require('./routes/health');
const publicRoutes = require('./routes/publicRoutes');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://cdn.jsdelivr.net'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://fonts.googleapis.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://unpkg.com'],
        connectSrc: ["'self'", 'https://*.supabase.co', config.frontendUrl]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || origin === config.frontendUrl || origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000' || origin === 'http://localhost:5500') {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/demo
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// General Rate Limiting
app.use('/api/', generalLimiter);

// Authenticate token on every request (sets req.user if valid token provided)
app.use(authenticate);

// API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1', publicRoutes);
app.use('/api/v1/me', studentRoutes);
app.use('/api/v1/admin', adminRoutes);

// Serve static frontend assets
const clientPath = path.resolve(__dirname, '../../client');
app.use(express.static(clientPath));

// Fallback for SPA routing if requested
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(clientPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

