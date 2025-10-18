/**
 * Wallet Adapter Integration Utilities
 * 
 * Enhanced integration with @solana/wallet-adapter ecosystem
 * and other Solana wallet management libraries.
 */

import { 
  WalletAdapter,
  WalletAdapterNetwork,
  WalletNotConnectedError,
  WalletNotReadyError
} from '@solana/wallet-adapter-base';
import { 
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  TransactionSignature,
  SendOptions
} from '@solana/web3.js';
import { MainframeSDK } from '../sdk';
import { AnchorProvider } from '@coral-xyz/anchor';
import type { 
  MainframeConfig, 
  WalletConnectionResult,
  TransactionOptions 
} from '../types';
import { ErrorFactory } from '../utils/errors';

// ============================================================================
// Wallet Adapter Enhanced SDK
// ============================================================================

export class WalletAdapterMainframeSDK extends MainframeSDK {
  private walletAdapter?: WalletAdapter;
  private walletConnection?: Connection;
  private internalProvider?: AnchorProvider;

  /**
   * Initialize with wallet adapter (from @solana/wallet-adapter-react or similar)
   */
  async initializeWithAdapter(
    adapter: WalletAdapter,
    connection?: Connection
  ): Promise<WalletConnectionResult> {
    if (!adapter.connected || !adapter.publicKey) {
      throw new WalletNotConnectedError();
    }

    try {
      this.walletAdapter = adapter;
      this.walletConnection = connection || this.connection;

      // Create AnchorProvider internally for program service
      this.internalProvider = new AnchorProvider(
        this.walletConnection,
        adapter as any, // Cast to Anchor wallet interface
        {
          commitment: 'confirmed',
          skipPreflight: false
        }
      );

      // Initialize program service with both publicKey and provider
      await this.program.initialize(adapter.publicKey, this.internalProvider);

      // Set up event listeners
      this.setupWalletAdapterListeners();

      const result: WalletConnectionResult = {
        publicKey: adapter.publicKey.toBase58(),
        connected: true,
        walletName: adapter.name
      };

      console.log(`✅ MainframeSDK initialized with ${adapter.name} adapter`);
      return result;

    } catch (error) {
      throw ErrorFactory.walletConnectionFailed(error as Error);
    }
  }

  /**
   * Send transaction using wallet adapter
   */
  async sendTransactionWithAdapter(
    transaction: Transaction | VersionedTransaction,
    options?: SendOptions
  ): Promise<TransactionSignature> {
    if (!this.walletAdapter?.connected) {
      throw new WalletNotConnectedError();
    }

    if (!this.walletConnection) {
      throw ErrorFactory.internalError('Connection not initialized');
    }

    try {
      const signature = await this.walletAdapter.sendTransaction(
        transaction,
        this.walletConnection,
        options
      );
      
      return signature;

    } catch (error) {
      throw ErrorFactory.transactionFailed(error as Error);
    }
  }

  /**
   * Sign transaction using wallet adapter  
   */
  async signTransactionWithAdapter(
    transaction: Transaction
  ): Promise<Transaction> {
    if (!this.walletAdapter?.connected) {
      throw new WalletNotConnectedError();
    }

    try {
      if ('signTransaction' in this.walletAdapter && this.walletAdapter.signTransaction) {
        const signFn = this.walletAdapter.signTransaction as (tx: Transaction) => Promise<Transaction>;
        return await signFn(transaction);
      }
      
      throw ErrorFactory.walletUnsupported('Transaction signing not supported');

    } catch (error) {
      throw ErrorFactory.transactionFailed(error as Error);
    }
  }

  /**
   * Sign versioned transaction using wallet adapter
   */
  async signVersionedTransactionWithAdapter(
    transaction: VersionedTransaction
  ): Promise<VersionedTransaction> {
    if (!this.walletAdapter?.connected) {
      throw new WalletNotConnectedError();
    }

    try {
      if ('signTransaction' in this.walletAdapter && this.walletAdapter.signTransaction) {
        const signFn = this.walletAdapter.signTransaction as (tx: VersionedTransaction) => Promise<VersionedTransaction>;
        return await signFn(transaction);
      }
      
      throw ErrorFactory.walletUnsupported('Versioned transaction signing not supported');

    } catch (error) {
      throw ErrorFactory.transactionFailed(error as Error);
    }
  }

  /**
   * Get internal provider for advanced operations
   */
  getProvider(): AnchorProvider | undefined {
    return this.internalProvider;
  }

  private setupWalletAdapterListeners(): void {
    if (!this.walletAdapter) return;

    this.walletAdapter.on('connect', () => {
      console.log('👛 Wallet adapter connected');
    });

    this.walletAdapter.on('disconnect', () => {
      console.log('👛 Wallet adapter disconnected');
    });

    this.walletAdapter.on('error', (error) => {
      console.error('👛 Wallet adapter error:', error);
    });
  }
}

// ============================================================================
// Wallet Adapter Utilities
// ============================================================================

export class WalletAdapterUtils {
  /**
   * Create MainframeSDK from wallet adapter context (React hook pattern)
   */
  static fromWalletContext(
    adapter: WalletAdapter | null,
    connection: Connection,
    config: Partial<MainframeConfig>
  ): WalletAdapterMainframeSDK | null {
    if (!adapter?.connected || !adapter.publicKey) {
      return null;
    }

    const sdkConfig: MainframeConfig = {
      solanaNetwork: 'mainnet-beta',
      rpcEndpoint: connection.rpcEndpoint,
      programId: config.programId || 'mnfm211AwTDA8fGvPezYs3jjxAXgoucHGuTMUbjFssE',
      protocolWallet: config.protocolWallet || 'PROTOCOL_WALLET_PUBKEY_HERE',
      storage: config.storage || {
        arweave: { gateway: 'https://arweave.net' }
      },
      ...config
    };

    return new WalletAdapterMainframeSDK(sdkConfig);
  }

  /**
   * Handle wallet adapter network changes
   */
  static handleNetworkChange(
    sdk: WalletAdapterMainframeSDK,
    newNetwork: WalletAdapterNetwork
  ): void {
    console.log(`🔄 Wallet network changed to: ${newNetwork}`);
    
    // In a full implementation, you might want to reinitialize SDK
    // with different RPC endpoints based on network
  }

  /**
   * Validate wallet adapter compatibility
   */
  static validateAdapter(adapter: WalletAdapter): boolean {
    const required = ['connected', 'publicKey', 'sendTransaction'];
    return required.every(prop => prop in adapter);
  }

  /**
   * Get adapter capabilities
   */
  static getAdapterCapabilities(adapter: WalletAdapter): {
    canSign: boolean;
    canSignAll: boolean;
    canSignMessage: boolean;
    canSendTransaction: boolean;
  } {
    return {
      canSign: 'signTransaction' in adapter && typeof adapter.signTransaction === 'function',
      canSignAll: 'signAllTransactions' in adapter && typeof adapter.signAllTransactions === 'function',
      canSignMessage: 'signMessage' in adapter && typeof adapter.signMessage === 'function',
      canSendTransaction: 'sendTransaction' in adapter && typeof adapter.sendTransaction === 'function'
    };
  }
}

// ============================================================================
// React Hook Integration Helper
// ============================================================================

export interface UseMainframeSDKResult {
  sdk: WalletAdapterMainframeSDK | null;
  isReady: boolean;
  error: Error | null;
  reconnect: () => Promise<void>;
}

/**
 * Helper for React wallet adapter integration
 * 
 * @example
 * ```tsx
 * import { useWallet, useConnection } from '@solana/wallet-adapter-react';
 * import { createMainframeHook } from '@maikers/mainframe-sdk/integrations';
 * 
 * const useMainframe = createMainframeHook({
 *   programId: 'YOUR_PROGRAM_ID',
 *   protocolWallet: 'PROTOCOL_WALLET'
 * });
 * 
 * function MyComponent() {
 *   const { sdk, isReady } = useMainframe();
 *   
 *   const createAgent = async () => {
 *     if (!sdk) return;
 *     await sdk.createAgent(nftMint, agentConfig);
 *   };
 * }
 * ```
 */
export function createMainframeHook(config: Partial<MainframeConfig>) {
  return function useMainframeSDK(): UseMainframeSDKResult {
    // This would be implemented as a React hook in a separate React package
    // For now, return a helper that can be used to create the pattern
    
    const createSDKFromContext = (
      adapter: WalletAdapter | null,
      connection: Connection
    ): WalletAdapterMainframeSDK | null => {
      return WalletAdapterUtils.fromWalletContext(adapter, connection, config);
    };

    return {
      sdk: null, // Would be populated by React hook
      isReady: false,
      error: null,
      reconnect: async () => {
        // Would handle reconnection logic
      }
    } as UseMainframeSDKResult;
  };
}

// Export factory function
export const createWalletAdapterSDK = (
  adapter: WalletAdapter,
  connection: Connection,
  config: Partial<MainframeConfig>
) => WalletAdapterUtils.fromWalletContext(adapter, connection, config);
