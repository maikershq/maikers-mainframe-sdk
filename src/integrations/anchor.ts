/**
 * Anchor Framework Integration Utilities
 * 
 * Provides seamless integration with @coral-xyz/anchor for advanced
 * Solana program interactions and custom instruction building.
 */

import { 
  Program, 
  AnchorProvider, 
  Wallet, 
  BN,
  web3,
  utils,
  Idl,
  IdlAccounts,
  IdlTypes
} from '@coral-xyz/anchor';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Commitment
} from '@solana/web3.js';
import type { 
  MainframeConfig,
  AgentConfig,
  TransactionOptions,
  WalletConnectionResult 
} from '../types';
import type { Mainframe } from '../types/mainframe';
import idl from '../idl/mainframe.json';
import { MainframeSDK } from '../sdk';
import { ErrorFactory } from '../utils/errors';

// ============================================================================
// Anchor Integration Types
// ============================================================================

export interface AnchorMainframeConfig extends MainframeConfig {
  anchor: {
    provider?: AnchorProvider;
    commitment?: Commitment;
    skipPreflight?: boolean;
  };
}

export interface AnchorTransactionBuilder {
  program: Program<Mainframe>;
  accounts: Record<string, PublicKey>;
  instructions: TransactionInstruction[];
}

// ============================================================================
// Anchor-Enhanced MainframeSDK
// ============================================================================

export class AnchorMainframeSDK extends MainframeSDK {
  public readonly anchorProvider?: AnchorProvider;
  public readonly anchorProgram?: Program<Mainframe>;

  constructor(config: AnchorMainframeConfig) {
    super(config);
    
    if (config.anchor.provider) {
      this.anchorProvider = config.anchor.provider;
    }
    
    // Initialize Anchor program with real IDL
    if (this.anchorProvider) {
      this.anchorProgram = new Program<Mainframe>(
        idl as Mainframe,
        this.anchorProvider
      );
    }
  }

  /**
   * Initialize with Anchor Provider
   */
  async initializeWithAnchor(provider: AnchorProvider): Promise<void> {
    await this.initialize(provider.wallet.publicKey.toBase58());
  }

  /**
   * Get Anchor program instance
   */
  getProgram(): Program<Mainframe> | undefined {
    return this.anchorProgram;
  }

  /**
   * Fetch agent account data using Anchor program
   */
  async fetchAgentAccount(publicKey: PublicKey) {
    if (!this.anchorProgram) {
      throw ErrorFactory.internalError('Anchor program not initialized');
    }

    try {
      const accountData = await this.anchorProgram.account.agentAccount.fetch(publicKey);
      return accountData;
    } catch (error) {
      throw ErrorFactory.internalError('Failed to fetch agent account', error as Error);
    }
  }

  /**
   * Fetch protocol config account data using Anchor program
   */
  async fetchProtocolConfig(publicKey: PublicKey) {
    if (!this.anchorProgram) {
      throw ErrorFactory.internalError('Anchor program not initialized');
    }

    try {
      const accountData = await this.anchorProgram.account.protocolConfig.fetch(publicKey);
      return accountData;
    } catch (error) {
      throw ErrorFactory.internalError('Failed to fetch protocol config', error as Error);
    }
  }

  /**
   * Create agent using Anchor method
   */
  async createAgentWithAnchor(
    nftMint: PublicKey,
    metadataUri: string,
    sellerAffiliateBps: number = 0,
    collectionMint: PublicKey | null = null,
    accounts: any
  ): Promise<string> {
    if (!this.anchorProgram) {
      throw ErrorFactory.internalError('Anchor program not initialized');
    }

    try {
      const signature = await this.anchorProgram.methods
        .createAgent(nftMint, metadataUri, sellerAffiliateBps, collectionMint)
        .accounts(accounts)
        .rpc();
      return signature;
    } catch (error) {
      throw ErrorFactory.internalError('Failed to create agent with Anchor', error as Error);
    }
  }
}

// ============================================================================
// Anchor Utility Functions
// ============================================================================

export class AnchorUtils {
  /**
   * Load IDL from various sources
   */
  static async loadIdl(source: string | Idl): Promise<Idl> {
    if (typeof source === 'object') {
      return source;
    }
    
    try {
      // Try to fetch from URL or load from file
      const response = await fetch(source);
      return await response.json();
    } catch (error) {
      throw ErrorFactory.internalError('Failed to load IDL', error as Error);
    }
  }

  /**
   * Create Anchor provider from connection and wallet
   */
  static createProvider(
    connection: Connection,
    wallet: Wallet,
    options: {
      commitment?: Commitment;
      skipPreflight?: boolean;
    } = {}
  ): AnchorProvider {
    return new AnchorProvider(
      connection,
      wallet,
      {
        commitment: options.commitment || 'confirmed',
        skipPreflight: options.skipPreflight || false
      }
    );
  }

  /**
   * Derive PDA using program seeds
   */
  static derivePDA(
    seeds: (string | Buffer | Uint8Array)[],
    programId: PublicKey
  ): [PublicKey, number] {
    const seedBuffers = seeds.map(seed => {
      if (typeof seed === 'string') {
        return Buffer.from(seed);
      }
      return Buffer.from(seed);
    });
    
    return PublicKey.findProgramAddressSync(seedBuffers, programId);
  }
}

// ============================================================================
// Type Exports
// ============================================================================

export type AnchorMainframeMethods = keyof Program<Mainframe>['methods'];
export type AnchorMainframeAccounts = keyof Program<Mainframe>['account'];

// Configuration interfaces for external consumers
export interface AnchorIntegrationOptions {
  provider?: AnchorProvider;
  idl?: Idl;
  commitment?: Commitment;
}

export interface AnchorMethodCall {
  method: string;
  args: any[];
  accounts: Record<string, PublicKey>;
}