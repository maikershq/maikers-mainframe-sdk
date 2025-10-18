/**
 * Mainframe SDK
 * 
 * TypeScript SDK for the Mainframe protocol providing client-side encryption,
 * decentralized storage, and seamless Anchor program integration for AI agents on Solana.
 */

// ============================================================================
// Main SDK Export
// ============================================================================

export {
  MainframeSDK,
  MainframeSDKFactory,
  createMainframeSDK,
  createMainnetSDK,
  createDevnetSDK
} from './sdk';

// TESTING ONLY: Mock SDK factory with testing-only guard
import { createMockSDK as _createMockSDK } from './sdk';
import { ensureTestingOnly } from './production-guard';
export const createMockSDK = (...args: Parameters<typeof _createMockSDK>) => {
  ensureTestingOnly('createMockSDK');
  return _createMockSDK(...args);
};

import { MainframeSDKFactory } from './sdk';
import type { MainframeConfig } from './types';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Configuration Types
  MainframeConfig,
  StorageConfig,
  EncryptionConfig,
  DevelopmentConfig,
  
  // Agent Configuration Types
  AgentConfig,
  PersonalityTraits,
  AgentCapability,
  PluginConfig,
  RuntimeConfig,
  PermissionSet,
  UserPreferences,
  
  // PoC-Compatible Types
  SecureBlock,
  PublicAgentData,
  AgentNFTMetadata,
  VerifiedNFT,
  WalletInfo,
  CollectionPlugin,
  MainframeAgentsCollection,
  
  // Encryption & Storage Types
  EncryptedMetadata,
  StorageResult,
  StorageUpload,
  UploadOptions,
  
  // Program & Blockchain Types
  AgentAccountData,
  AgentStatus,
  FeeStructure,
  PartnerCollection,
  ProtocolConfigData,
  
  // Transaction & Operation Result Types
  TransactionOptions,
  ActivateAgentResult,
  UpdateAgentResult,
  TransferAgentResult,
  
  // Wallet Integration Types
  WalletConnectionResult,
  WalletAdapter,
  
  // Event Types
  AgentCreatedEvent,
  AgentUpdatedEvent,
  AgentTransferredEvent,
  AgentPausedEvent,
  AgentResumedEvent,
  AgentClosedEvent,
  AgentDeployedEvent,
  AgentErrorEvent,
  EventSubscription,
  
  // Utility Types
  AgentSummary,
  ValidationResult,
  CacheOptions,
  
  // Validation Schema Types
  ValidatedAgentConfig,
  ValidatedMainframeConfig
} from './types';

// ============================================================================
// Service Exports
// ============================================================================

export { 
  EncryptionService,
  EncryptionUtils
} from './services/encryption';

export { 
  StorageService,
  StorageUtils
} from './services/storage';

// TESTING ONLY: Mock service with testing-only guard
import { MockStorageService as _MockStorageService } from './services/storage';
import { wrapMockExport } from './production-guard';
export const MockStorageService = wrapMockExport(_MockStorageService, 'MockStorageService');

export { 
  ProgramService
} from './services/program';

export { 
  WalletService,
  WalletUtils
} from './services/wallet';

// TESTING ONLY: Mock service with testing-only guard
import { MockWalletService as _MockWalletService } from './services/wallet';
export const MockWalletService = wrapMockExport(_MockWalletService, 'MockWalletService');

export { 
  EventService,
  EventUtils
} from './services/events';

// TESTING ONLY: Mock service with testing-only guard
import { MockEventService as _MockEventService } from './services/events';
export const MockEventService = wrapMockExport(_MockEventService, 'MockEventService');
export type { EventCallback, EventFilter } from './services/events';

export { 
  CollectionService,
  CollectionUtils
} from './services/collection';

export { 
  DataAccessService,
  DataAccessUtils
} from './services/data-access';
export type { AccessTestResult } from './services/data-access';

// ============================================================================
// Production Utilities (New!)
// ============================================================================

export {
  RateLimiter,
  CircuitBreaker,
  RetryManager,
  MemoryManager,
  TokenGenerator,
  SecuritySanitizer,
  AuditLogger,
  SecurityMiddleware,
  SecurityConfig,
  globalRateLimiter,
  globalRetryManager,
  globalMemoryManager,
  globalAuditLogger,
  globalSecurityMiddleware
} from './utils/security';
export type { AuditEvent } from './utils/security';

export {
  ConnectionPool,
  LRUCache,
  BatchProcessor,
  MetricsCollector,
  ResourceMonitor,
  globalConnectionPool,
  globalMetricsCollector,
  globalResourceMonitor,
  metadataCache,
  accountCache,
  configCache
} from './utils/performance';

export {
  Logger,
  ChildLogger,
  StructuredLogger,
  LogConfig,
  configureLogger,
  globalLogger,
  timed,
  audited,
  LogLevel
} from './utils/logging';
export type { LogEntry, LoggerConfig } from './utils/logging';

export {
  ProductionTestSuite
} from './testing/production-tests';
export type { TestResult, TestSuite, TestReport } from './testing/production-tests';

// ============================================================================
// Utility Exports
// ============================================================================

export { 
  ConfigValidator,
  RuntimeValidator,
  InputSanitizer,
  SecurityValidator
} from './utils/validation';

export { 
  MainframeSDKError,
  ErrorFactory,
  ErrorCodes,
  ErrorUtils,
  ErrorLogger,
  defaultErrorLogger
} from './utils/errors';
export type { ErrorReporter } from './utils/errors';

// ============================================================================
// Schema Exports for Validation
// ============================================================================

export { 
  AgentConfigSchema,
  MainframeConfigSchema
} from './types';

// ============================================================================
// Version and Constants
// ============================================================================

export const SDK_VERSION = '1.0.0';
export const SUPPORTED_NETWORKS = ['mainnet-beta', 'devnet', 'testnet'] as const;
export const SUPPORTED_STORAGE_PROVIDERS = ['ipfs', 'arweave'] as const;
export const SUPPORTED_WALLETS = ['Phantom', 'Solflare', 'Backpack', 'Glow'] as const;

// ============================================================================
// Quick Start Helpers
// ============================================================================

/**
 * Quick setup for common configurations
 */
export const QuickStart = {
  /**
   * Create a production-ready mainnet SDK
   */
  mainnet: (options: { 
    ipfsApiKey?: string; 
    arweaveWallet?: string; 
  } = {}) => {
    return MainframeSDKFactory.createMainnet({
      storage: {
        primary: 'arweave',
        fallback: ['arweave'],
        ipfs: {
          gateway: 'https://ipfs.io/ipfs/',
          api: 'https://api.pinata.cloud',
          ...(options.ipfsApiKey && { apiKey: options.ipfsApiKey })
        },
        arweave: {
          gateway: 'https://arweave.net',
          ...(options.arweaveWallet && { wallet: options.arweaveWallet })
        }
      }
    });
  },

  /**
   * Create a development SDK with devnet
   */
  development: () => {
    return MainframeSDKFactory.createDevnet({
      development: {
        mockWallet: false,
        mockStorage: false,
        logLevel: 'debug'
      }
    });
  },

  /**
   * Create a testing SDK with all mocks enabled (UNIT TESTING ONLY)
   */
  testing: () => {
    ensureTestingOnly('QuickStart.testing()');
    return MainframeSDKFactory.createMock({
      development: {
        mockWallet: true,
        mockStorage: true,
        logLevel: 'debug',
        skipFees: true
      }
    });
  }
};

// ============================================================================
// Integration Exports (Toolkit Compatibility)
// ============================================================================

// Anchor Framework Integration
export {
  AnchorMainframeSDK,
  AnchorUtils
} from './integrations/anchor';
export type {
  AnchorMainframeConfig,
  AnchorTransactionBuilder
} from './integrations/anchor';

// Wallet Adapter Integration
export {
  WalletAdapterMainframeSDK,
  WalletAdapterUtils,
  createWalletAdapterSDK
} from './integrations/wallet-adapters';

// General Toolkit Integration
export {
  ToolkitMainframeSDK,
  TokenAccountUtils,
  CrossChainUtils,
  TransactionBuilderUtils,
  ToolkitIntegration,
  createToolkitSDK,
  createFromConnection
} from './integrations/solana-toolkit';

// Integration Factory and Quick Setup
export {
  IntegrationFactory,
  QuickIntegration
} from './integrations';

// ============================================================================
// Enhanced Quick Start with Integrations
// ============================================================================

/**
 * Enhanced QuickStart with toolkit integrations
 */
export const QuickStartIntegrations = {
  /**
   * For @coral-xyz/anchor developers
   */
  anchor: (provider: any, config: Partial<MainframeConfig> = {}) => {
    const { AnchorIntegrationHelpers } = require('./integrations/anchor');
    return AnchorIntegrationHelpers.fromAnchorProvider(provider, config);
  },

  /**
   * For @solana/wallet-adapter-react developers  
   */
  walletAdapter: (adapter: any, connection: any, config: Partial<MainframeConfig> = {}) => {
    const { WalletAdapterUtils } = require('./integrations/wallet-adapters');
    return WalletAdapterUtils.fromWalletContext(adapter, connection, config);
  },

  /**
   * For anza-xyz/kit or gillsdk/gill developers
   */
  toolkit: (connection: any, wallet: any, config: Partial<MainframeConfig> = {}) => {
    const { ToolkitIntegration } = require('./integrations/solana-toolkit');
    return ToolkitIntegration.fromConnection(connection, wallet, config);
  },

  /**
   * Auto-detect and integrate with available toolkit
   */
  auto: (context: any) => {
    const { IntegrationFactory } = require('./integrations');
    return IntegrationFactory.auto(context);
  }
};

// ============================================================================
// Example Usage Documentation  
// ============================================================================

/**
 * @example
 * Basic SDK Usage:
 * 
 * ```typescript
 * import { createMainnetSDK, AgentConfig } from '@maikers/mainframe-sdk';
 * 
 * // Initialize SDK
 * const sdk = createMainnetSDK();
 * await sdk.initialize('Phantom');
 * 
 * // Create agent
 * const agentConfig: AgentConfig = {
 *   name: 'My Trading Bot',
 *   description: 'Automated DeFi trading assistant',
 *   purpose: 'Execute optimized trading strategies',
 *   personality: {
 *     traits: ['analytical', 'risk-aware'],
 *     style: 'professional'
 *   },
 *   capabilities: [{
 *     type: 'defi',
 *     plugins: ['jupiter-swap'],
 *     config: { maxSlippage: 0.5 }
 *   }],
 *   framework: 'elizaOS',
 *   plugins: [],
 *   runtime: {
 *     memory: { type: 'redis' },
 *     scheduling: { enabled: true },
 *     monitoring: { enabled: true }
 *   },
 *   permissions: {
 *     maxTradeSize: '1000 USDC',
 *     allowedTokens: ['SOL', 'USDC']
 *   },
 *   preferences: {
 *     notifications: true,
 *     riskLevel: 'medium'
 *   }
 * };
 * 
 * const result = await sdk.createAgent('YOUR_NFT_MINT', agentConfig);
 * console.log('Agent created:', result.agentAccount);
 * 
 * // Listen for events
 * sdk.events.onAgentDeployed(result.agentAccount, (event) => {
 *   console.log('Agent deployed:', event);
 * });
 * ```
 * 
 * @example
 * Quick Start Examples:
 * 
 * ```typescript
 * import { QuickStart } from '@maikers/mainframe-sdk';
 * 
 * // Production mainnet
 * const mainnetSDK = QuickStart.mainnet({ 
 *   ipfsApiKey: 'your-pinata-key' 
 * });
 * 
 * // Development
 * const devSDK = QuickStart.development();
 * 
 * // Testing with mocks
 * const testSDK = QuickStart.testing();
 * ```
 */
