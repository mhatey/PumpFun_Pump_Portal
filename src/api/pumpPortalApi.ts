import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';
import { TradeRequest, TradeResponse, LocalTradeRequest } from '../types';

const LIGHTNING_API_ENDPOINT = 'https://pumpportal.fun/api/trade';
const LOCAL_API_ENDPOINT = 'https://pumpportal.fun/api/trade-local';

/**
 * Execute a trade using the Lightning Transaction API
 * This sends a transaction directly through PumpPortal's infrastructure
 */
export const executeTrade = async (tradeRequest: TradeRequest): Promise<TradeResponse> => {
  try {
    // Add API key to request
    const requestWithApiKey = {
      ...tradeRequest,
      'api-key': config.api.pumpPortalApiKey,
    };

    logger.debug(`Sending trade request to Lightning API: ${JSON.stringify(tradeRequest)}`);
    
    const response = await axios.post(LIGHTNING_API_ENDPOINT, requestWithApiKey, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 && response.data.signature) {
      logger.debug(`Received successful response from Lightning API: ${response.data.signature}`);
      return {
        success: true,
        signature: response.data.signature
      };
    } else {
      logger.warn(`Received unexpected response from Lightning API: ${JSON.stringify(response.data)}`);
      return {
        success: false,
        error: response.data.error || 'Unknown error occurred'
      };
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      logger.error(`Lightning API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      return {
        success: false,
        error: error.response.data.error || `API returned status ${error.response.status}`
      };
    } else {
      logger.error(`Error executing trade: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Get a local transaction to sign and send ourselves
 * This gives us more control over the transaction
 */
export const getLocalTransaction = async (tradeRequest: LocalTradeRequest): Promise<Uint8Array | null> => {
  try {
    logger.debug(`Sending trade request to Local Transaction API: ${JSON.stringify(tradeRequest)}`);
    
    const response = await axios.post(LOCAL_API_ENDPOINT, tradeRequest, {
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });

    if (response.status === 200) {
      logger.debug('Received serialized transaction from Local Transaction API');
      return new Uint8Array(response.data);
    } else {
      logger.warn(`Received unexpected response from Local Transaction API: Status ${response.status}`);
      return null;
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      logger.error(`Local Transaction API error (${error.response.status}): ${error.response.statusText}`);
    } else {
      logger.error(`Error getting local transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }
}; 