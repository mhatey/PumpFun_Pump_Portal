# Pump.fun Trading Bot

A comprehensive, trading bot for [Pump.fun](https://pump.fun) using the [PumpPortal API](https://github.com/thetateman/Pump-Fun-API). This bot implements multiple trading strategies, risk management, and portfolio tracking to automate trading on the Pump.fun platform.

## Summary

This trading bot provides a complete solution for automated trading on Pump.fun. It features:

- **Real-time Market Data**: Connects to PumpPortal's WebSocket API to receive instant notifications about new tokens and trades.
- **Multiple Trading Strategies**: Includes a Sniper strategy for new tokens, a Momentum strategy for trending tokens, and a Position Management strategy for exits.
- **Risk Management**: Implements sophisticated risk controls including position sizing, daily volume limits, and stop-loss/take-profit automation.
- **Portfolio Tracking**: Maintains a record of all positions, calculates P&L, and provides performance metrics.
- **Modular Architecture**: Built with a clean, modular design that makes it easy to add new strategies or modify existing ones.
- **Comprehensive Logging**: Detailed logging of all activities, trades, and errors for monitoring and debugging.
- **Secure API Integration**: Safely handles API keys and wallet credentials.

## Features

- **Multiple Trading Strategies**:
  - **Sniper Strategy**: Quickly buys newly created tokens based on configurable criteria
  - **Momentum Strategy**: Trades tokens showing strong price momentum based on volume and price action
  - **Position Management**: Automatically manages exits based on stop-loss and take-profit levels

- **Risk Management**:
  - Daily trading volume limits
  - Position size limits
  - Stop-loss and take-profit automation
  - Wallet balance checks

- **Portfolio Tracking**:
  - Tracks open and closed positions
  - Calculates realized and unrealized P&L
  - Maintains trading history

- **Real-time Data Processing**:
  - WebSocket connection for instant market data
  - Token creation events
  - Trade events

- **Secure API Integration**:
  - Supports both Lightning Transaction API and Local Transaction API
  - Secure handling of API keys and wallet credentials

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Solana wallet with SOL for trading
- PumpPortal API key (get one at [PumpPortal.fun](https://pumpportal.fun))

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pump-fun-trading-bot.git
   cd pump-fun-trading-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your configuration:
   ```
   # Solana Wallet
   WALLET_PRIVATE_KEY=your_base58_private_key
   WALLET_PUBLIC_KEY=your_public_key

   # PumpPortal API
   PUMPPORTAL_API_KEY=your_pumpportal_api_key

   # Solana RPC Endpoint
   RPC_ENDPOINT=https://api.mainnet-beta.solana.com
   
   # Other settings...
   ```

## Building the Bot

Compile the TypeScript code:

```bash
npm run build
```

## Running the Bot

Start the bot:

```bash
npm start
```

For development with auto-reloading:

```bash
npm run dev
```

## Configuration

The bot is highly configurable through the `.env` file. Here are the key configuration options:

### Wallet Configuration
- `WALLET_PUBLIC_KEY`: Your Solana wallet public key

For your private key, several secure options are available:
1. `WALLET_PRIVATE_KEY`: Direct private key in the `.env` file (least secure, not recommended for production)
2. `WALLET_PRIVATE_KEY_FILE`: Path to a separate file containing only your private key (better security)
3. `WALLET_PRIVATE_KEY_ENV`: Name of an OS environment variable containing your private key (good security)
4. `WALLET_HARDWARE_PATH`: For hardware wallet integration (best security, requires additional setup)

#### Secure Private Key Handling

For production use, we recommend using one of the more secure options:

**Option 1: Using a separate key file**
```bash
# Create a secure key file with restricted permissions
echo "your_base58_private_key" > /path/to/secure/key.txt
chmod 600 /path/to/secure/key.txt

# Reference it in your .env file
WALLET_PRIVATE_KEY_FILE=/path/to/secure/key.txt
```

**Option 2: Using OS environment variables**
```bash
# On Linux/Mac, add to your .bashrc or .zshrc
export SOLANA_WALLET_PRIVATE_KEY=your_base58_private_key

# On Windows
setx SOLANA_WALLET_PRIVATE_KEY your_base58_private_key

# Then in your .env file
WALLET_PRIVATE_KEY_ENV=SOLANA_WALLET_PRIVATE_KEY
```

### API Configuration
- `PUMPPORTAL_API_KEY`: Your PumpPortal API key
- `RPC_ENDPOINT`: Solana RPC endpoint (use a reliable provider like Helius or QuickNode for production)

### Trading Parameters
- `DEFAULT_SLIPPAGE`: Default slippage percentage for trades (e.g., 1 for 1%)
- `DEFAULT_PRIORITY_FEE`: Default priority fee for transactions
- `MAX_TRADE_AMOUNT_SOL`: Maximum amount of SOL per trade
- `MIN_TRADE_AMOUNT_SOL`: Minimum amount of SOL per trade
- `STOP_LOSS_PERCENTAGE`: Default stop-loss percentage
- `TAKE_PROFIT_PERCENTAGE`: Default take-profit percentage
- `FEE_BUFFER`: Amount of SOL to keep reserved for transaction fees (default: 0.01)

### Risk Management
- `MAX_DAILY_TRADING_VOLUME`: Maximum SOL volume to trade per day
- `MAX_POSITION_SIZE_PERCENTAGE`: Maximum position size as percentage of portfolio

### Logging and Monitoring
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `LOG_FILE_PATH`: Path to log file
- `PORTFOLIO_LOG_INTERVAL`: Time interval in minutes to log portfolio status

### WebSocket Configuration
- `WS_RECONNECT_INTERVAL`: Milliseconds to wait before reconnecting
- `MAX_RECONNECT_ATTEMPTS`: Maximum number of reconnection attempts

### Simulation and Testing
- `SIMULATION_MODE`: When set to true, trades will be simulated but not actually executed
- `DATA_DIR`: Directory for storing portfolio and other persistent data

### Notifications
- `TELEGRAM_ENABLED`: Enable Telegram notifications (true/false)
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token for notifications
- `TELEGRAM_CHAT_ID`: Your Telegram chat ID to receive notifications

### Strategy Priority Configuration
You can set the priority of strategies to determine which one gets to execute trades first when multiple strategies signal at the same time:

```bash
# Priority values (higher values = higher priority)
SNIPER_STRATEGY_PRIORITY=2       # Highest priority
MOMENTUM_STRATEGY_PRIORITY=1     # Medium priority
POSITION_MANAGEMENT_PRIORITY=0   # Always runs regardless of priority
```

## Strategy Configuration

Each trading strategy can be configured through both environment variables and programmatically at runtime. Below are all available configuration options for each strategy.

### Sniper Strategy

The Sniper strategy monitors for newly created tokens and executes trades based on configurable criteria.

#### Environment Variables

```bash
# Enable/disable the Sniper strategy (true/false)
SNIPER_STRATEGY_ENABLED=true

# Maximum age of tokens to consider in seconds
# Only tokens created within this timeframe will be considered
SNIPER_MAX_AGE_SECONDS=30

# Default amount in SOL for Sniper trades
SNIPER_DEFAULT_AMOUNT=0.1

# Comma-separated list of blocked creator addresses to ignore
# Example: SNIPER_BLOCKED_CREATORS=creator1,creator2,creator3
SNIPER_BLOCKED_CREATORS=

# Comma-separated list of phrases to block in token names/symbols
# Any token containing these phrases will be ignored
# Example: SNIPER_BLOCKED_PHRASES=scam,rug,test,fake
SNIPER_BLOCKED_PHRASES=

# Minimum SOL amount to trade for this strategy
# If not set, uses the global MIN_TRADE_AMOUNT_SOL
SNIPER_MIN_TRADE_AMOUNT=0.01

# Maximum SOL amount to trade for this strategy
# If not set, uses the global MAX_TRADE_AMOUNT_SOL
SNIPER_MAX_TRADE_AMOUNT=0.5
```

#### Programmatic Configuration

You can configure the Sniper strategy at runtime using the `StrategyManager`:

```typescript
strategyManager.configureStrategy('Sniper', {
  enabled: true,                             // Enable/disable the strategy
  maxAgeSeconds: 30,                         // Maximum age of tokens in seconds
  defaultTradeAmount: 0.1,                   // Default SOL amount to trade
  blockedCreators: ['address1', 'address2'], // Creator addresses to ignore
  blockedPhrases: ['scam', 'rug', 'test'],   // Phrases to block
  minTradeAmount: 0.01,                      // Minimum trade amount in SOL
  maxTradeAmount: 0.5,                       // Maximum trade amount in SOL
  followSpecificCreators: ['address3'],      // Only buy from specific creators (optional)
  nameFilters: [                             // Token name filters (optional)
    { include: 'cat', exclude: 'dog' }       // Include tokens with 'cat', exclude 'dog'
  ],
  preferLowSupply: true,                     // Prefer tokens with low supply (optional)
  delayMilliseconds: 500                     // Delay before execution in ms (optional)
});
```

### Momentum Strategy

The Momentum strategy detects and trades tokens showing strong price momentum based on volume and price action.

#### Environment Variables

```bash
# Enable/disable the Momentum strategy (true/false)
MOMENTUM_STRATEGY_ENABLED=true

# Minimum number of trades required to consider momentum
# More trades means more reliable data but may miss early opportunities
MOMENTUM_MIN_TRADE_COUNT=5

# Time window in minutes to analyze for momentum
# Shorter windows are more responsive but possibly noisier
MOMENTUM_TIME_WINDOW_MINUTES=5

# Minimum SOL volume required in the time window
# Higher values ensure there's actual market activity
MOMENTUM_MIN_VOLUME=0.5

# Minimum percentage price increase required to trigger a buy
# Higher values mean stronger momentum is required
MOMENTUM_PRICE_INCREASE_THRESHOLD=5

# Cooldown period in minutes before buying the same token again
# Prevents repeated buys of the same token
MOMENTUM_COOLDOWN_PERIOD_MINUTES=10

# Default amount in SOL for momentum trades
MOMENTUM_DEFAULT_AMOUNT=0.15

# Maximum price volatility percentage allowed
# Higher volatility tokens can be more risky
MOMENTUM_MAX_VOLATILITY=20

# Weight for buy vs sell volume (0-1)
# 1.0 means only buys matter, 0.5 means equal weight
MOMENTUM_BUY_VOLUME_WEIGHT=0.7
```

#### Programmatic Configuration

Configure the Momentum strategy at runtime:

```typescript
strategyManager.configureStrategy('Momentum', {
  enabled: true,                       // Enable/disable the strategy
  minTradeCount: 5,                    // Minimum number of trades to consider
  timeWindowMinutes: 5,                // Time window to analyze in minutes
  minVolumeThreshold: 0.5,             // Minimum SOL volume in the window
  priceIncreaseThreshold: 5,           // Minimum % price increase required
  cooldownPeriodMinutes: 10,           // Minutes before buying same token again
  defaultTradeAmount: 0.15,            // Default SOL amount to trade
  maxVolatility: 20,                   // Maximum allowed price volatility %
  buyVolumeWeight: 0.7,                // Weight for buy vs sell volume
  requireConsecutiveGreenCandles: 3,   // Require N consecutive up-candles (optional)
  minBuyRatio: 0.6,                    // Minimum buy:sell ratio (optional)
  considerMarketCap: true,             // Consider token market cap (optional)
  maxHistoryItems: 100,                // Max trade history items to track (optional)
  dynamicSizing: true,                 // Adjust position size by momentum (optional)
  ignoreLowLiquidity: true             // Ignore tokens with very low liquidity (optional)
});
```

### Position Management Strategy

The Position Management strategy monitors open positions and manages exits based on stop-loss, take-profit, or other criteria.

#### Environment Variables

```bash
# Enable/disable the Position Management strategy (true/false)
POSITION_MANAGEMENT_ENABLED=true

# Minimum interval in seconds between processing the same token
# Prevents too frequent checks of the same position
POSITION_MANAGEMENT_MIN_INTERVAL_SECONDS=10

# Enable trailing stop-loss (true/false)
# Automatically adjusts stop-loss higher as price increases
POSITION_MANAGEMENT_TRAILING_STOP=true

# Trailing stop-loss activation percentage
# Only starts trailing after price increases by this percentage
POSITION_MANAGEMENT_TRAILING_ACTIVATION=5

# Trailing stop-loss distance percentage
# How far below the highest price to set the trailing stop
POSITION_MANAGEMENT_TRAILING_DISTANCE=3

# Enable time-based exits (true/false)
# Automatically exit positions after a certain time
POSITION_MANAGEMENT_TIME_BASED_EXIT=false

# Maximum position hold time in minutes
# Automatically exit after this many minutes
POSITION_MANAGEMENT_MAX_HOLD_TIME=120

# Enable partial take-profit (true/false)
# Take partial profits at different price levels
POSITION_MANAGEMENT_PARTIAL_TP=false

# Comma-separated list of partial take-profit levels and percentages
# Format: level1:percentage1,level2:percentage2
# Example: 10:20,20:30,50:50 means:
# At 10% profit, sell 20% of position
# At 20% profit, sell 30% of position
# At 50% profit, sell 50% of position
POSITION_MANAGEMENT_PARTIAL_TP_LEVELS=10:20,20:30,50:50

# Enable dynamic stop-loss based on volatility (true/false)
POSITION_MANAGEMENT_DYNAMIC_SL=false
```

#### Programmatic Configuration

Configure the Position Management strategy at runtime:

```typescript
strategyManager.configureStrategy('Position Management', {
  enabled: true,                             // Enable/disable the strategy
  minProcessingIntervalSeconds: 10,          // Seconds between processing same token
  trailingStop: true,                        // Enable trailing stop-loss
  trailingActivation: 5,                     // Trailing activation percentage
  trailingDistance: 3,                       // Trailing distance percentage
  timeBasedExit: false,                      // Enable time-based exits
  maxHoldTimeMinutes: 120,                   // Maximum hold time in minutes
  partialTakeProfit: false,                  // Enable partial take-profit
  partialTakeProfitLevels: [                 // Partial take-profit levels
    { priceIncrease: 10, sellPercentage: 20 },
    { priceIncrease: 20, sellPercentage: 30 },
    { priceIncrease: 50, sellPercentage: 50 }
  ],
  dynamicStopLoss: false,                    // Enable dynamic stop-loss
  volumeBasedExit: false,                    // Exit based on volume decline (optional)
  profitLockPercentage: 50,                  // Lock in % of profits (optional)
  averageDownEnabled: false,                 // Enable averaging down (optional)
  averageDownThreshold: -10,                 // Threshold for averaging down (optional)
  extraExitConditions: {                     // Additional exit conditions (optional)
    priceDrop: { timeframeSeconds: 60, dropPercentage: 5 },
    volumeDrop: { timeframeSeconds: 300, dropPercentage: 50 }
  }
});
```

## Configuring Multiple Strategies

You can enable and configure multiple strategies simultaneously. Each strategy will operate independently based on its own criteria. Here's an example of a configuration using all three strategies:

```typescript
// 1. First, enable and configure each strategy appropriately
strategyManager.configureStrategy('Sniper', {
  enabled: true,
  maxAgeSeconds: 30,
  defaultTradeAmount: 0.1
});

strategyManager.configureStrategy('Momentum', {
  enabled: true,
  minTradeCount: 8,
  timeWindowMinutes: 5,
  minVolumeThreshold: 0.8,
  priceIncreaseThreshold: 10
});

strategyManager.configureStrategy('Position Management', {
  enabled: true,
  trailingStop: true,
  trailingActivation: 5,
  trailingDistance: 3
});

// 2. Set priority or execution order (optional)
strategyManager.setPriority('Sniper', 1);      // Highest priority
strategyManager.setPriority('Momentum', 2);
strategyManager.setPriority('Position Management', 0); // Always check positions
```

## Strategy Combination Recommendations

Different market conditions may call for different strategy configurations:

### Bull Market Configuration
- **Sniper**: Aggressive with larger position sizes
- **Momentum**: Lower thresholds to catch more uptrends
- **Position Management**: Higher take-profit, looser stop-loss

### Bear Market Configuration
- **Sniper**: Conservative with smaller position sizes
- **Momentum**: Higher thresholds to avoid false signals
- **Position Management**: Tighter stop-loss, quicker exits

### Sideways Market Configuration
- **Sniper**: Moderate settings
- **Momentum**: Focus on short-term price movements
- **Position Management**: Use partial take-profits, trailing stops

## Architecture

The bot is built with a modular architecture:

- **API Layer**: Handles communication with PumpPortal API
- **Core Components**: Wallet, Portfolio Manager, Risk Manager, Strategy Manager
- **Strategies**: Pluggable trading strategies
- **WebSocket Client**: Real-time data processing
- **Utilities**: Logging, configuration

## Security Considerations

- **Private Key Security**: Your private key is stored in the `.env` file. Ensure this file is secure and not committed to version control.
- **API Key Security**: Your PumpPortal API key should be kept confidential.
- **RPC Endpoint**: For production use, consider using a paid RPC provider for reliability.

## Simulation Mode

The bot includes a simulation mode for testing strategies without executing real trades. Enable it in your `.env` file:

```bash
# Enable simulation mode (true/false)
SIMULATION_MODE=true
```

### Simulation Logs

When in simulation mode, all trade actions are logged but not executed. The logs will include details about what trades would have been made, helping you refine your strategies before using real funds.

You can also modify the `executeTrade` function in `src/api/pumpPortalApi.ts` for custom simulation behavior:

```typescript
export const executeTrade = async (tradeRequest: TradeRequest): Promise<TradeResponse> => {
  logger.info(`SIMULATION: Would execute trade: ${JSON.stringify(tradeRequest)}`);
  
  // You can add custom logic here to simulate different market scenarios
  // For example, simulate slippage or failed transactions
  
  return {
    success: true,
    signature: 'simulation-' + Date.now()
  };
};
```

### Backtesting Mode

For more advanced testing, you can use the historical data module to backtest strategies against past market data:

```bash
# Run backtesting on a specific time range
npm run backtest -- --start="2023-01-01" --end="2023-01-31" --strategy=Momentum
```

## Advanced Features

### Custom Market Data Sources

You can configure additional market data sources beyond the default PumpPortal WebSocket:

```bash
# Enable alternative data sources (true/false)
ENABLE_ALTERNATIVE_DATA=false

# External market data APIs (comma-separated list)
EXTERNAL_DATA_APIS=https://api.example.com/market-data,https://another-api.com/data

# Data refresh interval in seconds
DATA_REFRESH_INTERVAL=60
```

### Custom Trading Strategies

The bot is designed to be easily extended with custom strategies. To create a new strategy:

1. Create a new file in `src/strategies/` that implements the `TradingStrategy` interface
2. Register your strategy in `src/core/strategyManager.ts`
3. Configure your strategy through environment variables or programmatically

Example for a custom strategy:

```typescript
import { TradingStrategy, WebSocketEvent, TradeRequest } from '../types';

export class MyCustomStrategy implements TradingStrategy {
  public name = 'Custom Strategy';
  public description = 'My custom trading strategy';
  public isEnabled = true;
  
  // Implement required methods
  public configure(params: Record<string, any>): void {
    // Your configuration logic
  }
  
  public shouldTrade(event: WebSocketEvent): boolean {
    // Your trade decision logic
    return false;
  }
  
  public async getTrade(event: WebSocketEvent): Promise<TradeRequest | null> {
    // Your trade creation logic
    return null;
  }
}
```

## Disclaimer

Trading cryptocurrencies involves significant risk. This bot is provided as-is with no guarantees. Use at your own risk. Always start with small amounts and test thoroughly before committing significant funds.

## Donations

solana: 8qRJ8ySKdCKyZnvxCCMLQyBQPZgWSofy5Uine3ew9Rtg

## License

MIT

## Acknowledgements

- [PumpPortal API](https://github.com/thetateman/Pump-Fun-API) for providing the API
- [Pump.fun](https://pump.fun) for the trading platform

## Portfolio Management

### Portfolio Tracking

The bot automatically tracks all your trades and positions, calculating both realized and unrealized P&L. You can access this information through logs or by implementing custom data exports.

### Performance Metrics

The portfolio manager tracks several key performance metrics:
- Win rate (percentage of profitable trades)
- Average profit per trade
- Maximum drawdown
- Sharpe ratio (risk-adjusted return)
- Total trading volume

### Data Export Options

You can export your trading data in several formats for further analysis:

```bash
# CSV export (daily)
ENABLE_CSV_EXPORT=true
CSV_EXPORT_PATH=data/exports

# JSON export (on every trade)
ENABLE_JSON_EXPORT=true
JSON_EXPORT_PATH=data/json

# Database integration (requires additional setup)
ENABLE_DB_EXPORT=false
DB_CONNECTION_STRING=postgresql://username:password@localhost:5432/trading_bot
```

### Performance Dashboard

An optional web dashboard is included to visualize your trading performance:

```bash
# Enable the web dashboard
ENABLE_DASHBOARD=false
DASHBOARD_PORT=3000
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=secure_password
```

To start the dashboard:

```bash
npm run dashboard
```

Then access it at http://localhost:3000 (or your configured port).

## Running in Production

For production deployments, we recommend the following:

### Using PM2 for Process Management

PM2 keeps your bot running even if it crashes and handles log rotation:

```bash
# Install PM2
npm install -g pm2

# Start the bot with PM2
pm2 start dist/index.js --name pump-fun-bot

# Monitor the bot
pm2 monit

# View logs
pm2 logs pump-fun-bot
```

### Docker Deployment

A Dockerfile is included for containerized deployment:

```bash
# Build the Docker image
docker build -t pump-fun-bot .

# Run the container
docker run -d --name pump-fun-bot \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  pump-fun-bot
```

## Troubleshooting

### Common Issues

#### Connection Issues
```
Error: WebSocket connection failed
```
- Check your internet connection
- Verify the PumpPortal API is accessible
- Make sure your API key is valid and properly configured

#### Transaction Failures
```
Error: Transaction simulation failed
```
- Increase slippage percentage
- Check wallet balance
- Verify RPC endpoint is responsive (consider using a paid endpoint)
- Make sure priority fee is sufficient during high network congestion

#### Strategy Not Trading
- Verify strategy is enabled in configuration
- Check strategy parameters are appropriate for current market conditions
- Ensure the bot has sufficient permissions and funds
- Review logs to see if risk management is preventing trades

### Logging and Debugging

For more verbose logging, set `LOG_LEVEL=debug` in your `.env` file. This will provide detailed information about:

- WebSocket events received
- Trade decisions and reasoning
- Risk management calculations
- API calls and responses

### Updating the Bot

To update to the latest version:

```bash
git pull
npm install
npm run build
```

## Complete Feature List

| Feature Category | Capabilities |
|-----------------|--------------|
| **Trading Strategies** | • Sniper Strategy (new token trading)<br>• Momentum Strategy (volume/price based)<br>• Position Management Strategy (exit management)<br>• Custom Strategy Support |
| **Risk Management** | • Daily trading volume limits<br>• Position size limits<br>• Stop-loss/take-profit automation<br>• Wallet balance checks<br>• Fee buffer protection |
| **Portfolio Tracking** | • Position tracking<br>• Realized/unrealized P&L calculation<br>• Performance metrics (win rate, avg profit, etc.)<br>• Data exports (CSV, JSON, DB)<br>• Optional web dashboard |
| **Real-time Data** | • WebSocket connection for live data<br>• Token creation events<br>• Trade events<br>• Alternative data source support |
| **Security Features** | • Multiple private key storage options<br>• API key security<br>• Transaction simulation<br>• Error handling and recovery |
| **Testing & Simulation** | • Simulation mode<br>• Backtesting capabilities<br>• Custom scenario testing |
| **Notifications** | • Telegram integration<br>• Email notifications (optional)<br>• Discord webhooks (optional) |
| **Deployment Options** | • Standard Node.js<br>• PM2 process management<br>• Docker containerization |

## Support and Community

Join our community to get help, share strategies, and connect with other traders:

- **GitHub Issues**: For bug reports and feature requests
- **Discord Channel**: For real-time support and community discussion
- **Strategy Exchange**: Share and download community-created strategies

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
