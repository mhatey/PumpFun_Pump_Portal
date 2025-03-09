import dotenv from 'dotenv';
import { BotConfig } from '../types';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Function to validate that required environment variables are set
const validateEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set.`);
  }
  return value || '';
};

// Parse a numeric environment variable
const parseNumericEnv = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const numValue = Number(value);
  if (isNaN(numValue)) {
    throw new Error(`Environment variable ${key} must be a number.`);
  }
  return numValue;
};

// Create and return the configuration object
export const loadConfig = (): BotConfig => {
  // Ensure log directory exists
  const logFilePath = validateEnv('LOG_FILE_PATH', 'logs/bot.log');
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return {
    wallet: {
      privateKey: validateEnv('WALLET_PRIVATE_KEY'),
      publicKey: validateEnv('WALLET_PUBLIC_KEY'),
    },
    api: {
      pumpPortalApiKey: validateEnv('PUMPPORTAL_API_KEY'),
      rpcEndpoint: validateEnv('RPC_ENDPOINT', 'https://api.mainnet-beta.solana.com'),
    },
    trading: {
      defaultSlippage: parseNumericEnv('DEFAULT_SLIPPAGE', 1),
      defaultPriorityFee: parseNumericEnv('DEFAULT_PRIORITY_FEE', 0.00001),
      maxTradeAmountSol: parseNumericEnv('MAX_TRADE_AMOUNT_SOL', 0.5),
      minTradeAmountSol: parseNumericEnv('MIN_TRADE_AMOUNT_SOL', 0.01),
      stopLossPercentage: parseNumericEnv('STOP_LOSS_PERCENTAGE', 10),
      takeProfitPercentage: parseNumericEnv('TAKE_PROFIT_PERCENTAGE', 20),
    },
    riskManagement: {
      maxDailyTradingVolume: parseNumericEnv('MAX_DAILY_TRADING_VOLUME', 5),
      maxPositionSizePercentage: parseNumericEnv('MAX_POSITION_SIZE_PERCENTAGE', 5),
    },
    logging: {
      level: validateEnv('LOG_LEVEL', 'info'),
      filePath: logFilePath,
    },
    websocket: {
      reconnectInterval: parseNumericEnv('WS_RECONNECT_INTERVAL', 5000),
      maxReconnectAttempts: parseNumericEnv('MAX_RECONNECT_ATTEMPTS', 10),
    },
  };
};

// Export the config as a singleton
export const config = loadConfig(); 