/**
 * Development-only SDK extensions
 * 
 * Contains test methods and development utilities that should NEVER
 * be available in production builds.
 */

import { MainframeSDK } from '../sdk';
import { ErrorFactory, MainframeSDKError } from '../utils/errors';
import type { WalletInfo, AgentConfig } from '../types';

/**
 * Testing SDK Extension
 * 
 * SECURITY NOTE: This class should ONLY be used in unit testing
 * environments. It contains methods that could expose sensitive data
 * or create security vulnerabilities if used in development or production.
 */
export class TestingSDK extends MainframeSDK {
  
  constructor(config: any) {
    // CRITICAL: Prevent usage in production AND development
    if (process.env.NODE_ENV !== 'test') {
      throw ErrorFactory.internalError(
        'SECURITY ERROR: TestingSDK can ONLY be used in testing environment (NODE_ENV=test). ' +
        'This class contains test methods that are not allowed in development or production.'
      );
    }
    
    super(config);
  }

  /**
   * Test encryption/decryption flow (UNIT TESTING ONLY)
   */
  async testEncryptionFlow(): Promise<void> {
    this.ensureWalletConnected();

    try {
      const userWallet = await this.wallet.getWalletInfo();
      const protocolWallet = await this.getProtocolWalletInfo();
      const unauthorizedWallet = this.generateTestWallet();

      if (!userWallet || !protocolWallet) {
        throw ErrorFactory.walletNotConnected();
      }

      await this.encryption.testEncryptionFlow(
        '11111111111111111111111111111111', // Test mint address
        userWallet,
        protocolWallet,
        unauthorizedWallet
      );

    } catch (error) {
      throw ErrorFactory.internalError('Encryption flow test failed', error as Error);
    }
  }

  /**
   * Test access control with different wallet types (UNIT TESTING ONLY)
   */
  async testAccessControl(
    mintAddress: string,
    agentMetadata: any
  ): Promise<any[]> {
    this.ensureWalletConnected();

    try {
      const userWallet = await this.wallet.getWalletInfo();
      const protocolWallet = await this.getProtocolWalletInfo();
      const unauthorizedWallet = this.generateTestWallet();

      if (!userWallet || !protocolWallet) {
        throw ErrorFactory.walletNotConnected();
      }

      this.logger.info('Testing access control with different wallet types');
      
      const results = await this.dataAccess.testDataAccess(
        mintAddress,
        agentMetadata,
        userWallet,
        protocolWallet,
        unauthorizedWallet
      );

      this.dataAccess.displayAccessResults(results);
      return results;

    } catch (error) {
      const wrappedError = MainframeSDKError.isMainframeError(error)
        ? error
        : ErrorFactory.internalError('Access control test failed', error as Error);
      
      console.error('Testing SDK Error:', wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Run full PoC demonstration (UNIT TESTING ONLY)
   */
  async runPoCDemo(): Promise<void> {
    this.ensureWalletConnected();

    try {
      this.logger.info('Starting Mainframe SDK PoC demonstration', {
        description: 'Demonstrating hybrid Metaplex Core AppData + encrypted metadata for AI agent NFTs'
      });

      // Step 1: Create collection
      const collectionAddress = await this.createMainframeAgentsCollection();

      // Step 2: Load sample verified NFT
      const verifiedNFT = this.collection.loadSampleVerifiedNFT();
      this.logger.info('Loaded verified NFT for demo', {
        nftName: verifiedNFT.name,
        collectionName: verifiedNFT.collection.name
      });

      // Step 3: Create sample agent config
      const agentConfig = this.encryption.createSampleAgentConfig('DeFi Trading Assistant');
      this.logger.info('Agent configuration created for demo', {
        agentName: agentConfig.name
      });

      // Step 4: Test encryption flow
      await this.testEncryptionFlow();

      // Step 5: Create agent with hybrid data
      const result = await this.createAgentWithHybridData(
        verifiedNFT,
        'DeFi Navigator',
        agentConfig,
        collectionAddress
      );

      // Step 6: Test access control
      await this.testAccessControl(result.mint, result.metadata);

      this.logger.info('PoC demonstration completed successfully', {
        message: 'SDK successfully demonstrates PoC functionality'
      });

    } catch (error) {
      this.logger.error('PoC demonstration failed', error as Error);
      throw error;
    }
  }

  /**
   * Generate test wallet for unauthorized access testing (UNIT TESTING ONLY)
   */
  private generateTestWallet(): any {
    const { Keypair } = require('@solana/web3.js');
    const bs58 = require('bs58');
    
    const keypair = Keypair.generate();
    return {
      publicKey: keypair.publicKey.toBase58(),
      secretKey: bs58.encode(keypair.secretKey),
      keypair
    };
  }

  /**
   * Get protocol wallet info (UNIT TESTING ONLY)
   */
  private async getProtocolWalletInfo(): Promise<any> {
    // Protocol wallet configuration from environment or config
    if (!this.config.development?.protocolWalletSecretKey) {
      throw ErrorFactory.internalError(
        'Protocol wallet secret key not configured. Set development.protocolWalletSecretKey in config.'
      );
    }
    
    return {
      publicKey: this.config.protocolWallet,
      secretKey: this.config.development.protocolWalletSecretKey,
      keypair: null // Will be derived from secret key when needed
    };
  }
}

/**
 * Factory for creating testing SDK instances
 */
export class TestingSDKFactory {
  
  /**
   * Create testing SDK with additional test methods
   * 
   * SECURITY WARNING: Only use in unit testing environments (NODE_ENV=test)
   */
  static createTestingSDK(config: any): TestingSDK {
    if (process.env.NODE_ENV !== 'test') {
      throw ErrorFactory.internalError(
        'SECURITY ERROR: TestingSDK can ONLY be created in testing environment (NODE_ENV=test). ' +
        'This is not allowed in development or production.'
      );
    }
    
    return new TestingSDK(config);
  }

  /**
   * Create PoC demonstration SDK (UNIT TESTING ONLY)
   */
  static createPoCSDK(config?: any): TestingSDK {
    const defaultConfig = {
      solanaNetwork: 'devnet',
      rpcEndpoint: 'https://api.devnet.solana.com',
      programId: 'DEV_PROGRAM_ID_HERE',
      protocolWallet: 'DEV_PROTOCOL_WALLET_HERE',
      storage: {
        primary: 'arweave',
        fallback: ['ipfs']
      },
      development: {
        mockWallet: false,
        mockStorage: false,
        logLevel: 'debug',
        protocolWalletSecretKey: 'dev_protocol_key_here'
      },
      ...config
    };
    
    return new TestingSDK(defaultConfig);
  }
}
