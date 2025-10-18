/**
 * Main SDK class for Mainframe
 * 
 * Orchestrates all services and provides a unified API for developers
 * to interact with the Mainframe protocol.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import type { 
  MainframeConfig, 
  AgentConfig, 
  AgentSummary,
  ActivateAgentResult, 
  UpdateAgentResult,
  TransferAgentResult,
  AgentAccountData,
  ValidationResult,
  WalletConnectionResult,
  WalletInfo
} from './types';
import { EncryptionService } from './services/encryption';
import { StorageService, MockStorageService } from './services/storage';
import { ProgramService } from './services/program';
import { WalletService, MockWalletService } from './services/wallet';
import { EventService, MockEventService } from './services/events';
import { CollectionService } from './services/collection';
import { DataAccessService } from './services/data-access';
import { ConfigValidator } from './utils/validation';
import { ErrorFactory, MainframeSDKError, defaultErrorLogger } from './utils/errors';
import { 
  globalRateLimiter, 
  globalSecurityMiddleware, 
  globalMemoryManager,
  SecurityConfig 
} from './utils/security';
import { 
  globalConnectionPool, 
  globalMetricsCollector, 
  globalResourceMonitor,
  metadataCache,
  accountCache
} from './utils/performance';
import { 
  Logger, 
  StructuredLogger, 
  configureLogger, 
  timed, 
  audited,
  LogLevel 
} from './utils/logging';

export class MainframeSDK {
  // Core configuration
  public readonly config: MainframeConfig;
  public readonly connection: Connection;

  // Services
  public readonly encryption: EncryptionService;
  public readonly storage: StorageService;
  public readonly program: ProgramService;
  public readonly wallet: WalletService;
  public readonly events: EventService;
  public readonly collection: CollectionService;
  public readonly dataAccess: DataAccessService;

  // Production utilities
  protected readonly logger: StructuredLogger;
  private readonly sessionId: string;
  private healthCheckInterval?: NodeJS.Timeout | undefined;

  // State
  private initialized: boolean = false;
  private provider?: AnchorProvider;

  constructor(config: MainframeConfig) {
    // Validate configuration
    ConfigValidator.validateMainframeConfigStrict(config);
    this.config = config;

    // Configure logging based on environment
    const environment = config.development?.logLevel === 'debug' ? 'development' : 'production';
    configureLogger(environment);

    // Initialize session
    this.sessionId = require('./utils/security').TokenGenerator.generateSessionId();
    this.logger = new StructuredLogger('MainframeSDK');

    // Initialize connection (pooling will be used asynchronously later)
    this.connection = new Connection(
      config.rpcEndpoint,
      {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      }
    );

    // Initialize services
    this.encryption = new EncryptionService(config);
    
    // Use mock services in testing mode ONLY
    if (config.development?.mockStorage) {
      // CRITICAL: Prevent mock usage in production AND development
      if (process.env.NODE_ENV !== 'test') {
        throw ErrorFactory.internalError(
          'SECURITY ERROR: Mock storage can ONLY be used in testing environment (NODE_ENV=test). ' +
          'Mock services are not allowed in development or production.'
        );
      }
      this.storage = new MockStorageService(config);
    } else {
      this.storage = new StorageService(config);
    }

    this.program = new ProgramService(
      config,
      this.connection,
      this.encryption,
      this.storage
    );

    if (config.development?.mockWallet) {
      // CRITICAL: Prevent mock usage in production AND development
      if (process.env.NODE_ENV !== 'test') {
        throw ErrorFactory.internalError(
          'SECURITY ERROR: Mock wallet can ONLY be used in testing environment (NODE_ENV=test). ' +
          'Mock services are not allowed in development or production.'
        );
      }
      this.wallet = new MockWalletService(config) as any;
    } else {
      this.wallet = new WalletService(config);
    }

    if (config.development?.mockStorage) {
      // CRITICAL: Prevent mock usage in production AND development
      if (process.env.NODE_ENV !== 'test') {
        throw ErrorFactory.internalError(
          'SECURITY ERROR: Mock events can ONLY be used in testing environment (NODE_ENV=test). ' +
          'Mock services are not allowed in development or production.'
        );
      }
      this.events = new MockEventService(config, this.connection);
    } else {
      this.events = new EventService(config, this.connection);
    }

    // Initialize collection and data access services
    this.collection = new CollectionService(config, this.connection);
    this.dataAccess = new DataAccessService(
      config,
      this.connection,
      this.encryption,
      this.collection
    );

    // Initialize production monitoring
    this.initializeProductionFeatures();

    this.logger.info('MainframeSDK initialized', {
      sessionId: this.sessionId,
      network: config.solanaNetwork,
      version: '1.0.0'
    });
  }

  /**
   * Initialize production features
   */
  private initializeProductionFeatures(): void {
    // Start resource monitoring
    globalResourceMonitor.startMonitoring();
    
    // Add health checks
    globalResourceMonitor.addHealthCheck('rpc_connection', async () => {
      try {
        const slot = await this.connection.getSlot();
        return slot > 0;
      } catch {
        return false;
      }
    });

    globalResourceMonitor.addHealthCheck('memory_usage', async () => {
      const usage = globalMemoryManager.getMemoryUsage();
      return usage.percentage < 0.9; // Less than 90% memory usage
    });

    // Start periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      const health = await globalResourceMonitor.runHealthChecks();
      if (!health.healthy) {
        this.logger.warn('Health check failed', { health });
      }
    }, 60000); // Every minute

    // Configure security based on config
    SecurityConfig.updateConfig({
      rateLimiting: {
        enabled: !this.config.development?.skipFees,
        maxRequests: 1000,
        windowMs: 60000
      },
      audit: {
        enabled: true,
        logSensitiveOperations: this.config.development?.logLevel === 'debug'
      }
    });
  }

  /**
   * Initialize the SDK with wallet connection
   */
  async initialize(walletName?: string): Promise<WalletConnectionResult> {
    try {
      if (this.initialized) {
        throw ErrorFactory.internalError('SDK already initialized');
      }

      // Initialize encryption service
      await this.encryption.initialize();

      // Connect wallet
      const walletResult = await this.wallet.connect(walletName);
      
      if (!this.wallet.getPublicKey()) {
        throw ErrorFactory.walletNotConnected();
      }

      // Create Anchor provider if not in mock mode
      if (!this.config.development?.mockWallet) {
        const walletInfo = this.wallet.getWalletInfo();
        if (walletInfo) {
          this.provider = new AnchorProvider(
            this.connection,
            walletInfo as any, // Cast to anchor wallet interface
            {
              commitment: 'confirmed',
              skipPreflight: false
            }
          );
        }
      } else {
        // Create mock provider for testing
        const mockWallet = {
          publicKey: this.wallet.getPublicKey()!,
          signTransaction: async (tx: any) => tx,
          signAllTransactions: async (txs: any[]) => txs
        };
        this.provider = new AnchorProvider(
          this.connection,
          mockWallet as any,
          {
            commitment: 'confirmed',
            skipPreflight: false
          }
        );
      }

      // Initialize program service with wallet
      await this.program.initialize(this.wallet.getPublicKey()!, this.provider);

      // Initialize event service
      await this.events.initialize();

      // Initialize collection and data access services
      if (this.wallet.getPublicKey()) {
        const walletInfo = await this.wallet.getWalletInfo();
        if (walletInfo) {
          await this.collection.initialize(walletInfo);
        }
      }
      await this.dataAccess.initialize();

      this.initialized = true;

      this.logger.info('SDK initialization completed', {
        walletName: walletResult.walletName,
        sessionId: this.sessionId
      });
      
      return walletResult;

    } catch (error) {
      await defaultErrorLogger.logError(
        MainframeSDKError.isMainframeError(error) 
          ? error 
          : ErrorFactory.internalError('SDK initialization failed', error as Error)
      );
      throw error;
    }
  }

  /**
   * Initialize without wallet (read-only mode)
   */
  async initializeReadOnly(): Promise<void> {
    try {
      if (this.initialized) {
        throw ErrorFactory.internalError('SDK already initialized');
      }

      // Initialize encryption service
      await this.encryption.initialize();

      // Initialize event service without program
      await this.events.initialize();

      // Initialize data access service for read-only operations
      await this.dataAccess.initialize();

      this.initialized = true;

      this.logger.info('SDK initialized in read-only mode', {
        sessionId: this.sessionId
      });

    } catch (error) {
      await defaultErrorLogger.logError(
        MainframeSDKError.isMainframeError(error)
          ? error
          : ErrorFactory.internalError('Read-only initialization failed', error as Error)
      );
      throw error;
    }
  }

  /**
   * Auto-connect to previously connected wallet
   */
  async autoConnect(): Promise<WalletConnectionResult | null> {
    try {
      const result = await this.wallet.autoConnect();
      
      if (result && !this.initialized) {
        await this.program.initialize(this.wallet.getPublicKey()!);
        await this.events.initialize();
        this.initialized = true;
        this.logger.info('Auto-connected and initialized SDK', {
          walletPublicKey: this.wallet.getPublicKey()?.toBase58()
        });
      }

      return result;

    } catch (error) {
      this.logger.warn('Auto-connect failed', error as Error);
      return null;
    }
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.info('Starting SDK cleanup', { sessionId: this.sessionId });

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = undefined;
      }

      // Cleanup services
      await this.events.cleanup();
      await this.wallet.disconnect();
      
      // Cleanup production utilities
      globalResourceMonitor.stopMonitoring();
      globalMemoryManager.cleanup();
      
      // Force memory cleanup
      globalMemoryManager.forceGC();

      this.initialized = false;
      
      this.logger.info('SDK cleanup completed', { sessionId: this.sessionId });

    } catch (error) {
      this.logger.warn('Warning during cleanup', error as Error);
    }
  }

  // ============================================================================
  // High-Level Agent Operations
  // ============================================================================

  /**
   * Create and activate an AI agent
   */
  async createAgent(
    nftMint: string,
    agentConfig: AgentConfig,
    options?: {
      seller?: string;
      affiliateBps?: number;
    }
  ): Promise<ActivateAgentResult> {
    this.ensureInitialized();

    // Rate limiting and security validation
    const walletKey = this.wallet.getPublicKey()?.toBase58() || 'anonymous';
    await globalSecurityMiddleware.validateOperation('create_agent', walletKey, async () => {
      return this.performAgentCreation(nftMint, agentConfig, walletKey, options);
    });

    return this.performAgentCreation(nftMint, agentConfig, walletKey, options);
  }

  /**
   * Internal agent creation logic
   */
  private async performAgentCreation(
    nftMint: string,
    agentConfig: AgentConfig,
    walletKey: string,
    options?: {
      seller?: string;
      affiliateBps?: number;
    }
  ): Promise<ActivateAgentResult> {
    const timer = globalMetricsCollector.startTimer('agent_creation');
    
    try {
      // Validate agent configuration
      ConfigValidator.validateAgentConfigStrict(agentConfig);

      // Check cache first
      const cacheKey = `agent_${nftMint}`;
      const cached = accountCache.get(cacheKey);
      if (cached) {
        this.logger.info('Agent creation skipped - already exists', {
          nftMint,
          walletAddress: walletKey
        });
        return cached;
      }

      this.logger.info('Creating agent', {
        nftMint,
        agentName: agentConfig.name,
        walletAddress: walletKey,
        seller: options?.seller,
        affiliateBps: options?.affiliateBps
      });

      const txOptions: any = {};
      if (options?.seller !== undefined) txOptions.seller = options.seller;
      if (options?.affiliateBps !== undefined) txOptions.affiliateBps = options.affiliateBps;
      
      const result = await this.program.activateAgent(nftMint, agentConfig, txOptions);
      
      // Cache the result
      accountCache.set(cacheKey, result);
      
      // Record metrics
      globalMetricsCollector.incrementCounter('agents_created');
      globalMetricsCollector.recordMetric('agent_creation_success', 1);

      this.logger.info('Agent created successfully', {
        agentAccount: result.agentAccount,
        nftMint,
        walletAddress: walletKey
      });

      return result;

    } catch (error) {
      // Record failure metrics
      globalMetricsCollector.recordMetric('agent_creation_failure', 1);
      
      const wrappedError = MainframeSDKError.isMainframeError(error)
        ? error
        : ErrorFactory.internalError('Failed to create agent', error as Error);
      
      this.logger.error('Agent creation failed', wrappedError, {
        nftMint,
        walletAddress: walletKey
      });
      
      await defaultErrorLogger.logError(wrappedError);
      throw wrappedError;
    } finally {
      globalMetricsCollector.endTimer('agent_creation');
    }
  }

  /**
   * Update an existing agent's configuration
   */
  async updateAgent(
    agentAccount: string,
    newConfig: Partial<AgentConfig>
  ): Promise<UpdateAgentResult> {
    this.ensureInitialized();

    try {
      // Get current configuration
      const currentAgent = await this.program.getAgentAccount(agentAccount);
      const currentConfig = await this.getAgentConfiguration(agentAccount);
      
      // Merge configurations
      const mergedConfig = { ...currentConfig, ...newConfig };
      
      // Validate merged configuration
      ConfigValidator.validateAgentConfigStrict(mergedConfig);

      console.log(`🔄 Updating agent: ${agentAccount}`);
      const result = await this.program.updateAgentConfig(agentAccount, mergedConfig);
      
      console.log('✅ Agent updated successfully');
      return result;

    } catch (error) {
      const wrappedError = MainframeSDKError.isMainframeError(error)
        ? error
        : ErrorFactory.internalError('Failed to update agent', error as Error);
      
      await defaultErrorLogger.logError(wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Transfer agent ownership
   */
  async transferAgent(
    agentAccount: string,
    newOwner: string
  ): Promise<TransferAgentResult> {
    this.ensureInitialized();

    try {
      console.log(`🔄 Transferring agent ${agentAccount} to ${newOwner}`);
      const result = await this.program.transferAgent(agentAccount, newOwner);
      
      console.log('✅ Agent transferred successfully');
      return result;

    } catch (error) {
      const wrappedError = MainframeSDKError.isMainframeError(error)
        ? error
        : ErrorFactory.internalError('Failed to transfer agent', error as Error);
      
      await defaultErrorLogger.logError(wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Pause an agent
   */
  async pauseAgent(agentAccount: string): Promise<string> {
    this.ensureInitialized();

    try {
      console.log(`⏸️ Pausing agent: ${agentAccount}`);
      const signature = await this.program.pauseAgent(agentAccount);
      
      console.log('✅ Agent paused successfully');
      return signature;

    } catch (error) {
      const wrappedError = MainframeSDKError.isMainframeError(error)
        ? error
        : ErrorFactory.internalError('Failed to pause agent', error as Error);
      
      await defaultErrorLogger.logError(wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Resume a paused agent
   */
  async resumeAgent(agentAccount: string): Promise<string> {
    this.ensureInitialized();

    try {
      console.log(`▶️ Resuming agent: ${agentAccount}`);
      const signature = await this.program.resumeAgent(agentAccount);
      
      console.log('✅ Agent resumed successfully');
      return signature;

    } catch (error) {
      const wrappedError = MainframeSDKError.isMainframeError(error)
        ? error
        : ErrorFactory.internalError('Failed to resume agent', error as Error);
      
      await defaultErrorLogger.logError(wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Close an agent permanently
   */
  async closeAgent(agentAccount: string): Promise<string> {
    this.ensureInitialized();

    try {
      console.log(`🔒 Closing agent: ${agentAccount}`);
      const signature = await this.program.closeAgent(agentAccount);
      
      console.log('✅ Agent closed successfully');
      return signature;

    } catch (error) {
      const wrappedError = MainframeSDKError.isMainframeError(error)
        ? error
        : ErrorFactory.internalError('Failed to close agent', error as Error);
      
      await defaultErrorLogger.logError(wrappedError);
      throw wrappedError;
    }
  }

  // ============================================================================
  // Agent Information and Management
  // ============================================================================

  /**
   * Get all agents owned by the current wallet
   */
  async getMyAgents(): Promise<AgentSummary[]> {
    this.ensureWalletConnected();

    try {
      const walletKey = this.wallet.getPublicKey()!;
      const agents = await this.program.getAgentsByOwner(walletKey);

      const summaries = await Promise.all(
        agents.map(async (agent) => {
          try {
            const config = await this.getAgentConfiguration(agent.nftMint);
            return {
              account: agent.nftMint, // Using nftMint as account identifier
              name: config?.name || 'Unknown Agent',
              status: agent.status,
              lastUpdate: new Date(agent.updatedAt * 1000),
              nftMint: agent.nftMint
            };
          } catch (error) {
            // Return basic info if configuration can't be decrypted
            return {
              account: agent.nftMint,
              name: 'Encrypted Agent',
              status: agent.status,
              lastUpdate: new Date(agent.updatedAt * 1000),
              nftMint: agent.nftMint
            };
          }
        })
      );

      return summaries;

    } catch (error) {
      throw ErrorFactory.internalError('Failed to get agents', error as Error);
    }
  }

  /**
   * Get agent account data
   */
  async getAgentAccount(agentAccount: string): Promise<AgentAccountData> {
    try {
      return await this.program.getAgentAccount(agentAccount);
    } catch (error) {
      throw ErrorFactory.internalError('Failed to get agent account', error as Error);
    }
  }

  /**
   * Get decrypted agent configuration
   */
  async getAgentConfiguration(agentAccount: string): Promise<AgentConfig> {
    this.ensureWalletConnected();

    try {
      const agentData = await this.program.getAgentAccount(agentAccount);
      const encrypted = await this.storage.fetchMetadata(agentData.metadataUri);
      
      // Get wallet secret key for decryption
      if (!this.wallet.getSecretKey) {
        throw ErrorFactory.internalError(
          'Wallet does not support secret key access. Cannot decrypt agent configuration.'
        );
      }
      
      const walletSecretKey = this.wallet.getSecretKey();
      
      const config = await this.encryption.decryptAgentConfig(encrypted, walletSecretKey);
      return config;

    } catch (error) {
      throw ErrorFactory.decryptionFailed(error as Error);
    }
  }

  // ============================================================================
  // Protocol Information
  // ============================================================================

  /**
   * Get protocol configuration and stats
   */
  async getProtocolInfo() {
    try {
      const config = await this.program.getProtocolConfig();
      return {
        ...config,
        sdk: {
          version: '1.0.0',
          network: this.config.solanaNetwork,
          programId: this.config.programId
        }
      };
    } catch (error) {
      throw ErrorFactory.internalError('Failed to get protocol info', error as Error);
    }
  }

  /**
   * Get current wallet balance
   */
  async getWalletBalance(): Promise<number> {
    this.ensureWalletConnected();

    try {
      return await this.wallet.getBalance(this.connection);
    } catch (error) {
      throw ErrorFactory.networkError('get wallet balance', error as Error);
    }
  }

  // ============================================================================
  // PoC-Compatible Methods
  // ============================================================================

  /**
   * Create Mainframe Agents collection (PoC Compatible)
   */
  async createMainframeAgentsCollection(): Promise<string> {
    this.ensureWalletConnected();

    try {
      const walletInfo = await this.wallet.getWalletInfo();
      if (!walletInfo) {
        throw ErrorFactory.walletNotConnected();
      }

      this.logger.info('Creating Mainframe Agents collection');
      const collectionAddress = await this.collection.createMainframeAgentsCollection(walletInfo);
      
      this.logger.info('Mainframe Agents collection created', {
        collectionAddress
      });
      return collectionAddress;

    } catch (error) {
      const wrappedError = MainframeSDKError.isMainframeError(error)
        ? error
        : ErrorFactory.internalError('Failed to create collection', error as Error);
      
      await defaultErrorLogger.logError(wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Create agent with hybrid data architecture (PoC Compatible)
   */
  async createAgentWithHybridData(
    verifiedNFT: any,
    agentName: string,
    agentConfig: AgentConfig,
    collectionAddress: string
  ): Promise<{ mint: string; metadata: any; collection: string }> {
    this.ensureWalletConnected();

    try {
      // Validate agent configuration
      ConfigValidator.validateAgentConfigStrict(agentConfig);

      const userWallet = await this.wallet.getWalletInfo();
      const protocolInfo = await this.getProtocolInfo();
      
      if (!userWallet || !protocolInfo) {
        throw ErrorFactory.walletNotConnected();
      }

      // Validate verified collection
      this.collection.validateVerifiedCollection(verifiedNFT);

      this.logger.info('Creating agent with hybrid data', {
        agentName,
        nftMint: verifiedNFT.name
      });
      
      // Create protocol wallet info from treasury address
      const protocolWallet: WalletInfo = {
        publicKey: protocolInfo.protocolTreasury,
        secretKey: '', // Protocol wallet secret not exposed to SDK
        keypair: null
      };

      // Create secure block first
      const secureBlock = await this.encryption.buildSecure(
        'pending_mint_address', // Will be updated with actual mint
        userWallet,
        protocolWallet,
        agentConfig
      );

      // Create agent NFT with collection membership
      const result = await this.collection.createAgentNFT(
        verifiedNFT,
        agentName,
        agentConfig,
        userWallet,
        protocolWallet,
        collectionAddress,
        secureBlock
      );

      this.logger.info('Agent created with hybrid architecture', {
        mintAddress: result.mint,
        agentName
      });
      return result;

    } catch (error) {
      const wrappedError = MainframeSDKError.isMainframeError(error)
        ? error
        : ErrorFactory.internalError('Failed to create agent with hybrid data', error as Error);
      
      await defaultErrorLogger.logError(wrappedError);
      throw wrappedError;
    }
  }

  // Test methods moved to DevelopmentSDK for security
  // See src/development/development-sdk.ts for test utilities

  // PoC demonstration moved to DevelopmentSDK for security

  // Test encryption flow moved to DevelopmentSDK for security

  // Protocol wallet info and test wallet generation moved to DevelopmentSDK

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Validate agent configuration
   */
  validateAgentConfig(config: AgentConfig): ValidationResult {
    return ConfigValidator.validateAgentConfig(config);
  }

  /**
   * Check if SDK is ready for operations
   */
  isReady(): boolean {
    return this.initialized && this.wallet.isConnected();
  }

  /**
   * Get SDK status with production monitoring
   */
  async getStatus() {
    const healthStatus = await globalResourceMonitor.runHealthChecks();
    const memoryUsage = globalMemoryManager.getMemoryUsage();
    const metrics = globalMetricsCollector.getSummary();
    const connectionStats = globalConnectionPool.getStats();

    return {
      // Basic status
      initialized: this.initialized,
      walletConnected: this.wallet.isConnected(),
      walletAddress: this.wallet.getPublicKey()?.toBase58(),
      network: this.config.solanaNetwork,
      version: '1.0.0',
      sessionId: this.sessionId,

      // Health monitoring
      health: {
        overall: healthStatus.healthy,
        checks: healthStatus.checks,
        lastChecked: healthStatus.timestamp
      },

      // Performance metrics
      performance: {
        memory: {
          usage: memoryUsage.percentage,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal
        },
        connections: {
          active: connectionStats.totalConnections,
          max: connectionStats.maxConnections
        },
        operations: {
          total: metrics.totalMetrics,
          slowest: metrics.slowestOperations[0]?.name || 'none',
          mostFrequent: metrics.mostFrequentOperations[0]?.name || 'none'
        }
      },

      // Cache statistics
      cache: {
        metadata: metadataCache.getStats(),
        accounts: accountCache.getStats()
      }
    };
  }

  /**
   * Get detailed performance metrics
   */
  getPerformanceMetrics() {
    return {
      metrics: globalMetricsCollector.getAllMetrics(),
      summary: globalMetricsCollector.getSummary(),
      memory: globalMemoryManager.getMemoryUsage(),
      connections: globalConnectionPool.getStats(),
      security: {
        rateLimiter: globalRateLimiter.getStats ? globalRateLimiter.getStats() : 'N/A',
        config: SecurityConfig.getConfig()
      }
    };
  }

  /**
   * Force system health check
   */
  async checkHealth() {
    return await globalResourceMonitor.runHealthChecks();
  }

  /**
   * Force memory cleanup
   */
  forceMemoryCleanup(): void {
    globalMemoryManager.forceGC();
    metadataCache.clear();
    accountCache.clear();
    this.logger.info('Forced memory cleanup completed');
  }

  /**
   * Get supported wallet list
   */
  getSupportedWallets() {
    return this.wallet.getAvailableWallets();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw ErrorFactory.internalError('SDK not initialized. Call initialize() first.');
    }
  }

  protected ensureWalletConnected(): void {
    this.ensureInitialized();
    if (!this.wallet.isConnected()) {
      throw ErrorFactory.walletNotConnected();
    }
  }
}

// ============================================================================
// SDK Factory and Utilities
// ============================================================================

export class MainframeSDKFactory {
  /**
   * Create SDK with default mainnet configuration
   */
  static createMainnet(options: Partial<MainframeConfig> = {}): MainframeSDK {
    const defaultConfig: MainframeConfig = {
      solanaNetwork: 'mainnet-beta',
      rpcEndpoint: 'https://api.mainnet-beta.solana.com',
      programId: 'mnfm211AwTDA8fGvPezYs3jjxAXgoucHGuTMUbjFssE',
      protocolWallet: 'PROTOCOL_WALLET_PUBKEY_HERE',
      storage: {
        arweave: {
          gateway: 'https://arweave.net'
        }
      }
    };

    const config = { ...defaultConfig, ...options };
    return new MainframeSDK(config);
  }

  /**
   * Create SDK with devnet configuration
   */
  static createDevnet(options: Partial<MainframeConfig> = {}): MainframeSDK {
    const defaultConfig: MainframeConfig = {
      solanaNetwork: 'devnet',
      rpcEndpoint: 'https://api.devnet.solana.com',
      programId: 'DEV_PROGRAM_ID_HERE',
      protocolWallet: 'DEV_PROTOCOL_WALLET_PUBKEY_HERE',
      storage: {
        arweave: {
          gateway: 'https://arweave.net'
        }
      },
      development: {
        mockWallet: false,
        mockStorage: false,
        logLevel: 'debug'
      }
    };

    const config = { ...defaultConfig, ...options };
    return new MainframeSDK(config);
  }

  /**
   * Create SDK with mock services for testing (UNIT TESTING ONLY)
   */
  static createMock(options: Partial<MainframeConfig> = {}): MainframeSDK {
    // CRITICAL: Prevent mock SDK creation in production AND development
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'SECURITY ERROR: Mock SDK can ONLY be created in testing environment (NODE_ENV=test). ' +
        'Mock services are not allowed in development or production. Use createMainnet() or createDevnet() instead.'
      );
    }

    const defaultConfig: MainframeConfig = {
      solanaNetwork: 'devnet',
      rpcEndpoint: 'https://api.devnet.solana.com',
      programId: '11111111111111111111111111111111',
      protocolWallet: '11111111111111111111111111111112',
      storage: {
        arweave: {
          gateway: 'https://arweave.net'
        }
      },
      development: {
        mockWallet: true,
        mockStorage: true,
        logLevel: 'debug',
        skipFees: true
      }
    };

    const config = { ...defaultConfig, ...options };
    return new MainframeSDK(config);
  }
}

// Export SDK instance creation helpers
export const createMainframeSDK = (config: MainframeConfig) => new MainframeSDK(config);
export const createMainnetSDK = (options?: Partial<MainframeConfig>) => 
  MainframeSDKFactory.createMainnet(options);
export const createDevnetSDK = (options?: Partial<MainframeConfig>) => 
  MainframeSDKFactory.createDevnet(options);
export const createMockSDK = (options?: Partial<MainframeConfig>) => {
  // CRITICAL: Prevent mock SDK creation in production AND development
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'SECURITY ERROR: createMockSDK can ONLY be used in testing environment (NODE_ENV=test). ' +
      'Mock services are not allowed in development or production. Use createMainnetSDK() or createDevnetSDK() instead.'
    );
  }
  return MainframeSDKFactory.createMock(options);
};
