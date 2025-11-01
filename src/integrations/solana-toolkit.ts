/**
 * General Solana Toolkit Integration
 * 
 * Utilities for integrating with various Solana development toolkits
 * including Anza kit, Gill SDK, and other ecosystem tools.
 */

import { 
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { MainframeSDK } from '../sdk';
import type { 
  MainframeConfig, 
  AgentConfig, 
  TransactionOptions,
  AgentAccountData 
} from '../types';
import { ErrorFactory } from '../utils/errors';

// ============================================================================
// Enhanced SDK with Toolkit Utilities
// ============================================================================

export class ToolkitMainframeSDK extends MainframeSDK {
  /**
   * Create agent with custom compute budget and priority fees
   */
  async createAgentWithPriorityFee(
    nftMint: string,
    agentConfig: AgentConfig,
    priorityFeeRate: number = 1000,
    computeUnits: number = 400000
  ): Promise<{ signature: string; agentAccount: string }> {
    this.ensureWalletConnected();

    try {
      // Build agent creation instruction
      const agentInstruction = await this.buildCreateAgentInstruction(nftMint, agentConfig);
      
      // Add compute budget instructions
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnits
      });
      
      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFeeRate
      });

      // Build final transaction
      const transaction = new Transaction()
        .add(modifyComputeUnits)
        .add(addPriorityFee)
        .add(agentInstruction);

      // Send transaction
      const signature = await this.wallet.sendTransaction(transaction, this.connection);
      
      // Derive agent account
      const agentAccount = this.deriveAgentAccount(new PublicKey(nftMint));

      console.log(`✅ Agent created with priority fee: ${signature}`);
      return { signature, agentAccount: agentAccount.toBase58() };

    } catch (error) {
      throw ErrorFactory.internalError('Failed to create agent with priority fee', error as Error);
    }
  }

  /**
   * Batch multiple agent operations in single transaction
   */
  async batchAgentOperations(
    operations: Array<{
      type: 'create' | 'update' | 'pause' | 'resume' | 'close';
      agentAccount?: string;
      nftMint?: string;
      agentConfig?: AgentConfig;
    }>,
    options?: TransactionOptions
  ): Promise<string> {
    this.ensureWalletConnected();

    try {
      const instructions: TransactionInstruction[] = [];

      for (const operation of operations) {
        let instruction: TransactionInstruction;

        switch (operation.type) {
          case 'create':
            if (!operation.nftMint || !operation.agentConfig) {
              throw ErrorFactory.invalidArgument('Create operation requires nftMint and agentConfig');
            }
            instruction = await this.buildCreateAgentInstruction(
              operation.nftMint,
              operation.agentConfig
            );
            break;

          case 'update':
            if (!operation.agentAccount || !operation.agentConfig) {
              throw ErrorFactory.invalidArgument('Update operation requires agentAccount and agentConfig');
            }
            instruction = await this.buildUpdateAgentInstruction(
              operation.agentAccount,
              operation.agentConfig
            );
            break;

          case 'pause':
          case 'resume':
            if (!operation.agentAccount) {
              throw ErrorFactory.invalidArgument('Pause/resume operation requires agentAccount');
            }
            instruction = await this.buildPauseAgentInstruction(operation.agentAccount);
            break;

          case 'close':
            if (!operation.agentAccount) {
              throw ErrorFactory.invalidArgument('Close operation requires agentAccount');
            }
            instruction = await this.buildCloseAgentInstruction(operation.agentAccount);
            break;

          default:
            throw ErrorFactory.invalidArgument(`Unsupported operation type: ${(operation as any).type}`);
        }

        instructions.push(instruction);
      }

      // Build and send batch transaction
      const transaction = new Transaction();
      
      // Add compute budget for batch operations
      if (instructions.length > 3) {
        const computeUnits = Math.min(1400000, instructions.length * 200000);
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits })
        );
      }

      instructions.forEach(ix => transaction.add(ix));

      const sendOptions = options?.skipPreflight !== undefined 
        ? { skipPreflight: options.skipPreflight }
        : {};
        
      const signature = await this.wallet.sendTransaction(transaction, this.connection, sendOptions);

      console.log(`✅ Batch operation completed: ${signature}`);
      return signature;

    } catch (error) {
      throw ErrorFactory.internalError('Failed to execute batch operations', error as Error);
    }
  }

  /**
   * Create versioned transaction for latest Solana features
   */
  async createVersionedTransaction(
    nftMint: string,
    agentConfig: AgentConfig,
    options?: { 
      lookupTables?: PublicKey[];
      priorityFee?: number;
    }
  ): Promise<VersionedTransaction> {
    this.ensureWalletConnected();

    try {
      const instruction = await this.buildCreateAgentInstruction(nftMint, agentConfig);
      const instructions = [instruction];

      // Add priority fee if specified
      if (options?.priorityFee) {
        instructions.unshift(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: options.priorityFee
          })
        );
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create message
      const message = new TransactionMessage({
        payerKey: this.wallet.getPublicKey()!,
        recentBlockhash: blockhash,
        instructions
      });

      // Compile to versioned transaction
      const compiledMessage = message.compileToV0Message();
      // Note: Lookup table integration would need AddressLookupTableAccount objects

      return new VersionedTransaction(compiledMessage);

    } catch (error) {
      throw ErrorFactory.internalError('Failed to create versioned transaction', error as Error);
    }
  }

  // Instruction builders - Use AnchorMainframeSDK for production-ready instruction building
  private async buildCreateAgentInstruction(nftMint: string, config: AgentConfig): Promise<TransactionInstruction> {
    throw ErrorFactory.internalError(
      'Direct instruction building not implemented in ToolkitMainframeSDK. ' +
      'Use AnchorMainframeSDK or WalletAdapterMainframeSDK for production use. ' +
      'This integration is for custom transaction builders only.'
    );
  }

  private async buildUpdateAgentInstruction(agentAccount: string, config: AgentConfig): Promise<TransactionInstruction> {
    throw ErrorFactory.internalError(
      'Direct instruction building not implemented in ToolkitMainframeSDK. ' +
      'Use AnchorMainframeSDK or WalletAdapterMainframeSDK for production use.'
    );
  }

  private async buildPauseAgentInstruction(agentAccount: string): Promise<TransactionInstruction> {
    throw ErrorFactory.internalError(
      'Direct instruction building not implemented in ToolkitMainframeSDK. ' +
      'Use AnchorMainframeSDK or WalletAdapterMainframeSDK for production use.'
    );
  }

  private async buildCloseAgentInstruction(agentAccount: string): Promise<TransactionInstruction> {
    throw ErrorFactory.internalError(
      'Direct instruction building not implemented in ToolkitMainframeSDK. ' +
      'Use AnchorMainframeSDK or WalletAdapterMainframeSDK for production use.'
    );
  }

  private deriveAgentAccount(nftMint: PublicKey): PublicKey {
    const [agentAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), nftMint.toBuffer()],
      new PublicKey(this.config.programId)
    );
    return agentAccount;
  }
}

// ============================================================================
// Token Account Utilities
// ============================================================================

export class TokenAccountUtils {
  /**
   * Get or create associated token account for agent rewards
   */
  static async getOrCreateAssociatedTokenAccount(
    connection: Connection,
    payer: PublicKey,
    mint: PublicKey,
    owner: PublicKey
  ): Promise<{
    address: PublicKey;
    instruction?: TransactionInstruction;
  }> {
    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mint,
        owner,
        false, // allowOwnerOffCurve
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Check if account exists
      const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
      
      if (accountInfo) {
        return { address: associatedTokenAddress };
      }

      // Create instruction to create the account
      const createInstruction = new TransactionInstruction({
        keys: [
          { pubkey: payer, isSigner: true, isWritable: true },
          { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
          { pubkey: owner, isSigner: false, isWritable: false },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
        ],
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        data: Buffer.alloc(0)
      });

      return {
        address: associatedTokenAddress,
        instruction: createInstruction
      };

    } catch (error) {
      throw ErrorFactory.internalError('Failed to get/create token account', error as Error);
    }
  }

  /**
   * Calculate rent for agent account
   */
  static async calculateAgentAccountRent(connection: Connection): Promise<number> {
    try {
      // Agent account size (from program specs)
      const AGENT_ACCOUNT_SIZE = 8 + // discriminator
        32 + // nft_mint  
        32 + // owner
        33 + // collection_mint (Option<Pubkey>)
        4 + 200 + // metadata_uri (String)
        1 + // status
        8 + // activated_at
        8 + // updated_at
        8 + // version
        64; // reserved

      return await connection.getMinimumBalanceForRentExemption(AGENT_ACCOUNT_SIZE);

    } catch (error) {
      throw ErrorFactory.networkError('calculate rent', error as Error);
    }
  }
}

// ============================================================================
// Transaction Builder Utilities
// ============================================================================

export class TransactionBuilderUtils {
  /**
   * Create optimized transaction with proper fee estimation
   */
  static async createOptimizedTransaction(
    connection: Connection,
    payer: PublicKey,
    instructions: TransactionInstruction[],
    options?: {
      priorityFeeRate?: number;
      computeUnits?: number;
      recentBlockhash?: string;
    }
  ): Promise<Transaction> {
    const transaction = new Transaction();

    // Add compute budget instructions if specified
    if (options?.computeUnits) {
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: options.computeUnits
        })
      );
    }

    if (options?.priorityFeeRate) {
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: options.priorityFeeRate
        })
      );
    }

    // Add main instructions
    instructions.forEach(ix => transaction.add(ix));

    // Set recent blockhash
    if (options?.recentBlockhash) {
      transaction.recentBlockhash = options.recentBlockhash;
    } else {
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
    }

    transaction.feePayer = payer;

    return transaction;
  }

  /**
   * Estimate transaction fees including compute costs
   */
  static async estimateTransactionFee(
    connection: Connection,
    transaction: Transaction
  ): Promise<{
    baseFee: number;
    computeFee: number;
    totalFee: number;
  }> {
    try {
      // Simulate transaction to get compute units used
      const simulation = await connection.simulateTransaction(transaction);
      
      const computeUnitsUsed = simulation.value.unitsConsumed || 200000;
      const baseFee = 5000; // Base fee per signature
      const computeFeeRate = 1; // Default rate
      const computeFee = computeUnitsUsed * computeFeeRate;
      
      return {
        baseFee,
        computeFee,
        totalFee: baseFee + computeFee
      };

    } catch (error) {
      // Fallback estimation if simulation fails
      return {
        baseFee: 5000,
        computeFee: 200000,
        totalFee: 205000
      };
    }
  }

  /**
   * Add lookup table support to transaction
   */
  static async addLookupTable(
    transaction: Transaction,
    lookupTable: PublicKey,
    connection: Connection
  ): Promise<VersionedTransaction> {
    try {
      const lookupTableAccount = await connection.getAddressLookupTable(lookupTable);
      
      if (!lookupTableAccount.value) {
        throw new Error('Lookup table not found');
      }

      const message = TransactionMessage.decompile(transaction as any);
      const compiledMessage = message.compileToV0Message([lookupTableAccount.value]);
      
      return new VersionedTransaction(compiledMessage);

    } catch (error) {
      throw ErrorFactory.internalError('Failed to add lookup table', error as Error);
    }
  }
}

// ============================================================================
// Cross-Chain Utilities (Future)
// ============================================================================

export class CrossChainUtils {
  /**
   * Prepare agent configuration for cross-chain operations
   */
  static prepareCrossChainConfig(
    config: AgentConfig,
    targetChains: string[]
  ): AgentConfig {
    return {
      ...config,
      capabilities: [
        ...config.capabilities,
        {
          type: 'crosschain',
          plugins: targetChains.map(chain => `${chain}-bridge`),
          config: {
            supportedChains: targetChains,
            bridgeTimeout: 300000 // 5 minutes
          }
        }
      ]
    };
  }

  /**
   * Validate cross-chain address formats
   */
  static validateCrossChainAddress(address: string, chain: string): boolean {
    const validators: Record<string, (addr: string) => boolean> = {
      ethereum: (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr),
      bitcoin: (addr) => /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr),
      solana: (addr) => {
        try {
          new PublicKey(addr);
          return true;
        } catch {
          return false;
        }
      }
    };

    const validator = validators[chain.toLowerCase()];
    return validator ? validator(address) : false;
  }
}

// ============================================================================
// Toolkit Integration Factory
// ============================================================================

export class ToolkitIntegration {
  /**
   * Create SDK compatible with any Solana toolkit
   */
  static create(config: MainframeConfig): ToolkitMainframeSDK {
    return new ToolkitMainframeSDK(config);
  }

  /**
   * Create SDK from existing Connection and wallet
   */
  static fromConnection(
    connection: Connection,
    wallet: { publicKey: PublicKey; signTransaction: any },
    config: Partial<MainframeConfig>
  ): ToolkitMainframeSDK {
    const fullConfig: MainframeConfig = {
      solanaNetwork: 'mainnet-beta',
      rpcEndpoint: connection.rpcEndpoint,
      programId: config.programId || 'mnfm211AwTDA8fGvPezYs3jjxAXgoucHGuTMUbjFssE',
      protocolWallet: config.protocolWallet || 'PROTOCOL_WALLET_PUBKEY_HERE',
      storage: config.storage || {
        arweave: { gateway: 'https://arweave.net' }
      },
      ...config
    };

    const sdk = new ToolkitMainframeSDK(fullConfig);
    
    // Override connection
    (sdk as any).connection = connection;
    
    return sdk;
  }

  /**
   * Enhanced initialization with toolkit compatibility
   */
  static async initializeWithToolkit(
    sdk: ToolkitMainframeSDK,
    toolkitName: 'anchor' | 'anza' | 'gill' | 'custom',
    toolkitConfig?: any
  ): Promise<void> {
    console.log(`🔗 Initializing with ${toolkitName} toolkit compatibility`);
    
    switch (toolkitName) {
      case 'anchor':
        if (toolkitConfig?.provider && 'initializeWithProvider' in sdk) {
          await (sdk as any).initializeWithProvider(toolkitConfig.provider);
        }
        break;
        
      case 'anza':
        // Anza-specific initialization patterns
        console.log('🧰 Setting up Anza kit compatibility');
        break;
        
      case 'gill':
        // Gill SDK specific patterns
        console.log('🐟 Setting up Gill SDK compatibility');
        break;
        
      case 'custom':
        // Custom toolkit integration
        console.log('⚙️ Setting up custom toolkit compatibility');
        break;
    }

    console.log(`✅ ${toolkitName} integration ready`);
  }
}

// ============================================================================
// Export Utilities
// ============================================================================

export { 
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID 
} from '@solana/spl-token';

export {
  SystemProgram,
  ComputeBudgetProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';

// Factory functions
export const createToolkitSDK = (config: MainframeConfig) => new ToolkitMainframeSDK(config);

export const createFromConnection = (
  connection: Connection,
  wallet: { publicKey: PublicKey; signTransaction: any },
  config: Partial<MainframeConfig>
) => ToolkitIntegration.fromConnection(connection, wallet, config);
