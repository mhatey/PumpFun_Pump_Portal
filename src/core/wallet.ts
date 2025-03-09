import { 
  Connection, 
  Keypair, 
  PublicKey, 
  VersionedTransaction 
} from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import logger from '../utils/logger';
import { getLocalTransaction } from '../api/pumpPortalApi';
import { LocalTradeRequest, TradeResponse } from '../types';

// Class to manage wallet operations
export class Wallet {
  private connection: Connection;
  private keypair: Keypair;
  
  /**
   * Initialize a new wallet instance
   */
  constructor() {
    this.connection = new Connection(config.api.rpcEndpoint, 'confirmed');
    this.keypair = this.loadKeypair();
    
    // Verify the derived public key matches the configured one
    const derivedPublicKey = this.keypair.publicKey.toBase58();
    if (derivedPublicKey !== config.wallet.publicKey) {
      logger.warn(`Derived public key ${derivedPublicKey} does not match configured public key ${config.wallet.publicKey}`);
    }
  }

  /**
   * Load the keypair from the configured source
   */
  private loadKeypair(): Keypair {
    // Option 1: Direct private key from env file
    if (process.env.WALLET_PRIVATE_KEY) {
      logger.debug('Loading private key from environment variable WALLET_PRIVATE_KEY');
      return Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));
    }
    
    // Option 2: Load from a separate file
    if (process.env.WALLET_PRIVATE_KEY_FILE) {
      try {
        logger.debug(`Loading private key from file: ${process.env.WALLET_PRIVATE_KEY_FILE}`);
        const keyFile = path.resolve(process.env.WALLET_PRIVATE_KEY_FILE);
        const privateKeyString = fs.readFileSync(keyFile, 'utf-8').trim();
        return Keypair.fromSecretKey(bs58.decode(privateKeyString));
      } catch (error) {
        logger.error(`Failed to load private key from file: ${error instanceof Error ? error.message : String(error)}`);
        throw new Error('Failed to load wallet private key from file');
      }
    }
    
    // Option 3: Load from OS environment variable
    if (process.env.WALLET_PRIVATE_KEY_ENV) {
      const envVarName = process.env.WALLET_PRIVATE_KEY_ENV;
      const privateKeyFromEnv = process.env[envVarName];
      
      if (!privateKeyFromEnv) {
        throw new Error(`Environment variable ${envVarName} is not set`);
      }
      
      logger.debug(`Loading private key from environment variable ${envVarName}`);
      return Keypair.fromSecretKey(bs58.decode(privateKeyFromEnv));
    }
    
    // Option 4: Hardware wallet support would be implemented here
    // This is a placeholder for future implementation
    if (process.env.WALLET_HARDWARE_PATH) {
      // This would require additional libraries and implementation
      logger.error('Hardware wallet support is not yet implemented');
      throw new Error('Hardware wallet support is not yet implemented');
    }
    
    // If no key source is specified, throw an error
    throw new Error('No wallet private key source specified. Please configure one of the WALLET_PRIVATE_KEY options.');
  }

  /**
   * Get the public key of the wallet
   */
  public getPublicKey(): string {
    return this.keypair.publicKey.toBase58();
  }

  /**
   * Get the Solana connection
   */
  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Check the SOL balance of the wallet
   */
  public async getBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      return balance / 1e9; // Convert from lamports to SOL
    } catch (error) {
      logger.error(`Error checking balance: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Execute a trade using the local transaction API
   * This gives more control over the transaction sending
   */
  public async executeLocalTrade(tradeRequest: Omit<LocalTradeRequest, 'publicKey'>): Promise<TradeResponse> {
    try {
      // Add the public key to the request
      const fullRequest: LocalTradeRequest = {
        ...tradeRequest,
        publicKey: this.getPublicKey()
      };

      // Get the serialized transaction from the API
      const serializedTx = await getLocalTransaction(fullRequest);
      if (!serializedTx) {
        return {
          success: false,
          error: 'Failed to get serialized transaction from API'
        };
      }

      // Deserialize and sign the transaction
      const tx = VersionedTransaction.deserialize(serializedTx);
      tx.sign([this.keypair]);

      // Send the transaction
      logger.info(`Sending transaction for ${tradeRequest.action} ${tradeRequest.mint}...`);
      const signature = await this.connection.sendTransaction(tx);
      
      logger.info(`Transaction sent: ${signature}`);
      return {
        success: true,
        signature
      };
    } catch (error) {
      logger.error(`Error executing local trade: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check if a token exists in the wallet
   */
  public async hasToken(mint: string): Promise<boolean> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.keypair.publicKey,
        { mint: new PublicKey(mint) }
      );
      return tokenAccounts.value.length > 0;
    } catch (error) {
      logger.error(`Error checking for token ${mint}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get the balance of a specific token
   */
  public async getTokenBalance(mint: string): Promise<number | null> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.keypair.publicKey,
        { mint: new PublicKey(mint) }
      );
      
      if (tokenAccounts.value.length === 0) {
        return 0;
      }
      
      const tokenAccount = tokenAccounts.value[0];
      const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
      
      return Number(tokenAmount.amount) / Math.pow(10, tokenAmount.decimals);
    } catch (error) {
      logger.error(`Error getting token balance for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Get all tokens in the wallet
   */
  public async getAllTokens(): Promise<{ mint: string, balance: number }[]> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.keypair.publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );
      
      return tokenAccounts.value.map(token => {
        const parsedInfo = token.account.data.parsed.info;
        const balance = Number(parsedInfo.tokenAmount.amount) / Math.pow(10, parsedInfo.tokenAmount.decimals);
        return {
          mint: parsedInfo.mint,
          balance
        };
      }).filter(token => token.balance > 0);
    } catch (error) {
      logger.error(`Error getting all tokens: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
} 