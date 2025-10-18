/**
 * Program service for Mainframe SDK
 * 
 * Handles integration with the Solana Anchor program for agent operations.
 * Provides transaction building, account derivation, and event parsing.
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import type {
  MainframeConfig,
  AgentConfig,
  AgentAccountData,
  AgentStatus,
  ActivateAgentResult,
  UpdateAgentResult,
  TransferAgentResult,
  TransactionOptions,
  ProtocolConfigData,
  FeeStructure,
  PartnerCollection
} from '../types';
import type { Mainframe } from '../types/mainframe';
import idl from '../idl/mainframe.json';
import { EncryptionService } from './encryption';
import { StorageService } from './storage';
import { ErrorFactory, MainframeSDKError } from '../utils/errors';
import { RuntimeValidator } from '../utils/validation';
import { PROTOCOL_CONSTANTS } from '../utils/constants';

// Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export class ProgramService {
  private config: MainframeConfig;
  private connection: Connection;
  private program?: Program<Mainframe>;
  private encryptionService: EncryptionService;
  private storageService: StorageService;
  private walletPublicKey?: PublicKey;

  constructor(
    config: MainframeConfig,
    connection: Connection,
    encryptionService: EncryptionService,
    storageService: StorageService
  ) {
    this.config = config;
    this.connection = connection;
    this.encryptionService = encryptionService;
    this.storageService = storageService;
  }

  /**
   * Initialize the program service with wallet
   */
  async initialize(walletPublicKey: PublicKey, provider?: AnchorProvider): Promise<void> {
    this.walletPublicKey = walletPublicKey;

    try {
      const programId = new PublicKey(PROTOCOL_CONSTANTS.PROGRAM_ID);
      
      if (provider) {
        // Use provided Anchor provider with real IDL
        this.program = new Program<Mainframe>(idl as Mainframe, provider);
      } else {
        throw ErrorFactory.internalError('Anchor provider is required for program initialization');
      }
    } catch (error) {
      throw ErrorFactory.internalError('Failed to initialize program', error as Error);
    }
  }

  /**
   * Activate an AI agent from NFT
   */
  async activateAgent(
    nftMint: string,
    agentConfig: AgentConfig,
    options: TransactionOptions & { seller?: string; affiliateBps?: number } = {}
  ): Promise<ActivateAgentResult> {
    this.ensureInitialized();
    
    try {
      // Validate inputs
      RuntimeValidator.validateNftMint(nftMint);
      
      // Validate affiliate parameters
      if (options.affiliateBps !== undefined) {
        if (options.affiliateBps < 0 || options.affiliateBps > 5000) {
          throw ErrorFactory.validationError('affiliateBps must be between 0 and 5000 (0-50%)');
        }
        if (options.affiliateBps > 0 && !options.seller) {
          throw ErrorFactory.validationError('seller must be provided when affiliateBps > 0');
        }
      }
      
      // 1. Encrypt and upload metadata
      const encrypted = await this.encryptionService.encryptAgentConfig(
        agentConfig,
        this.walletPublicKey!.toBase58(),
        nftMint
      );
      
      const storage = await this.storageService.uploadMetadata(encrypted);
      
      // 2. Derive accounts
      const nftMintPubkey = new PublicKey(nftMint);
      const agentAccount = this.deriveAgentAccount(nftMintPubkey);
      const protocolConfig = this.deriveProtocolConfig();
      
      // 3. Get NFT token account and metadata
      const nftTokenAccount = await this.getNFTTokenAccount(nftMintPubkey);
      const nftMetadata = await this.getNFTMetadataAccount(nftMintPubkey);
      const collectionMint = await this.getCollectionMint(nftMetadata);
      
      // 4. Calculate fees
      const fee = await this.calculateFee('create_agent', collectionMint);
      
      // 5. Use Anchor program method to create agent
      if (!this.program) {
        throw ErrorFactory.internalError('Program not initialized');
      }

      // Derive partner account if collection exists  
      const partnerAccount = collectionMint ? this.derivePartnerAccount(collectionMint) : undefined;
      
      // Get protocol config for treasury accounts
      const protocolConfigData = await this.getProtocolConfig();

      // 6. Execute create agent transaction using Anchor
      const txBuilder = this.program.methods
        .createAgent(
          nftMintPubkey, 
          storage.uri,
          options.affiliateBps || 0,
          collectionMint || null
        )
        .accounts({
          owner: this.walletPublicKey!,
          protocolAuthority: this.walletPublicKey!, // For now, owner acts as protocol authority
          nftTokenAccount,
          nftMetadata,
          protocolTreasury: new PublicKey(protocolConfigData.protocolTreasury),
          validatorTreasury: new PublicKey(protocolConfigData.validatorTreasury),
          networkTreasury: new PublicKey(protocolConfigData.networkTreasury),
          seller: options.seller ? new PublicKey(options.seller) : null,
          partnerAccount: partnerAccount || null
        });

      // Add optional partner account if needed
      if (partnerAccount && collectionMint) {
        txBuilder.remainingAccounts([
          { pubkey: partnerAccount, isWritable: false, isSigner: false }
        ]);
      }

      // Execute transaction
      const signature = await txBuilder.rpc();
      
      console.log('✅ Agent activation transaction built');
      console.log(`📎 Agent Account: ${agentAccount.toBase58()}`);
      console.log(`📎 Metadata URI: ${storage.uri}`);
      console.log(`💰 Fee: ${fee} lamports`);
      if (options.seller && options.affiliateBps) {
        console.log(`🤝 Affiliate: ${options.seller} (${options.affiliateBps / 100}%)`);
      }
      
      return {
        signature,
        agentAccount: agentAccount.toBase58(),
        metadataUri: storage.uri,
        confirmation: { signature, confirmationStatus: 'confirmed' }
      };
      
    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.internalError('Failed to activate agent', error as Error);
    }
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfig(
    agentAccount: string,
    newConfig: AgentConfig,
    options: TransactionOptions = {}
  ): Promise<UpdateAgentResult> {
    this.ensureInitialized();
    
    try {
      RuntimeValidator.validateAccountAddress(agentAccount, 'agentAccount');
      
      // Get current agent data
      const agentData = await this.getAgentAccount(agentAccount);
      
      // Encrypt and upload new metadata
      const encrypted = await this.encryptionService.encryptAgentConfig(
        newConfig,
        this.walletPublicKey!.toBase58(),
        agentData.nftMint
      );
      
      const storage = await this.storageService.uploadMetadata(encrypted);
      
      // Calculate update fee
      const collectionMint = agentData.collectionMint ? new PublicKey(agentData.collectionMint) : undefined;
      const fee = await this.calculateFee('update_config', collectionMint);
      
      // Use Anchor program method
      if (!this.program) {
        throw ErrorFactory.internalError('Program not initialized');
      }

      // Get protocol config for treasury accounts
      const protocolConfigData = await this.getProtocolConfig();

      const signature = await this.program.methods
        .updateAgentConfig(storage.uri)
        .accounts({
          owner: this.walletPublicKey!,
          protocolTreasury: new PublicKey(protocolConfigData.protocolTreasury),
          validatorTreasury: new PublicKey(protocolConfigData.validatorTreasury),
          networkTreasury: new PublicKey(protocolConfigData.networkTreasury)
        })
        .rpc();
      
      console.log('✅ Agent configuration updated - mainframe-node will sync automatically');
      console.log(`📎 New metadata URI: ${storage.uri}`);
      
      return {
        signature,
        agentAccount,
        newMetadataUri: storage.uri,
        version: agentData.version + 1,
        syncTriggered: true
      };
      
    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.internalError('Failed to update agent config', error as Error);
    }
  }

  /**
   * Transfer agent ownership
   */
  async transferAgent(
    agentAccount: string,
    newOwner: string,
    options: TransactionOptions = {}
  ): Promise<TransferAgentResult> {
    this.ensureInitialized();
    
    try {
      RuntimeValidator.validateAccountAddress(agentAccount, 'agentAccount');
      RuntimeValidator.validateAccountAddress(newOwner, 'newOwner');
      
      const agentData = await this.getAgentAccount(agentAccount);
      const collectionMint = agentData.collectionMint ? new PublicKey(agentData.collectionMint) : undefined;
      const fee = await this.calculateFee('transfer_agent', collectionMint);
      
      // Use Anchor program method
      if (!this.program) {
        throw ErrorFactory.internalError('Program not initialized');
      }

      // Get protocol config for treasury accounts
      const protocolConfigData = await this.getProtocolConfig();

      const signature = await this.program.methods
        .transferAgent()
        .accounts({
          currentOwner: this.walletPublicKey!,
          newOwner: new PublicKey(newOwner),
          newNftTokenAccount: await this.getAssociatedTokenAccount(new PublicKey(newOwner), new PublicKey(agentData.nftMint)),
          protocolTreasury: new PublicKey(protocolConfigData.protocolTreasury),
          validatorTreasury: new PublicKey(protocolConfigData.validatorTreasury),
          networkTreasury: new PublicKey(protocolConfigData.networkTreasury)
        })
        .rpc();
      
      return {
        signature,
        agentAccount,
        oldOwner: this.walletPublicKey!.toBase58(),
        newOwner
      };
      
    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.internalError('Failed to transfer agent', error as Error);
    }
  }

  /**
   * Pause agent
   */
  async pauseAgent(agentAccount: string, options: TransactionOptions = {}): Promise<string> {
    return this.toggleAgentStatus(agentAccount, 'pause', options);  
  }

  /**
   * Resume agent  
   */
  async resumeAgent(agentAccount: string, options: TransactionOptions = {}): Promise<string> {
    return this.toggleAgentStatus(agentAccount, 'resume', options);
  }

  /**
   * Close agent permanently
   */
  async closeAgent(agentAccount: string, options: TransactionOptions = {}): Promise<string> {
    this.ensureInitialized();
    
    try {
      RuntimeValidator.validateAccountAddress(agentAccount, 'agentAccount');
      
      const agentData = await this.getAgentAccount(agentAccount);
      const collectionMint = agentData.collectionMint ? new PublicKey(agentData.collectionMint) : undefined;
      const fee = await this.calculateFee('close_agent', collectionMint);
      
      // Use Anchor program method
      if (!this.program) {
        throw ErrorFactory.internalError('Program not initialized');
      }

      const signature = await this.program.methods
        .closeAgent()
        .accounts({
          owner: this.walletPublicKey!
        })
        .rpc();
      console.log('✅ Agent closed permanently');
      
      return signature;
      
    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.internalError('Failed to close agent', error as Error);
    }
  }

  /**
   * Get agent account data
   */
  async getAgentAccount(agentAccount: string): Promise<AgentAccountData> {
    try {
      RuntimeValidator.validateAccountAddress(agentAccount, 'agentAccount');
      
    // In a real implementation, this would fetch from the blockchain
    // For now, return mock data
    const mockData: AgentAccountData = {
      nftMint: '11111111111111111111111111111113',
      owner: this.walletPublicKey?.toBase58() || '11111111111111111111111111111114',
      collectionMint: '11111111111111111111111111111115',
      metadataUri: 'ipfs://QmMockMetadataHash',
      status: 'Active',
      activatedAt: Date.now() - 86400000, // 1 day ago
      updatedAt: Date.now() - 3600000, // 1 hour ago
      version: 1
    };
      
      return mockData;
      
    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.internalError('Failed to get agent account', error as Error);
    }
  }

  /**
   * Get agents by owner
   */
  async getAgentsByOwner(owner: PublicKey): Promise<AgentAccountData[]> {
    try {
      // In real implementation, this would use getProgramAccounts
      // For now, return mock data
      return [
        await this.getAgentAccount('11111111111111111111111111111116'),
        await this.getAgentAccount('11111111111111111111111111111117')
      ];
      
    } catch (error) {
      throw ErrorFactory.internalError('Failed to get agents by owner', error as Error);
    }
  }

  /**
   * Get protocol configuration from blockchain
   */
  async getProtocolConfig(): Promise<ProtocolConfigData> {
    try {
      // Derive protocol config PDA
      const protocolConfigPda = this.deriveProtocolConfig();
      
      // Fetch account data from blockchain
      const accountInfo = await this.connection.getAccountInfo(protocolConfigPda);
      
      if (!accountInfo) {
        throw ErrorFactory.internalError('Protocol configuration not found on-chain');
      }

      // Parse the account data based on the program structure
      const data = accountInfo.data;
      
      if (data.length < 8) {
        throw ErrorFactory.internalError('Invalid protocol config account data');
      }

      let offset = 8; // Skip discriminator

      // Parse authority (32 bytes)
      const authority = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Parse fee structure (6 * 8 bytes)
      const fees: FeeStructure = {
        createAgent: Number(data.readBigUInt64LE(offset)),
        updateConfig: Number(data.readBigUInt64LE(offset + 8)),
        transferAgent: Number(data.readBigUInt64LE(offset + 16)),
        pauseAgent: Number(data.readBigUInt64LE(offset + 24)),
        closeAgent: Number(data.readBigUInt64LE(offset + 32)),
        executeAction: Number(data.readBigUInt64LE(offset + 40))
      };
      offset += 48;

      // Parse treasury addresses (3 * 32 bytes)
      const protocolTreasury = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      const validatorTreasury = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      const networkTreasury = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Parse basis points (3 * 2 bytes)
      const protocolTreasuryBps = data.readUInt16LE(offset);
      offset += 2;
      const validatorTreasuryBps = data.readUInt16LE(offset);
      offset += 2;
      const networkTreasuryBps = data.readUInt16LE(offset);
      offset += 2;

      // Parse remaining fields
      const paused = data[offset] === 1;
      offset += 1;
      const totalAgents = data.readBigUInt64LE(offset);
      offset += 8;
      const totalPartners = data.readBigUInt64LE(offset);

      // Build final config object
      const config: ProtocolConfigData = {
        authority: authority.toBase58(),
        fees,
        protocolTreasury: protocolTreasury.toBase58(),
        validatorTreasury: validatorTreasury.toBase58(),
        networkTreasury: networkTreasury.toBase58(),
        protocolTreasuryBps,
        validatorTreasuryBps,
        networkTreasuryBps,
        paused,
        totalAgents: Number(totalAgents),
        totalPartners: Number(totalPartners)
      };

      return config;
      
    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.internalError('Failed to get protocol config from blockchain', error as Error);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.walletPublicKey) {
      throw ErrorFactory.walletNotConnected();
    }
  }

  private async toggleAgentStatus(
    agentAccount: string, 
    action: 'pause' | 'resume',
    options: TransactionOptions = {}
  ): Promise<string> {
    this.ensureInitialized();
    
    try {
      RuntimeValidator.validateAccountAddress(agentAccount, 'agentAccount');
      
      const agentData = await this.getAgentAccount(agentAccount);
      
      // Validate current status
      if (action === 'pause' && agentData.status === 'Paused') {
        throw ErrorFactory.internalError('Agent is already paused');
      }
      if (action === 'resume' && agentData.status === 'Active') {
        throw ErrorFactory.internalError('Agent is already active');
      }
      if (agentData.status === 'Closed') {
        throw ErrorFactory.internalError('Cannot modify closed agent');
      }
      
      const collectionMint = agentData.collectionMint ? new PublicKey(agentData.collectionMint) : undefined;
      const fee = await this.calculateFee('pause_agent', collectionMint);
      
      // Use Anchor program method
      if (!this.program) {
        throw ErrorFactory.internalError('Program not initialized');
      }

      // Both pause and resume use the same pauseAgent method
      const signature = await this.program.methods
        .pauseAgent()
        .accounts({
          owner: this.walletPublicKey!
        })
        .rpc();
      console.log(`✅ Agent ${action}d successfully`);
      
      return signature;
      
    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.internalError(`Failed to ${action} agent`, error as Error);
    }
  }

  private async calculateFee(operation: string, collectionMint?: PublicKey): Promise<number> {
    try {
      const protocolConfig = await this.getProtocolConfig();
      
      let baseFee = 0;
      switch (operation) {
        case 'create_agent':
          baseFee = protocolConfig.fees.createAgent;
          break;
        case 'update_config':
          baseFee = protocolConfig.fees.updateConfig;
          break;
        case 'transfer_agent':
          baseFee = protocolConfig.fees.transferAgent;
          break;
        case 'pause_agent':
          baseFee = protocolConfig.fees.pauseAgent;
          break;
        case 'close_agent':
          baseFee = protocolConfig.fees.closeAgent;
          break;
        case 'execute_action':
          baseFee = protocolConfig.fees.executeAction;
          break;
      }
      
      if (baseFee === 0) {
        return 0;
      }
      
      // Check for genesis collection zero fees
      if (collectionMint) {
        const MAIKERS_COLLECTIBLES = 'mA1K3VFobNqs8xw16CCyU5S1mqEfDdJByjMLvczxVch';
        if (collectionMint.toBase58() === MAIKERS_COLLECTIBLES) {
          return 0;
        }
        
        // Check partner discount via PDA
        const partnerDiscount = await this.getPartnerDiscount(collectionMint);
        if (partnerDiscount > 0) {
          const discountMultiplier = (100 - partnerDiscount) / 100;
          return Math.floor(baseFee * discountMultiplier);
        }
      }
      
      return baseFee;
      
    } catch (error) {
      throw ErrorFactory.internalError('Failed to calculate fee', error as Error);
    }
  }

  private derivePartnerAccount(collectionMint: PublicKey): PublicKey {
    const [partnerAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('partner'), collectionMint.toBuffer()],
      new PublicKey(PROTOCOL_CONSTANTS.PROGRAM_ID)
    );
    return partnerAccount;
  }

  private async getPartnerDiscount(collectionMint: PublicKey): Promise<number> {
    try {
      const partnerPda = this.derivePartnerAccount(collectionMint);
      const accountInfo = await this.connection.getAccountInfo(partnerPda);
      
      if (!accountInfo) {
        return 0;
      }
      
      // Parse partner account data
      const data = accountInfo.data;
      if (data.length < 50) return 0;
      
      // discount_percent is at offset 40 (after discriminator + pubkey)
      const discountPercent = data[40];
      const active = data[95] === 1; // active flag at offset 95
      
      return (active && discountPercent !== undefined) ? discountPercent : 0;
    } catch (error) {
      return 0;
    }
  }

  // Account derivation methods
  private deriveAgentAccount(nftMint: PublicKey): PublicKey {
    const [agentAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), nftMint.toBuffer()],
      new PublicKey(PROTOCOL_CONSTANTS.PROGRAM_ID)
    );
    return agentAccount;
  }

  private deriveProtocolConfig(): PublicKey {
    const [protocolConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from('protocol_config')],
      new PublicKey(PROTOCOL_CONSTANTS.PROGRAM_ID)
    );
    return protocolConfig;
  }

  private async getNFTTokenAccount(nftMint: PublicKey): Promise<PublicKey> {
    // In real implementation, this would find the associated token account
    // For now, return a mock address
    return new PublicKey('1111111111111111111111111111111E');
  }

  private async getAssociatedTokenAccount(owner: PublicKey, mint: PublicKey): Promise<PublicKey> {
    // In real implementation, this would derive the associated token account
    // For now, return a mock address
    return new PublicKey('1111111111111111111111111111111F');
  }

  private async getNFTMetadataAccount(nftMint: PublicKey): Promise<PublicKey> {
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMint.toBuffer()
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    return metadataAccount;
  }

  private async getCollectionMint(metadataAccount: PublicKey): Promise<PublicKey | undefined> {
    try {
      const accountInfo = await this.connection.getAccountInfo(metadataAccount);
      if (!accountInfo) return undefined;
      
      // Parse Metaplex metadata to extract collection
      // Collection field starts at offset 326 (after standard fields)
      // Structure: Option<Collection> where Collection = { verified: bool, key: Pubkey }
      const data = accountInfo.data;
      
      // Check if collection exists (first byte = 1 for Some)
      if (data.length > 326 && data[326] === 1) {
        // verified (bool) at 327, collection mint at 328-359
        const collectionMint = new PublicKey(data.slice(328, 360));
        return collectionMint;
      }
      
      return undefined;
    } catch (error) {
      console.warn('Failed to extract collection from metadata:', error);
      return undefined;
    }
  }

}
