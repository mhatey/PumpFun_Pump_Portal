import WebSocket from 'ws';
import { config } from '../config';
import logger from '../utils/logger';
import { WebSocketMessage, WebSocketEvent } from '../types';
import EventEmitter from 'events';

const WS_ENDPOINT = 'wss://pumpportal.fun/api/data';

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private activeSubscriptions: Set<string> = new Set();
  private subscribedTokens: Set<string> = new Set();
  private subscribedAccounts: Set<string> = new Set();

  constructor() {
    super();
    this.setupConnection();
  }

  /**
   * Initialize the WebSocket connection
   */
  private setupConnection(): void {
    if (this.ws || this.isReconnecting) {
      return;
    }

    try {
      logger.info('Connecting to PumpPortal WebSocket...');
      this.ws = new WebSocket(WS_ENDPOINT);

      this.ws.on('open', this.handleOpen.bind(this));
      this.ws.on('message', this.handleMessage.bind(this));
      this.ws.on('error', this.handleError.bind(this));
      this.ws.on('close', this.handleClose.bind(this));
    } catch (error) {
      logger.error(`WebSocket connection error: ${error instanceof Error ? error.message : String(error)}`);
      this.attemptReconnect();
    }
  }

  /**
   * Handles the WebSocket open event
   */
  private handleOpen(): void {
    logger.info('Connected to PumpPortal WebSocket');
    this.reconnectAttempts = 0;
    this.resubscribe();
  }

  /**
   * Resubscribe to all previous subscriptions after reconnecting
   */
  private resubscribe(): void {
    // Resubscribe to all previous subscriptions
    if (this.activeSubscriptions.has('subscribeNewToken')) {
      this.subscribeToNewTokens();
    }

    if (this.subscribedTokens.size > 0) {
      this.subscribeToTokenTrades([...this.subscribedTokens]);
    }

    if (this.subscribedAccounts.size > 0) {
      this.subscribeToAccountTrades([...this.subscribedAccounts]);
    }
  }

  /**
   * Handles incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const event = JSON.parse(data.toString()) as WebSocketEvent;
      
      // Only log debug for token trade and creation events to avoid excessive logging
      if (event.type === 'newToken') {
        logger.debug(`New token created: ${JSON.stringify(event.data)}`);
      } else if (event.type === 'tokenTrade') {
        logger.debug(`Token trade event: ${JSON.stringify(event.data)}`);
      }
      
      // Emit the event to listeners
      this.emit(event.type, event);
      this.emit('message', event);
    } catch (error) {
      logger.error(`Error parsing WebSocket message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handles WebSocket errors
   */
  private handleError(error: Error): void {
    logger.error(`WebSocket error: ${error.message}`);
  }

  /**
   * Handles WebSocket connection closure
   */
  private handleClose(code: number, reason: string): void {
    logger.warn(`WebSocket connection closed (${code}): ${reason || 'No reason provided'}`);
    this.ws = null;
    this.attemptReconnect();
  }

  /**
   * Attempts to reconnect to the WebSocket after a connection failure
   */
  private attemptReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= config.websocket.maxReconnectAttempts) {
      if (this.reconnectAttempts >= config.websocket.maxReconnectAttempts) {
        logger.error(`Maximum reconnection attempts (${config.websocket.maxReconnectAttempts}) reached. Giving up.`);
      }
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = config.websocket.reconnectInterval;
    logger.info(`Attempting to reconnect in ${delay / 1000} seconds (attempt ${this.reconnectAttempts}/${config.websocket.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.isReconnecting = false;
      this.setupConnection();
    }, delay);
  }

  /**
   * Sends a message to the WebSocket server
   */
  private send(message: WebSocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error('Cannot send message: WebSocket is not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Error sending WebSocket message: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Subscribe to new token creation events
   */
  public subscribeToNewTokens(): boolean {
    logger.info('Subscribing to new token creation events');
    const success = this.send({ method: 'subscribeNewToken' });
    if (success) {
      this.activeSubscriptions.add('subscribeNewToken');
    }
    return success;
  }

  /**
   * Unsubscribe from new token creation events
   */
  public unsubscribeFromNewTokens(): boolean {
    logger.info('Unsubscribing from new token creation events');
    const success = this.send({ method: 'unsubscribeNewToken' });
    if (success) {
      this.activeSubscriptions.delete('subscribeNewToken');
    }
    return success;
  }

  /**
   * Subscribe to trades for specific tokens
   */
  public subscribeToTokenTrades(tokenMints: string[]): boolean {
    if (tokenMints.length === 0) {
      return false;
    }

    logger.info(`Subscribing to trades for ${tokenMints.length} tokens`);
    const success = this.send({
      method: 'subscribeTokenTrade',
      keys: tokenMints
    });

    if (success) {
      tokenMints.forEach(mint => this.subscribedTokens.add(mint));
    }
    
    return success;
  }

  /**
   * Unsubscribe from trades for specific tokens
   */
  public unsubscribeFromTokenTrades(tokenMints: string[]): boolean {
    if (tokenMints.length === 0) {
      return false;
    }

    logger.info(`Unsubscribing from trades for ${tokenMints.length} tokens`);
    const success = this.send({
      method: 'unsubscribeTokenTrade',
      keys: tokenMints
    });

    if (success) {
      tokenMints.forEach(mint => this.subscribedTokens.delete(mint));
    }
    
    return success;
  }

  /**
   * Subscribe to trades made by specific accounts
   */
  public subscribeToAccountTrades(accounts: string[]): boolean {
    if (accounts.length === 0) {
      return false;
    }

    logger.info(`Subscribing to trades for ${accounts.length} accounts`);
    const success = this.send({
      method: 'subscribeAccountTrade',
      keys: accounts
    });

    if (success) {
      accounts.forEach(account => this.subscribedAccounts.add(account));
    }
    
    return success;
  }

  /**
   * Unsubscribe from trades made by specific accounts
   */
  public unsubscribeFromAccountTrades(accounts: string[]): boolean {
    if (accounts.length === 0) {
      return false;
    }

    logger.info(`Unsubscribing from trades for ${accounts.length} accounts`);
    const success = this.send({
      method: 'unsubscribeAccountTrade',
      keys: accounts
    });

    if (success) {
      accounts.forEach(account => this.subscribedAccounts.delete(account));
    }
    
    return success;
  }

  /**
   * Close the WebSocket connection
   */
  public close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }

    logger.info('WebSocket connection closed');
  }
} 