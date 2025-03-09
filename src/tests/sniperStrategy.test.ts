import { SniperStrategy } from '../strategies/sniperStrategy';
import { RiskManager } from '../core/riskManager';
import { Wallet } from '../core/wallet';
import { PortfolioManager } from '../core/portfolio';
import { NewTokenEvent } from '../types';

// Mock dependencies
jest.mock('../core/riskManager');
jest.mock('../core/wallet');
jest.mock('../core/portfolio');
jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  strategy: jest.fn(),
}));

describe('SniperStrategy', () => {
  let sniperStrategy: SniperStrategy;
  let mockRiskManager: jest.Mocked<RiskManager>;
  
  beforeEach(() => {
    // Create mocked instances
    const mockWallet = new Wallet() as jest.Mocked<Wallet>;
    const mockPortfolioManager = new PortfolioManager() as jest.Mocked<PortfolioManager>;
    mockRiskManager = new RiskManager(mockWallet, mockPortfolioManager) as jest.Mocked<RiskManager>;
    
    // Setup mock implementations
    mockRiskManager.getOptimalTradeSize.mockResolvedValue(0.1);
    mockRiskManager.checkTrade.mockResolvedValue({ allowed: true });
    
    // Create strategy instance
    sniperStrategy = new SniperStrategy(mockRiskManager);
  });
  
  describe('shouldTrade', () => {
    it('should return false for non-newToken events', () => {
      const event = { type: 'tokenTrade', data: {} };
      expect(sniperStrategy.shouldTrade(event)).toBe(false);
    });
    
    it('should return false if strategy is disabled', () => {
      sniperStrategy.isEnabled = false;
      
      const event: NewTokenEvent = {
        type: 'newToken',
        data: {
          mint: 'token123',
          name: 'Test Token',
          symbol: 'TEST',
          createdAt: Date.now(),
          creatorAddress: 'creator123'
        }
      };
      
      expect(sniperStrategy.shouldTrade(event)).toBe(false);
    });
    
    it('should return false for tokens that are too old', () => {
      const oldTimestamp = Date.now() - 60000; // 1 minute ago
      
      const event: NewTokenEvent = {
        type: 'newToken',
        data: {
          mint: 'token123',
          name: 'Test Token',
          symbol: 'TEST',
          createdAt: oldTimestamp,
          creatorAddress: 'creator123'
        }
      };
      
      // Configure strategy to only accept tokens created in the last 10 seconds
      sniperStrategy.configure({ maxAgeSeconds: 10 });
      
      expect(sniperStrategy.shouldTrade(event)).toBe(false);
    });
    
    it('should return true for valid new tokens', () => {
      const event: NewTokenEvent = {
        type: 'newToken',
        data: {
          mint: 'token123',
          name: 'Test Token',
          symbol: 'TEST',
          createdAt: Date.now(),
          creatorAddress: 'creator123'
        }
      };
      
      expect(sniperStrategy.shouldTrade(event)).toBe(true);
    });
    
    it('should return false for blocked creators', () => {
      sniperStrategy.configure({ blockedCreators: ['creator123'] });
      
      const event: NewTokenEvent = {
        type: 'newToken',
        data: {
          mint: 'token123',
          name: 'Test Token',
          symbol: 'TEST',
          createdAt: Date.now(),
          creatorAddress: 'creator123'
        }
      };
      
      expect(sniperStrategy.shouldTrade(event)).toBe(false);
    });
    
    it('should return false for tokens with blocked phrases', () => {
      sniperStrategy.configure({ blockedPhrases: ['scam', 'test'] });
      
      const event: NewTokenEvent = {
        type: 'newToken',
        data: {
          mint: 'token123',
          name: 'Test Token',
          symbol: 'TEST',
          createdAt: Date.now(),
          creatorAddress: 'creator123'
        }
      };
      
      expect(sniperStrategy.shouldTrade(event)).toBe(false);
    });
  });
  
  describe('getTrade', () => {
    it('should return null for non-newToken events', async () => {
      const event = { type: 'tokenTrade', data: {} };
      const result = await sniperStrategy.getTrade(event);
      expect(result).toBeNull();
    });
    
    it('should return a valid trade request for new tokens', async () => {
      const event: NewTokenEvent = {
        type: 'newToken',
        data: {
          mint: 'token123',
          name: 'Test Token',
          symbol: 'TEST',
          createdAt: Date.now(),
          creatorAddress: 'creator123'
        }
      };
      
      const tradeRequest = await sniperStrategy.getTrade(event);
      
      expect(tradeRequest).not.toBeNull();
      expect(tradeRequest?.action).toBe('buy');
      expect(tradeRequest?.mint).toBe('token123');
      expect(tradeRequest?.denominatedInSol).toBe(true);
    });
    
    it('should return null if risk check fails', async () => {
      mockRiskManager.checkTrade.mockResolvedValueOnce({ allowed: false, reason: 'Test reason' });
      
      const event: NewTokenEvent = {
        type: 'newToken',
        data: {
          mint: 'token123',
          name: 'Test Token',
          symbol: 'TEST',
          createdAt: Date.now(),
          creatorAddress: 'creator123'
        }
      };
      
      const tradeRequest = await sniperStrategy.getTrade(event);
      
      expect(tradeRequest).toBeNull();
    });
  });
}); 