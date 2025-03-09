import { config } from '../config';
import logger from '../utils/logger';
import { TradingStrategy, WebSocketEvent, TradeRequest, TokenTradeEvent } from '../types';
import { RiskManager } from '../core/riskManager';

/**
 * Momentum Strategy
 * 
 * This strategy detects and trades tokens that are showing strong price momentum
 * based on volume and price action.
 */
export class MomentumStrategy implements TradingStrategy {
  public name = 'Momentum';
  public description = 'Trades tokens showing strong price momentum based on volume and price action';
  public isEnabled = true;
  
  private riskManager: RiskManager;
  private tokenData: Map<string, TokenData> = new Map();
  private lastCleanupTime: number = Date.now();
  private cleanupIntervalMs: number = 1000 * 60 * 5; // 5 minutes
  
  // Strategy parameters
  private minTradeCount: number = 5; // Minimum number of trades to consider momentum
  private timeWindowMs: number = 1000 * 60 * 5; // Look at last 5 minutes of trades
  private minVolumeThreshold: number = 0.5; // Minimum SOL volume in the time window
  private priceIncreaseThreshold: number = 5; // Minimum percentage price increase
  private cooldownPeriodMs: number = 1000 * 60 * 10; // Wait 10 minutes before buying the same token again
  private defaultTradeAmount: number = 0.1; // Default SOL amount to buy
  
  /**
   * Initialize the strategy
   */
  constructor(riskManager: RiskManager) {
    this.riskManager = riskManager;
  }
  
  /**
   * Configure the strategy parameters
   */
  public configure(params: Record<string, any>): void {
    if (params.enabled !== undefined) {
      this.isEnabled = Boolean(params.enabled);
    }
    
    if (params.minTradeCount !== undefined) {
      this.minTradeCount = Number(params.minTradeCount);
    }
    
    if (params.timeWindowMinutes !== undefined) {
      this.timeWindowMs = Number(params.timeWindowMinutes) * 60 * 1000;
    }
    
    if (params.minVolumeThreshold !== undefined) {
      this.minVolumeThreshold = Number(params.minVolumeThreshold);
    }
    
    if (params.priceIncreaseThreshold !== undefined) {
      this.priceIncreaseThreshold = Number(params.priceIncreaseThreshold);
    }
    
    if (params.cooldownPeriodMinutes !== undefined) {
      this.cooldownPeriodMs = Number(params.cooldownPeriodMinutes) * 60 * 1000;
    }
    
    if (params.defaultTradeAmount !== undefined) {
      this.defaultTradeAmount = Number(params.defaultTradeAmount);
    }
    
    logger.info(`Momentum Strategy configured: ${JSON.stringify({
      enabled: this.isEnabled,
      minTradeCount: this.minTradeCount,
      timeWindowMinutes: this.timeWindowMs / (60 * 1000),
      minVolumeThreshold: this.minVolumeThreshold,
      priceIncreaseThreshold: this.priceIncreaseThreshold,
      cooldownPeriodMinutes: this.cooldownPeriodMs / (60 * 1000),
      defaultTradeAmount: this.defaultTradeAmount
    })}`);
  }
  
  /**
   * Clean up old token data to prevent memory leaks
   */
  private cleanupOldData(): void {
    const now = Date.now();
    
    // Only clean up periodically
    if (now - this.lastCleanupTime < this.cleanupIntervalMs) {
      return;
    }
    
    this.lastCleanupTime = now;
    const cutoffTime = now - this.timeWindowMs - (60 * 60 * 1000); // Additional 1 hour buffer
    
    let removedCount = 0;
    for (const [mint, data] of this.tokenData.entries()) {
      // Check if all trades are older than the cutoff time
      const hasRecentTrades = data.trades.some(trade => trade.timestamp > cutoffTime);
      if (!hasRecentTrades) {
        this.tokenData.delete(mint);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.debug(`Momentum Strategy: Cleaned up ${removedCount} tokens with no recent trades`);
    }
  }
  
  /**
   * Update token data with new trade event
   */
  private updateTokenData(event: TokenTradeEvent): void {
    const { mint, action, price, amountSol, trader, timestamp } = event.data;
    
    // Initialize token data if it doesn't exist
    if (!this.tokenData.has(mint)) {
      this.tokenData.set(mint, {
        trades: [],
        lastBuyAttempt: 0,
        symbol: '' // Will be populated when available
      });
    }
    
    const tokenData = this.tokenData.get(mint)!;
    
    // Add the trade
    tokenData.trades.push({
      action,
      price,
      amountSol,
      trader,
      timestamp,
    });
    
    // Sort trades by timestamp (newest first)
    tokenData.trades.sort((a, b) => b.timestamp - a.timestamp);
    
    // Trim to keep a reasonable number of trades
    const maxTradeHistory = 100;
    if (tokenData.trades.length > maxTradeHistory) {
      tokenData.trades = tokenData.trades.slice(0, maxTradeHistory);
    }
    
    // Update token symbol when available
    if (event.data.symbol) {
      tokenData.symbol = event.data.symbol;
    }
  }
  
  /**
   * Check if a token shows momentum based on criteria
   */
  private checkMomentum(mint: string): boolean {
    const data = this.tokenData.get(mint);
    if (!data) {
      return false;
    }
    
    const now = Date.now();
    
    // Skip if we attempted to buy this token recently
    if (now - data.lastBuyAttempt < this.cooldownPeriodMs) {
      return false;
    }
    
    // Get trades in the time window
    const recentTrades = data.trades.filter(trade => 
      now - trade.timestamp < this.timeWindowMs
    );
    
    // Check if we have enough trades
    if (recentTrades.length < this.minTradeCount) {
      return false;
    }
    
    // Calculate total volume
    const totalVolume = recentTrades.reduce((sum, trade) => sum + trade.amountSol, 0);
    if (totalVolume < this.minVolumeThreshold) {
      return false;
    }
    
    // Check price trend
    const oldestPrice = recentTrades[recentTrades.length - 1].price;
    const newestPrice = recentTrades[0].price;
    const priceIncrease = ((newestPrice - oldestPrice) / oldestPrice) * 100;
    
    // Check if price increase meets threshold
    if (priceIncrease < this.priceIncreaseThreshold) {
      return false;
    }
    
    // Update last buy attempt time
    data.lastBuyAttempt = now;
    
    return true;
  }
  
  /**
   * Check if we should trade based on the event
   */
  public shouldTrade(event: WebSocketEvent): boolean {
    // Only process if enabled
    if (!this.isEnabled) {
      return false;
    }
    
    // Only process token trade events
    if (event.type !== 'tokenTrade') {
      return false;
    }
    
    const tokenEvent = event as TokenTradeEvent;
    const { mint } = tokenEvent.data;
    
    // Update our data for this token
    this.updateTokenData(tokenEvent);
    
    // Clean up old data periodically
    this.cleanupOldData();
    
    // Check if token shows momentum
    return this.checkMomentum(mint);
  }
  
  /**
   * Get the trade request for this event
   */
  public async getTrade(event: WebSocketEvent): Promise<TradeRequest | null> {
    // Validate event type again just to be safe
    if (event.type !== 'tokenTrade') {
      return null;
    }
    
    const tokenEvent = event as TokenTradeEvent;
    const { mint } = tokenEvent.data;
    const tokenData = this.tokenData.get(mint);
    
    if (!tokenData) {
      return null;
    }
    
    // Determine optimal trade size
    let tradeAmount: number;
    try {
      // Use risk manager to determine optimal trade size
      tradeAmount = await this.riskManager.getOptimalTradeSize(mint);
      
      // If below threshold, use the default amount
      if (tradeAmount === 0) {
        tradeAmount = this.defaultTradeAmount;
      }
      
      // Verify the trade against risk rules
      const riskCheck = await this.riskManager.checkTrade('buy', mint, tradeAmount);
      if (!riskCheck.allowed) {
        logger.warn(`Momentum Strategy: Trade rejected for ${mint}: ${riskCheck.reason}`);
        return null;
      }
    } catch (error) {
      logger.error(`Momentum Strategy: Error determining trade size for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
    
    // Calculate price information for logging
    const recentTrades = tokenData.trades.filter(
      trade => Date.now() - trade.timestamp < this.timeWindowMs
    );
    const oldestPrice = recentTrades[recentTrades.length - 1].price;
    const newestPrice = recentTrades[0].price;
    const priceIncrease = ((newestPrice - oldestPrice) / oldestPrice) * 100;
    const totalVolume = recentTrades.reduce((sum, trade) => sum + trade.amountSol, 0);
    
    // Get symbol for logging
    const symbol = tokenData.symbol || mint.substring(0, 8);
    
    // Log the momentum detection
    logger.strategy(
      this.name, 
      'BUY', 
      `Momentum detected for ${symbol} (${mint}): ${priceIncrease.toFixed(2)}% increase, ${totalVolume.toFixed(2)} SOL volume, buying with ${tradeAmount} SOL`
    );
    
    // Create the trade request
    return {
      action: 'buy',
      mint,
      amount: tradeAmount,
      denominatedInSol: true,
      slippage: config.trading.defaultSlippage,
      priorityFee: config.trading.defaultPriorityFee,
      pool: 'pump',
      skipPreflight: false
    };
  }
}

// Interface to store token data
interface TokenData {
  trades: TokenTrade[];
  lastBuyAttempt: number;
  symbol: string;
}

// Interface to store trade information
interface TokenTrade {
  action: 'buy' | 'sell';
  price: number;
  amountSol: number;
  trader: string;
  timestamp: number;
} 