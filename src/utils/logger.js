/* eslint-disable no-console */
const level = (msg) => new Date().toISOString() + ' ' + msg;

module.exports = {
  info: (...args) => console.log(level('[INFO]'), ...args),
  warn: (...args) => console.warn(level('[WARN]'), ...args),
  error: (...args) => console.error(level('[ERROR]'), ...args),
};
