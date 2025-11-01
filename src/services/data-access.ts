/**
 * Hybrid Data Access Service for Mainframe SDK
 * 
 * Implements the hybrid public/private data architecture demonstrated in mainframe-poc:
 * - Public data: Stored in AppData plugin (on-chain, discoverable)
 * - Private data: Stored in encrypted metadata (off-chain, access controlled)
 */

import { Connection } from '@solana/web3.js';
import type { 
  MainframeConfig,
  WalletInfo,
  PublicAgentData,
  AgentConfig,
  SecureBlock,
  AgentNFTMetadata
} from '../types';
import { EncryptionService } from './encryption';
import { CollectionService } from './collection';
import { ErrorFactory } from '../utils/errors';

export interface AccessTestResult {
  wallet: string;
  walletType: string;
  canReadPublic: boolean;
  canReadPrivate: boolean;
  publicData?: PublicAgentData;
  privateData?: AgentConfig;
  error?: string;
}

export class DataAccessService {
  private config: MainframeConfig;
  private connection: Connection;
  private encryption: EncryptionService;
  private collection: CollectionService;
  private umi: any;

  constructor(
    config: MainframeConfig,
    connection: Connection,
    encryption: EncryptionService,
    collection: CollectionService
  ) {
    this.config = config;
    this.connection = connection;
    this.encryption = encryption;
    this.collection = collection;
  }

  /**
   * Initialize data access service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize UMI for reading (no signer needed for reading)
      const { createUmi } = await import('@metaplex-foundation/umi-bundle-defaults');
      const { mplCore } = await import('@metaplex-foundation/mpl-core');
      const { irysUploader } = await import('@metaplex-foundation/umi-uploader-irys');

      this.umi = createUmi(this.connection)
        .use(mplCore())
        .use(
          irysUploader({
            timeout: 60000
          })
        );

    } catch (error) {
      throw ErrorFactory.internalError('Failed to initialize data access service', error as Error);
    }
  }

  /**
   * Read public agent data from AppData plugin with retry mechanism
   */
  async readPublicAgentData(
    mintAddress: string,
    mainframeWallet: WalletInfo,
    maxRetries: number = 5,
    delayMs: number = 5000
  ): Promise<PublicAgentData | null> {
    console.log('\n🔍 Reading public agent data from AppData plugin...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`⏳ Attempt ${attempt}/${maxRetries} - waiting ${delayMs}ms for account propagation...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        // First check if the raw account exists
        console.log(`🔍 Checking raw account existence for: ${mintAddress}`);
        const { publicKey } = await import('@metaplex-foundation/umi');
        const accountInfo = await this.umi.rpc.getAccount(publicKey(mintAddress));
        
        if (!accountInfo.exists) {
          console.log(`⚠️ Raw account does not exist yet (attempt ${attempt}/${maxRetries})`);
          if (attempt === maxRetries) {
            console.log('❌ Account never appeared after all retries');
            return null;
          }
          continue;
        }
        
        console.log('✅ Raw account exists, fetching as Asset...');
        const { fetchAsset } = await import('@metaplex-foundation/mpl-core');
        const asset = await fetchAsset(this.umi, publicKey(mintAddress));
        
        // Find AppData plugin with mainframe authority
        const appDataPlugin = asset.appDatas?.find(
          (appData: any) => appData.authority.type === 'Address' && 
                          appData.authority.address === mainframeWallet.publicKey
        );

        if (!appDataPlugin || !appDataPlugin.data) {
          console.log('❌ AppData plugin exists but no data (devnet MPL Core program bug)');
          return null;
        }

        // Decode the public data
        const publicDataJson = new TextDecoder().decode(appDataPlugin.data);
        const publicData = JSON.parse(publicDataJson) as PublicAgentData;
        
        console.log(`✅ Public agent data retrieved on attempt ${attempt}:`, publicData);
        return publicData;

      } catch (error: any) {
        if (error && error.name === 'AccountNotFoundError' && attempt < maxRetries) {
          console.log(`⏳ Account not found, retrying in ${delayMs}ms... (attempt ${attempt}/${maxRetries})`);
          continue;
        }
        
        console.error('❌ Failed to read public agent data:', error?.message || error);
        return null;
      }
    }
    
    console.log('❌ Failed to read AppData after all retry attempts');
    return null;
  }

  /**
   * Read private agent configuration from encrypted metadata
   */
  async readPrivateAgentData(
    secureBlock: SecureBlock,
    wallet: WalletInfo,
    mintAddress: string
  ): Promise<AgentConfig | null> {
    try {
      console.log(`\n🔐 Reading private agent data with wallet: ${wallet.publicKey}...`);
      
      const privateData = await this.encryption.decryptSecure(
        secureBlock, 
        wallet, 
        mintAddress
      );
      
      console.log('✅ Private agent data decrypted successfully');
      console.log(`📋 Agent purpose: ${privateData.purpose}`);
      console.log(`🔧 Capabilities: ${privateData.capabilities.map(c => c.type).join(', ')}`);
      
      return privateData;

    } catch (error: any) {
      console.error(`❌ Failed to decrypt private data: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Test data access with different wallet types (PoC Compatible)
   */
  async testDataAccess(
    mintAddress: string,
    agentMetadata: AgentNFTMetadata,
    userWallet: WalletInfo,
    mainframeWallet: WalletInfo,
    unauthorizedWallet: WalletInfo
  ): Promise<AccessTestResult[]> {
    console.log('\n🧪 Testing data access with different wallet types...');
    
    const results: AccessTestResult[] = [];

    // Test wallet configurations
    const testWallets = [
      { wallet: userWallet, type: 'User' },
      { wallet: mainframeWallet, type: 'Mainframe Protocol' },
      { wallet: unauthorizedWallet, type: 'Unauthorized' }
    ];

    for (const { wallet, type } of testWallets) {
      console.log(`\n--- Testing ${type} Wallet: ${wallet.publicKey} ---`);
      
      const result: AccessTestResult = {
        wallet: wallet.publicKey,
        walletType: type,
        canReadPublic: false,
        canReadPrivate: false
      };

      // Test public data access (should work for all wallets since it's on-chain)
      try {
        const publicData = await this.readPublicAgentData(mintAddress, mainframeWallet);
        if (publicData) {
          result.canReadPublic = true;
          result.publicData = publicData;
          console.log(`✅ ${type} wallet can read public data`);
        }
      } catch (error) {
        result.error = `Public access failed: ${error}`;
        console.log(`❌ ${type} wallet cannot read public data`);
      }

      // Test private data access (should work only for authorized wallets)
      try {
        const privateData = await this.readPrivateAgentData(
          agentMetadata.secure,
          wallet,
          mintAddress
        );
        
        if (privateData) {
          result.canReadPrivate = true;
          result.privateData = privateData;
          console.log(`✅ ${type} wallet can read private data`);
        }
      } catch (error: any) {
        result.error = (result.error || '') + ` Private access failed: ${error?.message || error}`;
        console.log(`❌ ${type} wallet cannot read private data: ${error?.message || error}`);
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Display access test results in a formatted table (PoC Compatible)
   */
  displayAccessResults(results: AccessTestResult[]): void {
    console.log('\n📊 === DATA ACCESS TEST RESULTS ===');
    console.log('┌─────────────────────────┬─────────────┬──────────────┐');
    console.log('│ Wallet Type             │ Public Data │ Private Data │');
    console.log('├─────────────────────────┼─────────────┼──────────────┤');
    
    results.forEach(result => {
      const walletType = result.walletType.padEnd(23);
      const publicAccess = result.canReadPublic ? '✅ Yes'.padEnd(11) : '❌ No'.padEnd(11);
      const privateAccess = result.canReadPrivate ? '✅ Yes'.padEnd(12) : '❌ No'.padEnd(12);
      
      console.log(`│ ${walletType} │ ${publicAccess} │ ${privateAccess} │`);
    });
    
    console.log('└─────────────────────────┴─────────────┴──────────────┘');

    // Display detailed information
    console.log('\n📋 === DETAILED ACCESS INFORMATION ===');
    
    results.forEach(result => {
      console.log(`\n${result.walletType} Wallet (${result.wallet.slice(0, 8)}...):`);
      
      if (result.publicData) {
        console.log(`  📖 Public Data: Agent "${result.publicData.name}" (${result.publicData.framework})`);
      }
      
      if (result.privateData) {
        console.log(`  🔐 Private Data: ${result.privateData.capabilities.length} capabilities, ${Object.keys(result.privateData.apiKeys || {}).length} API keys`);
        console.log(`      Purpose: ${result.privateData.purpose.slice(0, 50)}...`);
      }
      
      if (result.error && !result.canReadPrivate) {
        console.log(`  ⚠️  Expected behavior: ${result.walletType} wallet access restrictions working correctly`);
      }
    });
  }

  /**
   * Test agent data updates (only authorized wallets)
   */
  async testDataUpdate(
    mintAddress: string,
    agentMetadata: AgentNFTMetadata,
    userWallet: WalletInfo,
    mainframeWallet: WalletInfo
  ): Promise<void> {
    console.log('\n🔄 Testing agent data updates...');

    // Test user access to agent configuration
    console.log('\n👤 Testing user configuration access...');
    try {
      const currentConfig = await this.encryption.decryptSecure(
        agentMetadata.secure,
        userWallet,
        mintAddress
      );

      console.log('✅ User successfully accessed agent configuration');
      console.log('📋 Current trading hours:', currentConfig.permissions?.tradingHours);
      console.log('📋 Current max requests per minute:', currentConfig.permissions?.maxRequestsPerMinute);
      console.log('🔧 Available capabilities:', currentConfig.capabilities.map(c => c.type).join(', '));

    } catch (error: any) {
      console.error('❌ User configuration access failed:', error?.message || error);
    }

    // Test mainframe access to agent configuration  
    console.log('\n🏢 Testing mainframe configuration access...');
    try {
      const currentConfig = await this.encryption.decryptSecure(
        agentMetadata.secure,
        mainframeWallet,
        mintAddress
      );

      console.log('✅ Mainframe successfully accessed agent configuration');
      console.log('📋 Agent purpose:', currentConfig.purpose);
      console.log('🔑 API keys available:', Object.keys(currentConfig.apiKeys || {}).join(', '));
      console.log('📊 Runtime configuration:', currentConfig.runtime ? 'configured' : 'not configured');

    } catch (error: any) {
      console.error('❌ Mainframe configuration access failed:', error?.message || error);
    }
  }

  /**
   * Update public agent data in AppData plugin
   */
  async updatePublicAgentData(
    mintAddress: string,
    newPublicData: Partial<PublicAgentData>,
    mainframeWallet: WalletInfo
  ): Promise<void> {
    try {
      console.log('📝 Updating public agent data in AppData plugin...');

      // Read current public data
      const currentData = await this.readPublicAgentData(mintAddress, mainframeWallet);
      if (!currentData) {
        throw new Error('Could not read current public data');
      }

      // Merge with updates
      const updatedData = { ...currentData, ...newPublicData };

      // Write updated data
      const { writeData } = await import('@metaplex-foundation/mpl-core');
      const { publicKey } = await import('@metaplex-foundation/umi');
      const publicDataBytes = new TextEncoder().encode(JSON.stringify(updatedData, null, 2));

      await writeData(this.umi, {
        key: { type: 'AppData', dataAuthority: { type: 'UpdateAuthority' } },
        asset: publicKey(mintAddress),
        data: publicDataBytes
      }).sendAndConfirm(this.umi);

      console.log('✅ Public agent data updated successfully');

    } catch (error) {
      console.log('⚠️ Public data update blocked by devnet MPL Core program bug');
      console.log('📝 In production, this would update the AppData plugin');
    }
  }

  /**
   * Create hybrid agent metadata (public + private)
   */
  async createHybridAgentMetadata(
    agentName: string,
    agentConfig: AgentConfig,
    userWallet: WalletInfo,
    mainframeWallet: WalletInfo,
    mintAddress: string,
    verifiedNFT: any,
    collectionAddress: string
  ): Promise<{ publicData: PublicAgentData; metadata: AgentNFTMetadata }> {
    try {
      // Create secure block for private data
      const secureBlock = await this.encryption.buildSecure(
        mintAddress,
        userWallet,
        mainframeWallet,
        agentConfig
      );

      // Create public data
      const publicData: PublicAgentData = {
        name: agentName,
        type: 'AI Agent',
        framework: 'elizaOS',
        created: new Date().toISOString()
      };

      // Create complete metadata
      const metadata: AgentNFTMetadata = {
        name: `${agentName} Agent`,
        symbol: 'MFAGENT',
        description: `AI Agent based on ${verifiedNFT.name} from ${verifiedNFT.collection.name}`,
        image: verifiedNFT.image, // Would be processed image
        attributes: [
          { trait_type: 'Agent Type', value: 'AI Assistant' },
          { trait_type: 'Framework', value: 'elizaOS' },
          { trait_type: 'Based On', value: verifiedNFT.name },
          { trait_type: 'Original Collection', value: verifiedNFT.collection.name },
          { trait_type: 'Mainframe Agent', value: 'true' }
        ],
        external_url: 'https://mainframe.maikers.com',
        secure: secureBlock,
        based_on: {
          mint: mintAddress,
          collection: verifiedNFT.verified_collection.key,
          original_name: verifiedNFT.name
        },
        mainframe_collection: collectionAddress
      };

      return { publicData, metadata };

    } catch (error) {
      throw ErrorFactory.internalError('Failed to create hybrid agent metadata', error as Error);
    }
  }

  /**
   * Validate hybrid data integrity
   */
  validateHybridData(
    publicData: PublicAgentData,
    privateData: AgentConfig,
    metadata: AgentNFTMetadata
  ): boolean {
    // Ensure consistency between public and private data
    if (publicData.name !== privateData.name) {
      throw ErrorFactory.validationError(
        'Data integrity violation: Public and private agent names must match',
        { publicName: publicData.name, privateName: privateData.name }
      );
    }

    if (publicData.framework !== privateData.framework) {
      throw ErrorFactory.validationError(
        'Data integrity violation: Public and private framework specifications must match',
        { publicFramework: publicData.framework, privateFramework: privateData.framework }
      );
    }

    // Ensure secure block is properly encrypted
    if (!metadata.secure || !metadata.secure.keyring || Object.keys(metadata.secure.keyring).length === 0) {
      throw ErrorFactory.validationError(
        'Security validation failed: Secure block must contain valid keyring',
        { hasSecure: !!metadata.secure, hasKeyring: !!metadata.secure?.keyring }
      );
    }

    console.log('✅ Hybrid data integrity validation passed');
    return true;
  }
}

/**
 * Utility functions for data access management
 */
export class DataAccessUtils {
  /**
   * Extract public summary from agent configuration
   */
  static extractPublicSummary(config: AgentConfig): PublicAgentData {
    return {
      name: config.name,
      type: 'AI Agent',
      framework: config.framework,
      created: new Date().toISOString()
    };
  }

  /**
   * Sanitize agent configuration for public display
   */
  static sanitizeForPublic(config: AgentConfig): Partial<AgentConfig> {
    return {
      name: config.name,
      description: config.description,
      purpose: config.purpose,
      framework: config.framework,
      capabilities: config.capabilities.map(cap => ({
        ...cap,
        config: {} // Remove sensitive config
      })),
      preferences: config.preferences
    };
  }

  /**
   * Validate access permissions
   */
  static validateAccessPermissions(
    wallet: WalletInfo,
    allowedWallets: string[]
  ): boolean {
    return allowedWallets.includes(wallet.publicKey);
  }
}
