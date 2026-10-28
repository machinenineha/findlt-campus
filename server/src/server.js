const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const server = app.listen(config.port, () => {
  logger.info(`RouteReady Campus Server running on port ${config.port} (${config.nodeEnv})`);
  logger.info(`Database mode: ${config.isDemoMode ? 'Demonstration Store' : 'Supabase Live'}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing HTTP server gracefully.');
  server.close(() => {
    logger.info('HTTP server closed.');
  });
});

module.exports = server;

