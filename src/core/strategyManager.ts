import { TradingStrategy, WebSocketEvent, TradeRequest } from '../types';
import logger from '../utils/logger';

/**
 * Strategy Manager
 * 
 * Manages a collection of trading strategies and coordinates their execution.
 */
export class StrategyManager {
  private strategies: TradingStrategy[] = [];
  
  /**
   * Register a strategy with the manager
   */
  public registerStrategy(strategy: TradingStrategy): void {
    this.strategies.push(strategy);
    logger.info(`Strategy registered: ${strategy.name} - ${strategy.description}`);
  }
  
  /**
   * Get all registered strategies
   */
  public getStrategies(): TradingStrategy[] {
    return [...this.strategies];
  }
  
  /**
   * Get enabled strategies
   */
  public getEnabledStrategies(): TradingStrategy[] {
    return this.strategies.filter(strategy => strategy.isEnabled);
  }
  
  /**
   * Process an event through all enabled strategies
   * Returns the first trade request that should be executed, or null if no trades
   */
  public async processEvent(event: WebSocketEvent): Promise<{
    strategy: TradingStrategy;
    tradeRequest: TradeRequest;
  } | null> {
    const enabledStrategies = this.getEnabledStrategies();
    
    for (const strategy of enabledStrategies) {
      try {
        // Check if the strategy should trade based on this event
        if (strategy.shouldTrade(event)) {
          // Get the trade request from the strategy
          const tradeRequest = await strategy.getTrade(event);
          
          if (tradeRequest) {
            logger.debug(`Strategy ${strategy.name} generated trade: ${JSON.stringify(tradeRequest)}`);
            return { strategy, tradeRequest };
          }
        }
      } catch (error) {
        logger.error(`Error processing event with strategy ${strategy.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return null;
  }
  
  /**
   * Configure a specific strategy by name
   */
  public configureStrategy(name: string, params: Record<string, any>): boolean {
    const strategy = this.strategies.find(s => s.name === name);
    
    if (!strategy) {
      logger.warn(`Cannot configure strategy: ${name} not found`);
      return false;
    }
    
    try {
      strategy.configure(params);
      logger.info(`Strategy ${name} configured with: ${JSON.stringify(params)}`);
      return true;
    } catch (error) {
      logger.error(`Error configuring strategy ${name}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Enable or disable a strategy by name
   */
  public setStrategyEnabled(name: string, enabled: boolean): boolean {
    const strategy = this.strategies.find(s => s.name === name);
    
    if (!strategy) {
      logger.warn(`Cannot ${enabled ? 'enable' : 'disable'} strategy: ${name} not found`);
      return false;
    }
    
    strategy.isEnabled = enabled;
    logger.info(`Strategy ${name} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }
  
  /**
   * Get a strategy by name
   */
  public getStrategy(name: string): TradingStrategy | undefined {
    return this.strategies.find(s => s.name === name);
  }
} 