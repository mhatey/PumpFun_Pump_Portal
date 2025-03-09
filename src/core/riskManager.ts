import { config } from '../config';
import logger from '../utils/logger';
import { Wallet } from './wallet';
import { PortfolioManager } from './portfolio';
import { RiskCheckResult } from '../types';

// Class to manage trading risks
export class RiskManager {
  private wallet: Wallet;
  private portfolioManager: PortfolioManager;
  private dailyTradingVolume: number = 0;
  private dailyResetTimestamp: number = 0;
  
  /**
   * Initialize risk manager
   */
  constructor(wallet: Wallet, portfolioManager: PortfolioManager) {
    this.wallet = wallet;
    this.portfolioManager = portfolioManager;
    this.resetDailyVolume();
  }
  
  /**
   * Reset daily trading volume tracking
   */
  private resetDailyVolume(): void {
    this.dailyTradingVolume = 0;
    
    // Set next reset time to midnight UTC
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    this.dailyResetTimestamp = tomorrow.getTime();
    logger.debug(`Daily trading volume reset. Next reset at ${tomorrow.toISOString()}`);
  }
  
  /**
   * Check if we need to reset daily volume
   */
  private checkDailyReset(): void {
    const now = Date.now();
    if (now >= this.dailyResetTimestamp) {
      this.resetDailyVolume();
    }
  }
  
  /**
   * Track trading volume
   */
  public trackTradeVolume(solAmount: number): void {
    this.checkDailyReset();
    this.dailyTradingVolume += solAmount;
    logger.debug(`Daily trading volume increased by ${solAmount} SOL to ${this.dailyTradingVolume} SOL`);
  }
  
  /**
   * Get current daily trading volume
   */
  public getDailyTradingVolume(): number {
    this.checkDailyReset();
    return this.dailyTradingVolume;
  }
  
  /**
   * Check trade against risk management rules
   */
  public async checkTrade(
    action: 'buy' | 'sell',
    mint: string,
    solAmount: number
  ): Promise<RiskCheckResult> {
    this.checkDailyReset();
    
    // Check wallet balance for buys
    if (action === 'buy') {
      const balance = await this.wallet.getBalance();
      
      // Ensure sufficient balance (including a buffer for gas)
      const gasFeeBuffer = 0.01; // SOL reserved for gas fees
      if (balance < solAmount + gasFeeBuffer) {
        return {
          allowed: false,
          reason: `Insufficient balance: ${balance} SOL available, ${solAmount + gasFeeBuffer} SOL needed`
        };
      }
      
      // Check if trade exceeds daily volume limit
      if (this.dailyTradingVolume + solAmount > config.riskManagement.maxDailyTradingVolume) {
        return {
          allowed: false,
          reason: `Trade would exceed daily volume limit of ${config.riskManagement.maxDailyTradingVolume} SOL`
        };
      }
      
      // Check if trade amount is too small
      if (solAmount < config.trading.minTradeAmountSol) {
        return {
          allowed: false,
          reason: `Trade amount ${solAmount} SOL is below minimum of ${config.trading.minTradeAmountSol} SOL`
        };
      }
      
      // Check if trade amount is too large
      if (solAmount > config.trading.maxTradeAmountSol) {
        return {
          allowed: false,
          reason: `Trade amount ${solAmount} SOL exceeds maximum of ${config.trading.maxTradeAmountSol} SOL`
        };
      }
      
      // Check position size limit as percentage of portfolio
      const portfolioValue = this.portfolioManager.getTotalValue();
      const maxPositionSize = portfolioValue * (config.riskManagement.maxPositionSizePercentage / 100);
      
      if (solAmount > maxPositionSize) {
        return {
          allowed: false,
          reason: `Position size ${solAmount} SOL exceeds max allowed (${config.riskManagement.maxPositionSizePercentage}% of portfolio = ${maxPositionSize} SOL)`
        };
      }
    } else if (action === 'sell') {
      // For sells, check if we have the token
      const hasToken = await this.wallet.hasToken(mint);
      if (!hasToken) {
        return {
          allowed: false,
          reason: `Cannot sell token ${mint}: not found in wallet`
        };
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * Determine optimal trade size based on risk parameters
   */
  public async getOptimalTradeSize(mint: string): Promise<number> {
    // Get wallet balance
    const balance = await this.wallet.getBalance();
    
    // Calculate available balance for trading (keeping buffer for gas)
    const gasFeeBuffer = 0.01;
    const availableBalance = Math.max(0, balance - gasFeeBuffer);
    
    // Determine max trade size based on risk parameters
    const portfolioValue = this.portfolioManager.getTotalValue();
    const maxPositionSize = portfolioValue * (config.riskManagement.maxPositionSizePercentage / 100);
    
    // Get remaining daily volume allowance
    const remainingDailyAllowance = config.riskManagement.maxDailyTradingVolume - this.getDailyTradingVolume();
    
    // Calculate optimal size based on the most restrictive constraint
    let optimalSize = Math.min(
      availableBalance,
      maxPositionSize,
      remainingDailyAllowance,
      config.trading.maxTradeAmountSol
    );
    
    // Ensure minimum trade size
    if (optimalSize < config.trading.minTradeAmountSol) {
      logger.warn(`Optimal trade size ${optimalSize} SOL is below minimum. Setting to zero.`);
      return 0;
    }
    
    // Check if token already in portfolio for DCA considerations
    const position = this.portfolioManager.getOpenPositionForToken(mint);
    if (position) {
      // For existing positions, consider a smaller position increase (e.g., 50% of optimal)
      optimalSize = optimalSize * 0.5;
      logger.debug(`Reducing trade size for existing position ${mint} to ${optimalSize} SOL`);
    }
    
    logger.debug(`Calculated optimal trade size: ${optimalSize} SOL for ${mint}`);
    return optimalSize;
  }
} 