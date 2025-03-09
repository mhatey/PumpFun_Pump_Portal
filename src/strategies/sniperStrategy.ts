import { config } from '../config';
import logger from '../utils/logger';
import { TradingStrategy, WebSocketEvent, TradeRequest, NewTokenEvent } from '../types';
import { RiskManager } from '../core/riskManager';

/**
 * Sniper Strategy
 * 
 * This strategy monitors for newly created tokens and quickly buys them
 * based on configurable criteria.
 */
export class SniperStrategy implements TradingStrategy {
  public name = 'Sniper';
  public description = 'Quickly buys newly created tokens based on configurable criteria';
  public isEnabled = true;
  
  private riskManager: RiskManager;
  private maxAgeMs: number = 30000; // Default: consider tokens created in the last 30 seconds
  private blockedCreators: Set<string> = new Set();
  private blockedPhrases: string[] = [];
  private minTradeAmount: number = config.trading.minTradeAmountSol;
  private defaultTradeAmount: number = 0.1; // Default SOL amount to buy
  private processed: Set<string> = new Set(); // Track processed tokens to avoid duplicates
  
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
    
    if (params.maxAgeSeconds !== undefined) {
      this.maxAgeMs = Number(params.maxAgeSeconds) * 1000;
    }
    
    if (params.blockedCreators !== undefined && Array.isArray(params.blockedCreators)) {
      this.blockedCreators = new Set(params.blockedCreators);
    }
    
    if (params.blockedPhrases !== undefined && Array.isArray(params.blockedPhrases)) {
      this.blockedPhrases = params.blockedPhrases;
    }
    
    if (params.defaultTradeAmount !== undefined) {
      this.defaultTradeAmount = Number(params.defaultTradeAmount);
    }
    
    logger.info(`Sniper Strategy configured: ${JSON.stringify({
      enabled: this.isEnabled,
      maxAgeSeconds: this.maxAgeMs / 1000,
      blockedCreatorsCount: this.blockedCreators.size,
      blockedPhrasesCount: this.blockedPhrases.length,
      defaultTradeAmount: this.defaultTradeAmount
    })}`);
  }
  
  /**
   * Check if we should trade based on the event
   */
  public shouldTrade(event: WebSocketEvent): boolean {
    // Only process if enabled
    if (!this.isEnabled) {
      return false;
    }
    
    // Only process new token events
    if (event.type !== 'newToken') {
      return false;
    }
    
    const tokenEvent = event as NewTokenEvent;
    const { mint, name, symbol, createdAt, creatorAddress } = tokenEvent.data;
    
    // Skip if already processed
    if (this.processed.has(mint)) {
      return false;
    }
    
    // Check token age
    const ageMs = Date.now() - createdAt;
    if (ageMs > this.maxAgeMs) {
      logger.debug(`Sniper Strategy: Token ${symbol} (${mint}) is too old (${ageMs / 1000}s)`);
      return false;
    }
    
    // Check if creator is blocked
    if (this.blockedCreators.has(creatorAddress)) {
      logger.debug(`Sniper Strategy: Token ${symbol} (${mint}) creator ${creatorAddress} is blocked`);
      return false;
    }
    
    // Check for blocked phrases in name or symbol
    const tokenText = `${name.toLowerCase()} ${symbol.toLowerCase()}`;
    for (const phrase of this.blockedPhrases) {
      if (tokenText.includes(phrase.toLowerCase())) {
        logger.debug(`Sniper Strategy: Token ${symbol} (${mint}) contains blocked phrase '${phrase}'`);
        return false;
      }
    }
    
    // Mark as processed to avoid duplicates
    this.processed.add(mint);
    
    logger.debug(`Sniper Strategy: Token ${symbol} (${mint}) passes initial checks`);
    return true;
  }
  
  /**
   * Get the trade request for this event
   */
  public async getTrade(event: WebSocketEvent): Promise<TradeRequest | null> {
    // Validate event type again just to be safe
    if (event.type !== 'newToken') {
      return null;
    }
    
    const tokenEvent = event as NewTokenEvent;
    const { mint, name, symbol } = tokenEvent.data;
    
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
        logger.warn(`Sniper Strategy: Trade rejected for ${symbol} (${mint}): ${riskCheck.reason}`);
        return null;
      }
    } catch (error) {
      logger.error(`Sniper Strategy: Error determining trade size for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
    
    // Log the sniping attempt
    logger.strategy(
      this.name, 
      'BUY', 
      `New token ${symbol} (${mint}) detected, buying with ${tradeAmount} SOL`
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