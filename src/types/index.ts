// Configuration interfaces
export interface BotConfig {
  wallet: WalletConfig;
  api: ApiConfig;
  trading: TradingConfig;
  riskManagement: RiskManagementConfig;
  logging: LoggingConfig;
  websocket: WebSocketConfig;
}

export interface WalletConfig {
  privateKey: string;
  publicKey: string;
}

export interface ApiConfig {
  pumpPortalApiKey: string;
  rpcEndpoint: string;
}

export interface TradingConfig {
  defaultSlippage: number;
  defaultPriorityFee: number;
  maxTradeAmountSol: number;
  minTradeAmountSol: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
}

export interface RiskManagementConfig {
  maxDailyTradingVolume: number;
  maxPositionSizePercentage: number;
}

export interface LoggingConfig {
  level: string;
  filePath: string;
}

export interface WebSocketConfig {
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

// API interfaces
export interface TradeRequest {
  action: 'buy' | 'sell';
  mint: string;
  amount: number | string;
  denominatedInSol: boolean;
  slippage: number;
  priorityFee: number;
  pool?: 'pump' | 'raydium' | 'auto';
  skipPreflight?: boolean;
  jitoOnly?: boolean;
}

export interface LocalTradeRequest extends TradeRequest {
  publicKey: string;
}

export interface TradeResponse {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  supply: number;
  createdAt: Date;
  creatorAddress: string;
}

// WebSocket message interfaces
export type WebSocketMethod = 
  | 'subscribeNewToken'
  | 'subscribeTokenTrade'
  | 'subscribeAccountTrade'
  | 'subscribeRaydiumLiquidity'
  | 'unsubscribeNewToken'
  | 'unsubscribeTokenTrade'
  | 'unsubscribeAccountTrade';

export interface WebSocketMessage {
  method: WebSocketMethod;
  keys?: string[];
}

export interface WebSocketEvent {
  type: string;
  data: any;
}

export interface NewTokenEvent {
  type: 'newToken';
  data: {
    mint: string;
    name: string;
    symbol: string;
    createdAt: number;
    creatorAddress: string;
  };
}

export interface TokenTradeEvent {
  type: 'tokenTrade';
  data: {
    mint: string;
    action: 'buy' | 'sell';
    price: number;
    amountSol: number;
    trader: string;
    signature: string;
    timestamp: number;
    symbol?: string;
  };
}

// Trading strategy interfaces
export interface TradingStrategy {
  name: string;
  description: string;
  isEnabled: boolean;
  configure(params: Record<string, any>): void;
  shouldTrade(event: WebSocketEvent): boolean;
  getTrade(event: WebSocketEvent): Promise<TradeRequest | null> | TradeRequest | null;
}

// Portfolio and position tracking
export interface Position {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  entryPrice: number;
  amount: number;
  timestamp: number;
  stopLoss: number;
  takeProfit: number;
  status: 'open' | 'closed';
  exitPrice?: number;
  pnl?: number;
}

export interface Portfolio {
  positions: Position[];
  totalInvestedSol: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

// Risk management
export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
}

// Simulation interfaces
export interface SimulationResult {
  success: boolean;
  error?: string;
  expectedOutput?: {
    tokenAmount?: number;
    solAmount?: number;
    priceImpact?: number;
  };
} 