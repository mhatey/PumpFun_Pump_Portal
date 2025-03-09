import winston from 'winston';
import { config } from '../config';

// Create a custom format that combines timestamp, colorization, and formatted message
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => {
    return `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message}`;
  })
);

// Console transport with colors
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    customFormat
  )
});

// File transport for logs
const fileTransport = new winston.transports.File({
  filename: config.logging.filePath,
  format: customFormat
});

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  transports: [
    consoleTransport,
    fileTransport
  ]
});

// Export logger functions
export default {
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  error: (message: string, meta?: any) => logger.error(message, meta),
  
  // Function to log trade events with important details 
  trade: (action: string, token: string, amount: number, price: number, success: boolean) => {
    const status = success ? 'SUCCESS' : 'FAILED';
    logger.info(
      `TRADE [${status}] | ${action.toUpperCase()} | Token: ${token} | Amount: ${amount} | Price: ${price}`
    );
  },

  // Function to log portfolio updates
  portfolio: (totalValue: number, realizedPnl: number, unrealizedPnl: number) => {
    logger.info(
      `PORTFOLIO | Total Value: ${totalValue} SOL | Realized P&L: ${realizedPnl} SOL | Unrealized P&L: ${unrealizedPnl} SOL`
    );
  },

  // Function to log strategy triggers
  strategy: (name: string, action: string, reason: string) => {
    logger.info(`STRATEGY | ${name} | ${action} | Reason: ${reason}`);
  }
}; 