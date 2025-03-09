# Pump.fun Trading Bot

A comprehensive, production-ready trading bot for [Pump.fun](https://pump.fun) using the [PumpPortal API](https://github.com/thetateman/Pump-Fun-API). This bot implements multiple trading strategies, risk management, and portfolio tracking to automate trading on the Pump.fun platform.

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

### Risk Management
- `MAX_DAILY_TRADING_VOLUME`: Maximum SOL volume to trade per day
- `MAX_POSITION_SIZE_PERCENTAGE`: Maximum position size as percentage of portfolio

### Logging
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `LOG_FILE_PATH`: Path to log file

### WebSocket Configuration
- `WS_RECONNECT_INTERVAL`: Milliseconds to wait before reconnecting
- `MAX_RECONNECT_ATTEMPTS`: Maximum number of reconnection attempts

## Strategy Configuration

Each strategy can be configured programmatically. Here's how to configure them:

### Sniper Strategy

The Sniper strategy buys newly created tokens. Configuration options:

- `enabled`: Enable/disable the strategy
- `maxAgeSeconds`: Maximum age of tokens to consider (in seconds)
- `blockedCreators`: Array of creator addresses to ignore
- `blockedPhrases`: Array of phrases to block in token names/symbols
- `defaultTradeAmount`: Default SOL amount to trade

### Momentum Strategy

The Momentum strategy buys tokens showing strong price action. Configuration options:

- `enabled`: Enable/disable the strategy
- `minTradeCount`: Minimum number of trades to consider momentum
- `timeWindowMinutes`: Time window to analyze (in minutes)
- `minVolumeThreshold`: Minimum SOL volume in the time window
- `priceIncreaseThreshold`: Minimum percentage price increase
- `cooldownPeriodMinutes`: Cooldown period before buying the same token again
- `defaultTradeAmount`: Default SOL amount to trade

### Position Management Strategy

The Position Management strategy handles exits. Configuration options:

- `enabled`: Enable/disable the strategy
- `minProcessingIntervalSeconds`: Minimum interval between processing the same token

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

To test the bot without executing real trades, you can modify the `executeTrade` function in `src/api/pumpPortalApi.ts` to log trades instead of sending them:

```typescript
export const executeTrade = async (tradeRequest: TradeRequest): Promise<TradeResponse> => {
  logger.info(`SIMULATION: Would execute trade: ${JSON.stringify(tradeRequest)}`);
  return {
    success: true,
    signature: 'simulation-' + Date.now()
  };
};
```

## Disclaimer

Trading cryptocurrencies involves significant risk. This bot is provided as-is with no guarantees. Use at your own risk. Always start with small amounts and test thoroughly before committing significant funds.

## License

MIT

## Acknowledgements

- [PumpPortal API](https://github.com/thetateman/Pump-Fun-API) for providing the API
- [Pump.fun](https://pump.fun) for the trading platform
