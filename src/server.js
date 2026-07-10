const http = require('http');
const app = require('./app');
const env = require('./config/env');
const initSocket = require('./socket');
const logger = require('./utils/logger');

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, () => {
  logger.info(`DS Footwear ERP backend listening on port ${env.port} (${env.nodeEnv}), API prefix ${env.apiPrefix}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection', err);
});
