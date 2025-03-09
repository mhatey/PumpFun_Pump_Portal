import { config } from '../config';
import logger from '../utils/logger';
import { TradingStrategy, WebSocketEvent, TradeRequest, TokenTradeEvent, Position } from '../types';
import { PortfolioManager } from '../core/portfolio';
import { RiskManager } from '../core/riskManager';

/**
 * Position Management Strategy
 * 
 * This strategy monitors open positions and manages exits based on
 * stop loss, take profit, or other criteria.
 */
export class PositionManagementStrategy implements TradingStrategy {
  public name = 'Position Management';
  public description = 'Monitors open positions and manages exits based on stop loss, take profit, or other criteria';
  public isEnabled = true;
  
  private portfolioManager: PortfolioManager;
  private riskManager: RiskManager;
  private currentPrices: Map<string, number> = new Map();
  private lastProcessedTime: Map<string, number> = new Map();
  private minProcessingIntervalMs: number = 1000 * 10; // Only process a token every 10 seconds
  
  /**
   * Initialize the strategy
   */
  constructor(portfolioManager: PortfolioManager, riskManager: RiskManager) {
    this.portfolioManager = portfolioManager;
    this.riskManager = riskManager;
  }
  
  /**
   * Configure the strategy parameters
   */
  public configure(params: Record<string, any>): void {
    if (params.enabled !== undefined) {
      this.isEnabled = Boolean(params.enabled);
    }
    
    if (params.minProcessingIntervalSeconds !== undefined) {
      this.minProcessingIntervalMs = Number(params.minProcessingIntervalSeconds) * 1000;
    }
    
    logger.info(`Position Management Strategy configured: ${JSON.stringify({
      enabled: this.isEnabled,
      minProcessingIntervalSeconds: this.minProcessingIntervalMs / 1000
    })}`);
  }
  
  /**
   * Update the current price for a token
   */
  private updateTokenPrice(mint: string, price: number): void {
    this.currentPrices.set(mint, price);
  }
  
  /**
   * Check if we should process a token (to avoid too frequent checks)
   */
  private shouldProcessToken(mint: string): boolean {
    const now = Date.now();
    const lastProcessed = this.lastProcessedTime.get(mint) || 0;
    
    if (now - lastProcessed < this.minProcessingIntervalMs) {
      return false;
    }
    
    this.lastProcessedTime.set(mint, now);
    return true;
  }
  
  /**
   * Check if we should exit a position based on the position and current price
   */
  private shouldExitPosition(position: Position, currentPrice: number): boolean {
    // Skip if position is already closed
    if (position.status !== 'open') {
      return false;
    }
    
    // Check stop loss
    if (currentPrice <= position.stopLoss) {
      logger.info(`Stop loss triggered for ${position.tokenSymbol} (${position.mint}), current price: ${currentPrice}, stop loss: ${position.stopLoss}`);
      return true;
    }
    
    // Check take profit
    if (currentPrice >= position.takeProfit) {
      logger.info(`Take profit triggered for ${position.tokenSymbol} (${position.mint}), current price: ${currentPrice}, take profit: ${position.takeProfit}`);
      return true;
    }
    
    return false;
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
    const { mint, price } = tokenEvent.data;
    
    // Update price
    this.updateTokenPrice(mint, price);
    
    // Check if we have any open positions for this token
    const position = this.portfolioManager.getOpenPositionForToken(mint);
    if (!position) {
      return false;
    }
    
    // Check if we should process this token now
    if (!this.shouldProcessToken(mint)) {
      return false;
    }
    
    // Check if we should exit the position
    return this.shouldExitPosition(position, price);
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
    const { mint, price } = tokenEvent.data;
    
    // Get the position
    const position = this.portfolioManager.getOpenPositionForToken(mint);
    if (!position) {
      return null;
    }
    
    // Calculate profit/loss percentage
    const pnlPercent = ((price - position.entryPrice) / position.entryPrice) * 100;
    
    // Log the exit reason
    let exitReason = '';
    if (price <= position.stopLoss) {
      exitReason = `Stop loss triggered (${pnlPercent.toFixed(2)}% loss)`;
    } else if (price >= position.takeProfit) {
      exitReason = `Take profit triggered (${pnlPercent.toFixed(2)}% gain)`;
    } else {
      exitReason = `Manual exit (${pnlPercent.toFixed(2)}% ${pnlPercent >= 0 ? 'gain' : 'loss'})`;
    }
    
    // Verify the sell operation against risk rules
    const riskCheck = await this.riskManager.checkTrade('sell', mint, 0); // Amount doesn't matter for sell risk check
    if (!riskCheck.allowed) {
      logger.warn(`Position Management Strategy: Sell rejected for ${position.tokenSymbol} (${mint}): ${riskCheck.reason}`);
      return null;
    }
    
    // Log the exit
    logger.strategy(
      this.name, 
      'SELL', 
      `Exiting ${position.tokenSymbol} (${mint}): ${exitReason}, current price: ${price}, entry price: ${position.entryPrice}`
    );
    
    // Create the trade request (sell 100% of position)
    return {
      action: 'sell',
      mint,
      amount: '100%', // Sell entire position
      denominatedInSol: false, // Amount is percentage of tokens, not SOL
      slippage: config.trading.defaultSlippage,
      priorityFee: config.trading.defaultPriorityFee,
      pool: 'pump',
      skipPreflight: false
    };
  }
  
  /**
   * Update portfolio unrealized PNL with current prices
   */
  public updatePortfolioPnL(): void {
    this.portfolioManager.updateUnrealizedPnl(this.currentPrices);
  }
} 