/**
 * Integration utilities for popular Solana packages
 * 
 * Provides seamless integration with @coral-xyz/anchor, anza-xyz/kit,
 * gillsdk/gill, and other Solana development tools.
 */

// ============================================================================
// Anchor Integration
// ============================================================================

export {
  AnchorMainframeSDK,
  AnchorUtils
} from './anchor';
export type {
  AnchorMainframeConfig,
  AnchorTransactionBuilder
} from './anchor';

// ============================================================================
// Wallet Adapter Integration  
// ============================================================================

export {
  WalletAdapterMainframeSDK,
  WalletAdapterUtils,
  createMainframeHook,
  createWalletAdapterSDK
} from './wallet-adapters';
export type {
  UseMainframeSDKResult
} from './wallet-adapters';

// ============================================================================
// General Toolkit Integration
// ============================================================================

export {
  ToolkitMainframeSDK,
  TokenAccountUtils,
  CrossChainUtils,
  TransactionBuilderUtils,
  ToolkitIntegration,
  createToolkitSDK,
  createFromConnection,
  // Re-export useful Solana constants
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SystemProgram,
  ComputeBudgetProgram,
  SYSVAR_RENT_PUBKEY
} from './solana-toolkit';

// ============================================================================
// Integration Factory
// ============================================================================

import { Connection, PublicKey } from '@solana/web3.js';
import { WalletAdapter } from '@solana/wallet-adapter-base';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import type { MainframeConfig } from '../types';

export class IntegrationFactory {
  /**
   * Auto-detect and create appropriate SDK based on available context
   */
  static auto(context: {
    config: Partial<MainframeConfig>;
    anchor?: {
      provider?: AnchorProvider;
      program?: Program;
      idl?: Idl;
    };
    walletAdapter?: {
      adapter: WalletAdapter;
      connection: Connection;
    };
    connection?: Connection;
    wallet?: { publicKey: PublicKey; signTransaction: any };
  }) {
    // Prefer Anchor if available
    if (context.anchor?.provider) {
      const { AnchorMainframeSDK, AnchorIntegrationHelpers } = require('./anchor');
      return AnchorIntegrationHelpers.fromAnchorProvider(
        context.anchor.provider,
        context.config,
        context.anchor.idl
      );
    }

    // Use wallet adapter if available
    if (context.walletAdapter) {
      const { WalletAdapterUtils } = require('./wallet-adapters');
      return WalletAdapterUtils.fromWalletContext(
        context.walletAdapter.adapter,
        context.walletAdapter.connection,
        context.config
      );
    }

    // Use general toolkit integration
    if (context.connection && context.wallet) {
      const { ToolkitIntegration } = require('./solana-toolkit');
      return ToolkitIntegration.fromConnection(
        context.connection,
        context.wallet,
        context.config
      );
    }

    // Fallback to basic SDK
    const { MainframeSDK } = require('../sdk');
    const fullConfig: MainframeConfig = {
      solanaNetwork: 'mainnet-beta',
      rpcEndpoint: 'https://api.mainnet-beta.solana.com',
      // programId will default to mainnet if not provided
      // protocolWallet deprecated - fetched from on-chain config
      storage: {
        arweave: { gateway: 'https://arweave.net' }
      },
      ...context.config
    };
    
    return new MainframeSDK(fullConfig);
  }

  /**
   * Create SDK for specific toolkit
   */
  static forToolkit(
    toolkit: 'anchor' | 'anza' | 'gill',
    config: Partial<MainframeConfig>,
    toolkitContext?: any
  ) {
    switch (toolkit) {
      case 'anchor':
        const { AnchorMainframeSDK } = require('./anchor');
        return new AnchorMainframeSDK({
          ...config,
          anchor: toolkitContext || {}
        });
        
      case 'anza':
      case 'gill':
        const { ToolkitMainframeSDK } = require('./solana-toolkit');
        return new ToolkitMainframeSDK(config as MainframeConfig);
        
      default:
        throw new Error(`Unsupported toolkit: ${toolkit}`);
    }
  }
}

// ============================================================================
// Quick Integration Helpers
// ============================================================================

export const QuickIntegration = {
  /**
   * For Anchor developers
   */
  anchor: {
    fromProvider: (provider: AnchorProvider, config: Partial<MainframeConfig>, idl?: Idl) => {
      const { AnchorIntegrationHelpers } = require('./anchor');
      return AnchorIntegrationHelpers.fromAnchorProvider(provider, config, idl);
    },
    
    withProgram: (program: Program, config: Partial<MainframeConfig>) => {
      const { AnchorMainframeSDK } = require('./anchor');
      return new AnchorMainframeSDK({
        ...config,
        anchor: { provider: program.provider as AnchorProvider }
      });
    }
  },

  /**
   * For wallet-adapter-react users
   */
  walletAdapter: {
    fromHook: (adapter: WalletAdapter, connection: Connection, config: Partial<MainframeConfig>) => {
      const { WalletAdapterUtils } = require('./wallet-adapters');
      return WalletAdapterUtils.fromWalletContext(adapter, connection, config);
    }
  },

  /**
   * For toolkit developers
   */
  toolkit: {
    fromConnection: (connection: Connection, wallet: any, config: Partial<MainframeConfig>) => {
      const { ToolkitIntegration } = require('./solana-toolkit');
      return ToolkitIntegration.fromConnection(connection, wallet, config);
    }
  }
};
