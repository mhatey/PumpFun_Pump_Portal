import fs from 'fs';
import path from 'path';
import { Portfolio, Position, TokenInfo } from '../types';
import logger from '../utils/logger';

// Class to manage trading portfolio and positions
export class PortfolioManager {
  private portfolio: Portfolio;
  private readonly portfolioFile: string;
  
  /**
   * Initialize portfolio manager
   */
  constructor(dataDir: string = 'data') {
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.portfolioFile = path.join(dataDir, 'portfolio.json');
    this.portfolio = this.loadPortfolio();
  }
  
  /**
   * Load portfolio from disk, or create a new one if it doesn't exist
   */
  private loadPortfolio(): Portfolio {
    try {
      if (fs.existsSync(this.portfolioFile)) {
        const data = fs.readFileSync(this.portfolioFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error(`Error loading portfolio: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Return default portfolio if file doesn't exist or there's an error
    return {
      positions: [],
      totalInvestedSol: 0,
      realizedPnl: 0,
      unrealizedPnl: 0
    };
  }
  
  /**
   * Save portfolio to disk
   */
  private savePortfolio(): void {
    try {
      fs.writeFileSync(this.portfolioFile, JSON.stringify(this.portfolio, null, 2));
    } catch (error) {
      logger.error(`Error saving portfolio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get the full portfolio
   */
  public getPortfolio(): Portfolio {
    return { ...this.portfolio };
  }
  
  /**
   * Get all positions
   */
  public getPositions(): Position[] {
    return [...this.portfolio.positions];
  }
  
  /**
   * Get open positions
   */
  public getOpenPositions(): Position[] {
    return this.portfolio.positions.filter(position => position.status === 'open');
  }
  
  /**
   * Get positions for a specific token
   */
  public getPositionsForToken(mint: string): Position[] {
    return this.portfolio.positions.filter(position => position.mint === mint);
  }
  
  /**
   * Get open position for a specific token
   */
  public getOpenPositionForToken(mint: string): Position | null {
    const openPositions = this.portfolio.positions.filter(
      position => position.mint === mint && position.status === 'open'
    );
    return openPositions.length > 0 ? openPositions[0] : null;
  }
  
  /**
   * Add a new position when buying a token
   */
  public addPosition(
    mint: string,
    tokenName: string,
    tokenSymbol: string,
    entryPrice: number,
    amount: number,
    amountSol: number,
    stopLossPercentage: number,
    takeProfitPercentage: number
  ): Position {
    // Check if there's already an open position for this token
    const existingPosition = this.getOpenPositionForToken(mint);
    
    if (existingPosition) {
      // Update existing position (dollar cost averaging)
      const totalTokens = existingPosition.amount + amount;
      const totalCost = (existingPosition.amount * existingPosition.entryPrice) + amountSol;
      
      // Calculate new average entry price
      existingPosition.entryPrice = totalCost / totalTokens;
      existingPosition.amount = totalTokens;
      
      // Update stop loss and take profit levels
      existingPosition.stopLoss = existingPosition.entryPrice * (1 - stopLossPercentage / 100);
      existingPosition.takeProfit = existingPosition.entryPrice * (1 + takeProfitPercentage / 100);
      
      logger.info(`Updated position for ${tokenSymbol} (${mint}), new amount: ${totalTokens}, new entry price: ${existingPosition.entryPrice}`);
      
      this.savePortfolio();
      return existingPosition;
    } else {
      // Create new position
      const newPosition: Position = {
        mint,
        tokenName,
        tokenSymbol,
        entryPrice,
        amount,
        timestamp: Date.now(),
        stopLoss: entryPrice * (1 - stopLossPercentage / 100),
        takeProfit: entryPrice * (1 + takeProfitPercentage / 100),
        status: 'open'
      };
      
      this.portfolio.positions.push(newPosition);
      this.portfolio.totalInvestedSol += amountSol;
      
      logger.info(`Opened new position for ${tokenSymbol} (${mint}), amount: ${amount}, entry price: ${entryPrice}`);
      
      this.savePortfolio();
      return newPosition;
    }
  }
  
  /**
   * Close a position when selling a token
   */
  public closePosition(
    mint: string,
    exitPrice: number,
    amountSold: number,
    soldPercentage: number
  ): Position | null {
    const position = this.getOpenPositionForToken(mint);
    
    if (!position) {
      logger.warn(`Attempted to close position for ${mint}, but no open position exists`);
      return null;
    }
    
    // Calculate realized PNL
    const entryValueSol = position.entryPrice * amountSold;
    const exitValueSol = exitPrice * amountSold;
    const pnl = exitValueSol - entryValueSol;
    
    if (soldPercentage >= 100 || amountSold >= position.amount) {
      // Fully closed position
      position.status = 'closed';
      position.exitPrice = exitPrice;
      position.pnl = pnl;
      
      this.portfolio.realizedPnl += pnl;
      
      logger.info(`Closed position for ${position.tokenSymbol} (${mint}), exit price: ${exitPrice}, PNL: ${pnl}`);
    } else {
      // Partially closed position
      position.amount -= amountSold;
      
      // Record partial profit
      this.portfolio.realizedPnl += pnl;
      
      logger.info(`Partially closed position for ${position.tokenSymbol} (${mint}), sold: ${amountSold}, remaining: ${position.amount}, PNL: ${pnl}`);
    }
    
    this.savePortfolio();
    return position;
  }
  
  /**
   * Update unrealized PNL based on current token prices
   */
  public updateUnrealizedPnl(tokenPrices: Map<string, number>): void {
    let totalUnrealizedPnl = 0;
    
    for (const position of this.getOpenPositions()) {
      const currentPrice = tokenPrices.get(position.mint);
      
      if (currentPrice) {
        const entryValue = position.entryPrice * position.amount;
        const currentValue = currentPrice * position.amount;
        const positionPnl = currentValue - entryValue;
        
        totalUnrealizedPnl += positionPnl;
      }
    }
    
    this.portfolio.unrealizedPnl = totalUnrealizedPnl;
    this.savePortfolio();
  }
  
  /**
   * Calculate total portfolio value (invested + unrealized PNL)
   */
  public getTotalValue(): number {
    return this.portfolio.totalInvestedSol + this.portfolio.unrealizedPnl;
  }
  
  /**
   * Check if any positions need to be closed based on stop loss or take profit levels
   */
  public checkPositionsForExitSignals(tokenPrices: Map<string, number>): Position[] {
    const positionsToExit: Position[] = [];
    
    for (const position of this.getOpenPositions()) {
      const currentPrice = tokenPrices.get(position.mint);
      
      if (currentPrice) {
        // Check stop loss
        if (currentPrice <= position.stopLoss) {
          logger.info(`Stop loss triggered for ${position.tokenSymbol} (${position.mint}), current price: ${currentPrice}, stop loss: ${position.stopLoss}`);
          positionsToExit.push(position);
        }
        
        // Check take profit
        if (currentPrice >= position.takeProfit) {
          logger.info(`Take profit triggered for ${position.tokenSymbol} (${position.mint}), current price: ${currentPrice}, take profit: ${position.takeProfit}`);
          positionsToExit.push(position);
        }
      }
    }
    
    return positionsToExit;
  }
} 