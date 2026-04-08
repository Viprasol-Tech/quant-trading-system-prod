import winston, { Logger } from 'winston';
import * as fs from 'fs';
import * as path from 'path';

const logsDir = path.join(process.cwd(), 'logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    ({ level, message, timestamp, context, stack }) => {
      const contextStr = context ? ` [${context}]` : '';
      const stackStr = stack ? `\n${stack}` : '';
      return `${timestamp} ${level}${contextStr}: ${message}${stackStr}`;
    }
  )
);

const transports = [
  // Console output
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format
    )
  }),
  // File output
  new winston.transports.File({
    filename: path.join(logsDir, 'trading.log'),
    format,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10
  }),
  // Error file
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format
  })
];

const logger: Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports
});

export { logger };
