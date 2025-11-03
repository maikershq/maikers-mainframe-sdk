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
      // programId will default to mainnet if not provided
      // protocolWallet deprecated - fetched from on-chain config
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
 * Template for React wallet adapter integration hook
 * 
 * This is a reference implementation template. React hooks should be implemented
 * in a separate @maikers/mainframe-sdk-react package to avoid React dependencies
 * in the core SDK.
 * 
 * @example Implementation in React package
 * ```tsx
 * import { useState, useEffect } from 'react';
 * import { useWallet, useConnection } from '@solana/wallet-adapter-react';
 * import { WalletAdapterUtils } from '@maikers/mainframe-sdk/integrations';
 * 
 * export function useMainframeSDK(config: Partial<MainframeConfig>) {
 *   const { wallet } = useWallet();
 *   const { connection } = useConnection();
 *   const [sdk, setSdk] = useState<WalletAdapterMainframeSDK | null>(null);
 *   const [isReady, setIsReady] = useState(false);
 *   const [error, setError] = useState<Error | null>(null);
 * 
 *   useEffect(() => {
 *     if (!wallet?.adapter || !connection) {
 *       setSdk(null);
 *       setIsReady(false);
 *       return;
 *     }
 * 
 *     try {
 *       const newSdk = WalletAdapterUtils.fromWalletContext(
 *         wallet.adapter,
 *         connection,
 *         config
 *       );
 *       setSdk(newSdk);
 *       setIsReady(true);
 *       setError(null);
 *     } catch (err) {
 *       setError(err as Error);
 *       setSdk(null);
 *       setIsReady(false);
 *     }
 *   }, [wallet, connection, config]);
 * 
 *   return { sdk, isReady, error, reconnect: async () => {} };
 * }
 * ```
 */
export function createMainframeHook(config: Partial<MainframeConfig>) {
  throw new Error(
    'createMainframeHook is a template for React integration. ' +
    'React hooks must be implemented in a separate React package ' +
    'to avoid React dependencies in the core SDK. ' +
    'Use WalletAdapterUtils.fromWalletContext() directly or ' +
    'implement the hook pattern shown in the documentation.'
  );
}

// Export factory function
export const createWalletAdapterSDK = (
  adapter: WalletAdapter,
  connection: Connection,
  config: Partial<MainframeConfig>
) => WalletAdapterUtils.fromWalletContext(adapter, connection, config);
