/**
 * Testing utilities for Mainframe SDK
 * 
 * Provides mock services, fixtures, and test helpers for SDK testing
 */

import { PublicKey } from '@solana/web3.js';
import { MainframeSDK, MainframeSDKFactory } from '../sdk';
import { MockStorageService } from '../services/storage';
import { MockWalletService } from '../services/wallet';
import { MockEventService } from '../services/events';
import type { 
  MainframeConfig, 
  AgentConfig, 
  AgentAccountData,
  EncryptedMetadata,
  StorageResult
} from '../types';

// ============================================================================
// Mock SDK
// ============================================================================

export class MockMainframeSDK extends MainframeSDK {
  public mockStorage: MockStorageService;
  public mockWallet: MockWalletService;
  public mockEvents: MockEventService;

  constructor(config?: Partial<MainframeConfig>) {
    const mockConfig: MainframeConfig = {
      solanaNetwork: 'devnet',
      rpcEndpoint: 'https://api.devnet.solana.com',
      programId: 'MockProgramId1111111111111111111111111111',
      protocolWallet: 'MockProtocol111111111111111111111111111111',
      storage: {
        arweave: { gateway: 'https://arweave.net' }
      },
      development: {
        mockWallet: true,
        mockStorage: true,
        logLevel: 'debug',
        skipFees: true
      },
      ...config
    };

    super(mockConfig);

    // Override with mock services
    this.mockStorage = new MockStorageService(mockConfig);
    this.mockWallet = new MockWalletService(mockConfig);
    this.mockEvents = new MockEventService(mockConfig, this.connection);

    // Replace the services
    (this as any).storage = this.mockStorage;
    (this as any).wallet = this.mockWallet;
    (this as any).events = this.mockEvents;
  }

  /**
   * Initialize with automatic wallet connection
   */
  async initializeForTesting(): Promise<void> {
    await this.initialize('Mock Wallet');
  }

  /**
   * Reset all mock data
   */
  resetMocks(): void {
    (this.mockStorage as any).mockStorage.clear();
    this.mockEvents.cleanup();
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

export class TestFixtures {
  /**
   * Generate a valid agent configuration for testing
   */
  static createAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
    return {
      name: 'Test Trading Bot',
      description: 'Automated trading bot for testing',
      purpose: 'Execute test trading strategies',
      personality: {
        traits: ['analytical', 'efficient'],
        style: 'professional'
      },
      capabilities: [
        {
          type: 'defi',
          plugins: ['jupiter-swap'],
          config: {
            maxSlippage: 0.5,
            minLiquidity: 1000
          }
        }
      ],
      framework: 'elizaOS',
      plugins: [
        {
          id: 'jupiter-swap',
          version: '1.0.0',
          enabled: true,
          config: { testMode: true },
          permissions: ['trade', 'quote']
        }
      ],
      runtime: {
        memory: { type: 'memory', ttl: 3600 },
        scheduling: { enabled: true, interval: 60000 },
        monitoring: { enabled: true, alerts: false }
      },
      permissions: {
        maxTradeSize: '100 USDC',
        allowedTokens: ['SOL', 'USDC'],
        tradingHours: { start: '09:00', end: '17:00', timezone: 'UTC' }
      },
      preferences: {
        notifications: false,
        riskLevel: 'low',
        autoRebalance: false
      },
      ...overrides
    };
  }

  /**
   * Generate mock agent account data
   */
  static createAgentAccountData(overrides: Partial<AgentAccountData> = {}): AgentAccountData {
    return {
      nftMint: 'TestNFTMint111111111111111111111111111111',
      owner: 'TestOwner1111111111111111111111111111111',
      collectionMint: 'TestCollection11111111111111111111111111',
      metadataUri: 'ipfs://QmTestMetadataHash',
      status: 'Active',
      activatedAt: Date.now() - 86400000, // 1 day ago
      updatedAt: Date.now() - 3600000,    // 1 hour ago
      version: 1,
      ...overrides
    };
  }

  /**
   * Generate mock encrypted metadata
   */
  static createEncryptedMetadata(overrides: Partial<EncryptedMetadata> = {}): EncryptedMetadata {
    return {
      ver: 1,
      aead: 'xchacha20poly1305-ietf',
      ad: 'mint:TestNFTMint111111111111111111111111111111',
      nonce: 'base64-encoded-nonce',
      ciphertext: 'base64-encoded-ciphertext',
      keyring: {
        'TestOwner1111111111111111111111111111111': 'base64:encrypted-key-for-owner',
        'MockProtocol111111111111111111111111111111': 'base64:encrypted-key-for-protocol'
      },
      timestamp: Date.now(),
      version: '1.0.0',
      ...overrides
    };
  }

  /**
   * Generate mock storage result
   */
  static createStorageResult(overrides: Partial<StorageResult> = {}): StorageResult {
    const hash = 'QmTestHash123456789';
    return {
      primary: {
        provider: 'ipfs',
        hash,
        url: `https://ipfs.io/ipfs/${hash}`,
        timestamp: Date.now()
      },
      backups: [],
      uri: `ipfs://${hash}`,
      ...overrides
    };
  }

  /**
   * Generate random Solana address
   */
  static randomAddress(): string {
    return new PublicKey(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)).toBase58();
  }

  /**
   * Generate sequential test addresses
   */
  static testAddress(index: number): string {
    const baseKey = 'Test000000000000000000000000000000000000';
    const indexStr = index.toString().padStart(3, '0');
    return baseKey.substring(0, baseKey.length - 3) + indexStr;
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

export class TestHelpers {
  /**
   * Wait for a specified amount of time
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a timeout promise that rejects after specified time
   */
  static timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
      )
    ]);
  }

  /**
   * Retry an operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Assert that a promise rejects with a specific error
   */
  static async expectError<T>(
    promise: Promise<T>,
    expectedMessage?: string | RegExp,
    expectedCode?: string
  ): Promise<Error> {
    try {
      await promise;
      throw new Error('Expected promise to reject, but it resolved');
    } catch (error) {
      const err = error as Error;
      
      if (expectedMessage) {
        if (typeof expectedMessage === 'string') {
          if (!err.message.includes(expectedMessage)) {
            throw new Error(`Expected error message to include "${expectedMessage}", got: ${err.message}`);
          }
        } else {
          if (!expectedMessage.test(err.message)) {
            throw new Error(`Expected error message to match ${expectedMessage}, got: ${err.message}`);
          }
        }
      }

      if (expectedCode && 'code' in err) {
        if ((err as any).code !== expectedCode) {
          throw new Error(`Expected error code "${expectedCode}", got: ${(err as any).code}`);
        }
      }

      return err;
    }
  }

  /**
   * Mock a method on an object
   */
  static mockMethod<T, K extends keyof T>(
    object: T,
    method: K,
    implementation: T[K]
  ): () => void {
    const original = object[method];
    object[method] = implementation;
    
    // Return restore function
    return () => {
      object[method] = original;
    };
  }

  /**
   * Create a spy function that records calls
   */
  static createSpy<T extends (...args: any[]) => any>(
    implementation?: T
  ): T & { calls: Parameters<T>[][]; callCount: number } {
    const calls: Parameters<T>[][] = [];
    
    const spy = ((...args: Parameters<T>) => {
      calls.push(args);
      return implementation ? implementation(...args) : undefined;
    }) as T & { calls: Parameters<T>[][]; callCount: number };

    Object.defineProperty(spy, 'calls', { value: calls });
    Object.defineProperty(spy, 'callCount', { get: () => calls.length });

    return spy;
  }

  /**
   * Validate that an object matches expected structure
   */
  static validateStructure(
    object: any,
    expectedStructure: Record<string, string>
  ): void {
    for (const [key, expectedType] of Object.entries(expectedStructure)) {
      if (!(key in object)) {
        throw new Error(`Missing expected property: ${key}`);
      }

      const actualType = typeof object[key];
      if (actualType !== expectedType) {
        throw new Error(`Property ${key} has type ${actualType}, expected ${expectedType}`);
      }
    }
  }
}

// ============================================================================
// Integration Test Setup
// ============================================================================

export class IntegrationTestSetup {
  private sdk?: MockMainframeSDK;

  /**
   * Setup SDK for integration testing
   */
  async setup(): Promise<MockMainframeSDK> {
    this.sdk = new MockMainframeSDK();
    await this.sdk.initializeForTesting();
    return this.sdk;
  }

  /**
   * Cleanup after tests
   */
  async cleanup(): Promise<void> {
    if (this.sdk) {
      await this.sdk.cleanup();
    }
    this.sdk = undefined as any;
  }

  /**
   * Create a full end-to-end test scenario
   */
  async createTestScenario(): Promise<{
    sdk: MockMainframeSDK;
    agentConfig: AgentConfig;
    nftMint: string;
  }> {
    const sdk = await this.setup();
    const agentConfig = TestFixtures.createAgentConfig();
    const nftMint = TestFixtures.randomAddress();

    return { sdk, agentConfig, nftMint };
  }
}

// ============================================================================
// Performance Testing
// ============================================================================

export class PerformanceTestHelpers {
  /**
   * Measure execution time of an operation
   */
  static async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const start = performance.now();
    const result = await operation();
    const timeMs = performance.now() - start;
    
    return { result, timeMs };
  }

  /**
   * Run performance benchmark
   */
  static async benchmark<T>(
    name: string,
    operation: () => Promise<T>,
    iterations: number = 10
  ): Promise<{ averageMs: number; minMs: number; maxMs: number; results: T[] }> {
    const times: number[] = [];
    const results: T[] = [];

    console.log(`🏃 Running benchmark: ${name} (${iterations} iterations)`);

    for (let i = 0; i < iterations; i++) {
      const { result, timeMs } = await this.measureTime(operation);
      times.push(timeMs);
      results.push(result);
    }

    const averageMs = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minMs = Math.min(...times);
    const maxMs = Math.max(...times);

    console.log(`✅ Benchmark ${name}: avg=${averageMs.toFixed(2)}ms, min=${minMs.toFixed(2)}ms, max=${maxMs.toFixed(2)}ms`);

    return { averageMs, minMs, maxMs, results };
  }
}

// ============================================================================
// Export Test Utilities
// ============================================================================

export { MockStorageService, MockWalletService, MockEventService };

// Factory function for creating test SDK
export const createTestSDK = (config?: Partial<MainframeConfig>) => new MockMainframeSDK(config);

// Quick setup for different test scenarios
export const TestSetup = {
  unit: () => new MockMainframeSDK(),
  integration: () => new IntegrationTestSetup(),
  performance: () => PerformanceTestHelpers
};

// Common test data
export const TestData = {
  fixtures: TestFixtures,
  helpers: TestHelpers
};
