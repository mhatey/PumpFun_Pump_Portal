import { config } from './config';
import logger from './utils/logger';
import { WebSocketClient } from './api/websocketClient';
import { Wallet } from './core/wallet';
import { PortfolioManager } from './core/portfolio';
import { RiskManager } from './core/riskManager';
import { StrategyManager } from './core/strategyManager';
import { SniperStrategy } from './strategies/sniperStrategy';
import { MomentumStrategy } from './strategies/momentumStrategy';
import { PositionManagementStrategy } from './strategies/positionManagementStrategy';
import { executeTrade } from './api/pumpPortalApi';
import { WebSocketEvent } from './types';

// Create a class to manage the trading bot
class TradingBot {
  private wsClient: WebSocketClient;
  private wallet: Wallet;
  private portfolioManager: PortfolioManager;
  private riskManager: RiskManager;
  private strategyManager: StrategyManager;
  private isRunning: boolean = false;
  private tokenPrices: Map<string, number> = new Map();
  
  constructor() {
    // Initialize core components
    this.wallet = new Wallet();
    this.portfolioManager = new PortfolioManager();
    this.riskManager = new RiskManager(this.wallet, this.portfolioManager);
    this.strategyManager = new StrategyManager();
    this.wsClient = new WebSocketClient();
    
    // Register strategies
    this.registerStrategies();
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  /**
   * Register trading strategies
   */
  private registerStrategies(): void {
    // Sniper strategy for new tokens
    const sniperStrategy = new SniperStrategy(this.riskManager);
    this.strategyManager.registerStrategy(sniperStrategy);
    
    // Momentum strategy for tokens with strong price action
    const momentumStrategy = new MomentumStrategy(this.riskManager);
    this.strategyManager.registerStrategy(momentumStrategy);
    
    // Position management strategy for exits
    const positionManagementStrategy = new PositionManagementStrategy(
      this.portfolioManager,
      this.riskManager
    );
    this.strategyManager.registerStrategy(positionManagementStrategy);
    
    logger.info('Trading strategies registered');
  }
  
  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    // Handle all WebSocket events
    this.wsClient.on('message', this.handleEvent.bind(this));
    
    // Handle token trade events for price tracking
    this.wsClient.on('tokenTrade', (event: WebSocketEvent) => {
      if (event.type === 'tokenTrade') {
        const { mint, price } = event.data;
        this.tokenPrices.set(mint, price);
      }
    });
    
    logger.info('Event handlers set up');
  }
  
  /**
   * Handle incoming WebSocket events
   */
  private async handleEvent(event: WebSocketEvent): Promise<void> {
    try {
      // Process the event through the strategy manager
      const result = await this.strategyManager.processEvent(event);
      
      if (result) {
        const { strategy, tradeRequest } = result;
        
        logger.info(`Executing trade from ${strategy.name} strategy: ${JSON.stringify(tradeRequest)}`);
        
        // Execute the trade
        const tradeResponse = await executeTrade(tradeRequest);
        
        if (tradeResponse.success) {
          logger.trade(
            tradeRequest.action,
            tradeRequest.mint,
            typeof tradeRequest.amount === 'number' ? tradeRequest.amount : 0,
            this.tokenPrices.get(tradeRequest.mint) || 0,
            true
          );
          
          // Track trading volume for buys
          if (tradeRequest.action === 'buy' && typeof tradeRequest.amount === 'number' && tradeRequest.denominatedInSol) {
            this.riskManager.trackTradeVolume(tradeRequest.amount);
          }
          
          // Update portfolio for buys
          if (tradeRequest.action === 'buy' && tradeRequest.denominatedInSol) {
            const price = this.tokenPrices.get(tradeRequest.mint) || 0;
            const amount = typeof tradeRequest.amount === 'number' ? tradeRequest.amount : 0;
            
            if (price > 0) {
              // Calculate token amount (approximate)
              const tokenAmount = amount / price;
              
              // Add position to portfolio
              this.portfolioManager.addPosition(
                tradeRequest.mint,
                tradeRequest.mint.substring(0, 8), // Use shortened mint as name if we don't have it
                tradeRequest.mint.substring(0, 4), // Use shortened mint as symbol if we don't have it
                price,
                tokenAmount,
                amount,
                config.trading.stopLossPercentage,
                config.trading.takeProfitPercentage
              );
            }
          }
          
          // Update portfolio for sells
          if (tradeRequest.action === 'sell') {
            const price = this.tokenPrices.get(tradeRequest.mint) || 0;
            
            if (price > 0) {
              // Get token amount from wallet
              const tokenBalance = await this.wallet.getTokenBalance(tradeRequest.mint);
              
              if (tokenBalance !== null) {
                // Calculate percentage sold
                let percentageSold = 100;
                if (typeof tradeRequest.amount === 'string' && tradeRequest.amount.endsWith('%')) {
                  percentageSold = parseFloat(tradeRequest.amount);
                }
                
                // Close position in portfolio
                this.portfolioManager.closePosition(
                  tradeRequest.mint,
                  price,
                  tokenBalance,
                  percentageSold
                );
              }
            }
          }
        } else {
          logger.trade(
            tradeRequest.action,
            tradeRequest.mint,
            typeof tradeRequest.amount === 'number' ? tradeRequest.amount : 0,
            this.tokenPrices.get(tradeRequest.mint) || 0,
            false
          );
          logger.error(`Trade failed: ${tradeResponse.error}`);
        }
      }
      
      // Update portfolio PNL with current prices
      const positionManagementStrategy = this.strategyManager.getStrategy('Position Management') as PositionManagementStrategy;
      if (positionManagementStrategy) {
        positionManagementStrategy.updatePortfolioPnL();
      }
    } catch (error) {
      logger.error(`Error handling event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Start the trading bot
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Trading bot is already running');
      return;
    }
    
    try {
      // Check wallet balance
      const balance = await this.wallet.getBalance();
      logger.info(`Wallet balance: ${balance} SOL`);
      
      if (balance < 0.05) {
        logger.warn('Wallet balance is low. Some trades may fail due to insufficient funds.');
      }
      
      // Subscribe to WebSocket events
      this.wsClient.subscribeToNewTokens();
      
      // Subscribe to trades for tokens we own
      const tokens = await this.wallet.getAllTokens();
      if (tokens.length > 0) {
        const tokenMints = tokens.map(token => token.mint);
        this.wsClient.subscribeToTokenTrades(tokenMints);
        logger.info(`Subscribed to trades for ${tokenMints.length} owned tokens`);
      }
      
      // Subscribe to trades for our wallet
      this.wsClient.subscribeToAccountTrades([this.wallet.getPublicKey()]);
      
      this.isRunning = true;
      logger.info('Trading bot started');
      
      // Log portfolio status
      const portfolio = this.portfolioManager.getPortfolio();
      logger.portfolio(
        this.portfolioManager.getTotalValue(),
        portfolio.realizedPnl,
        portfolio.unrealizedPnl
      );
    } catch (error) {
      logger.error(`Error starting trading bot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Stop the trading bot
   */
  public stop(): void {
    if (!this.isRunning) {
      logger.warn('Trading bot is not running');
      return;
    }
    
    try {
      // Close WebSocket connection
      this.wsClient.close();
      
      this.isRunning = false;
      logger.info('Trading bot stopped');
    } catch (error) {
      logger.error(`Error stopping trading bot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Create and start the trading bot
const bot = new TradingBot();

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Received SIGINT signal. Shutting down...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal. Shutting down...');
  bot.stop();
  process.exit(0);
});

// Start the bot
bot.start().catch(error => {
  logger.error(`Failed to start trading bot: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}); 