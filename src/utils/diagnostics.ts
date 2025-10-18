/**
 * Integration Diagnostics & Recovery Utilities
 * 
 * Helps developers debug integration issues more effectively
 */

import { WalletAdapter } from '@solana/wallet-adapter-base';
import { Connection } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

export interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: any;
  fix?: string;
}

export interface IntegrationDiagnostics {
  overall: boolean;
  checks: Record<string, DiagnosticResult>;
  recommendedApproach: 'anchor' | 'walletAdapter' | 'basic' | 'unified';
}

export class MainframeIntegrationDiagnostics {
  
  /**
   * Comprehensive integration health check
   */
  static async runDiagnostics(
    walletAdapter: WalletAdapter,
    connection: Connection
  ): Promise<IntegrationDiagnostics> {
    const checks: Record<string, DiagnosticResult> = {};
    
    // Check 1: Wallet Connection
    checks.walletConnection = await this.checkWalletConnection(walletAdapter);
    
    // Check 2: RPC Connection
    checks.rpcConnection = await this.checkRPCConnection(connection);
    
    // Check 3: Anchor Provider Creation
    checks.anchorProvider = await this.checkAnchorProviderCreation(walletAdapter, connection);
    
    // Check 4: SDK Dependencies
    checks.dependencies = await this.checkSDKDependencies();
    
    // Check 5: Network Compatibility
    checks.network = await this.checkNetworkCompatibility(connection);
    
    const overall = Object.values(checks).every(check => check.success);
    const recommendedApproach = this.getRecommendedApproach(checks);
    
    return { overall, checks, recommendedApproach };
  }

  private static async checkWalletConnection(adapter: WalletAdapter): Promise<DiagnosticResult> {
    try {
      if (!adapter.connected) {
        return {
          success: false,
          message: 'Wallet not connected',
          fix: 'Ensure wallet.connect() was called and succeeded'
        };
      }
      
      if (!adapter.publicKey) {
        return {
          success: false,
          message: 'Wallet connected but no public key available',
          fix: 'Check wallet permissions and try reconnecting'
        };
      }
      
      if (adapter.readyState !== 'Installed') {
        return {
          success: false,
          message: `Wallet ready state is ${adapter.readyState}, expected 'Installed'`,
          fix: 'Install the wallet extension or check wallet status'
        };
      }
      
      return {
        success: true,
        message: `Wallet ${adapter.name} properly connected`,
        details: {
          publicKey: adapter.publicKey.toBase58(),
          readyState: adapter.readyState
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Wallet connection check failed',
        details: error,
        fix: 'Check wallet extension installation and permissions'
      };
    }
  }

  private static async checkRPCConnection(connection: Connection): Promise<DiagnosticResult> {
    try {
      const startTime = Date.now();
      const slot = await connection.getSlot();
      const latency = Date.now() - startTime;
      
      if (slot <= 0) {
        return {
          success: false,
          message: 'Invalid slot number returned from RPC',
          fix: 'Check RPC endpoint URL and network status'
        };
      }
      
      if (latency > 5000) {
        return {
          success: false,
          message: `RPC latency too high: ${latency}ms`,
          fix: 'Consider using a faster RPC endpoint'
        };
      }
      
      return {
        success: true,
        message: 'RPC connection healthy',
        details: {
          endpoint: connection.rpcEndpoint,
          slot,
          latency: `${latency}ms`
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'RPC connection failed',
        details: error,
        fix: 'Verify RPC endpoint URL and network connectivity'
      };
    }
  }

  private static async checkAnchorProviderCreation(
    adapter: WalletAdapter,
    connection: Connection
  ): Promise<DiagnosticResult> {
    try {
      const { AnchorUtils } = await import('../integrations/anchor');
      
      const provider = AnchorUtils.createProvider(connection, adapter as any, {
        commitment: 'confirmed'
      });
      
      if (!provider.wallet?.publicKey) {
        return {
          success: false,
          message: 'Anchor provider created but wallet not accessible',
          fix: 'Check wallet adapter compatibility with Anchor'
        };
      }
      
      return {
        success: true,
        message: 'Anchor provider creation successful',
        details: {
          commitment: provider.opts.commitment,
          walletPublicKey: provider.wallet.publicKey.toBase58()
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Anchor provider creation failed',
        details: error,
        fix: 'Ensure @coral-xyz/anchor is properly installed and wallet is compatible'
      };
    }
  }

  private static async checkSDKDependencies(): Promise<DiagnosticResult> {
    try {
      const requiredDeps = [
        '@coral-xyz/anchor',
        '@solana/wallet-adapter-base',
        '@solana/web3.js'
      ];
      
      const missing: string[] = [];
      
      for (const dep of requiredDeps) {
        try {
          await import(dep);
        } catch {
          missing.push(dep);
        }
      }
      
      if (missing.length > 0) {
        return {
          success: false,
          message: 'Missing required dependencies',
          details: { missing },
          fix: `Install missing packages: ${missing.join(', ')}`
        };
      }
      
      return {
        success: true,
        message: 'All dependencies available'
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Dependency check failed',
        details: error,
        fix: 'Check package.json and run npm/yarn install'
      };
    }
  }

  private static async checkNetworkCompatibility(connection: Connection): Promise<DiagnosticResult> {
    try {
      // Check if we're on the expected network
      const genesisHash = await connection.getGenesisHash();
      
      const knownNetworks = {
        'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
        'devnet': 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
        'testnet': '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY'
      };
      
      const networkName = Object.entries(knownNetworks)
        .find(([, hash]) => hash === genesisHash)?.[0] || 'unknown';
      
      return {
        success: true,
        message: `Connected to ${networkName} network`,
        details: {
          network: networkName,
          genesisHash
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Network compatibility check failed',
        details: error,
        fix: 'Verify network configuration and RPC endpoint'
      };
    }
  }

  private static getRecommendedApproach(
    checks: Record<string, DiagnosticResult>
  ): 'anchor' | 'walletAdapter' | 'basic' | 'unified' {
    if (checks.anchorProvider?.success && checks.walletConnection?.success) {
      return 'unified'; // Try unified approach which prefers Anchor but falls back
    }
    
    if (checks.walletConnection?.success && checks.rpcConnection?.success) {
      return 'walletAdapter';
    }
    
    if (checks.rpcConnection?.success) {
      return 'basic';
    }
    
    return 'unified'; // Default fallback
  }

  /**
   * Generate integration code based on diagnostic results
   */
  static generateIntegrationCode(
    diagnostics: IntegrationDiagnostics,
    walletVariableName: string = 'walletAdapter',
    connectionVariableName: string = 'connection'
  ): string {
    const { recommendedApproach } = diagnostics;
    
    switch (recommendedApproach) {
      case 'anchor':
        return `
// Recommended: Anchor Provider approach
import { QuickStartIntegrations } from '@maikers/mainframe-sdk';
import { AnchorUtils } from '@maikers/mainframe-sdk/integrations/anchor';

const provider = AnchorUtils.createProvider(${connectionVariableName}, ${walletVariableName}, {
  commitment: 'confirmed'
});

const sdk = await QuickStartIntegrations.anchor(provider, {
  programId: 'YOUR_PROGRAM_ID',
  protocolWallet: 'YOUR_PROTOCOL_WALLET'
});
`;

      case 'unified':
        return `
// Recommended: Unified approach with fallbacks
import { QuickStartIntegrations } from '@maikers/mainframe-sdk';

const sdk = await QuickStartIntegrations.unified(${walletVariableName}, ${connectionVariableName}, {
  programId: 'YOUR_PROGRAM_ID',
  protocolWallet: 'YOUR_PROTOCOL_WALLET'
});
`;

      case 'walletAdapter':
        return `
// Recommended: Wallet Adapter approach
import { QuickStartIntegrations } from '@maikers/mainframe-sdk';

const sdk = await QuickStartIntegrations.walletAdapter(${walletVariableName}, ${connectionVariableName}, {
  programId: 'YOUR_PROGRAM_ID',
  protocolWallet: 'YOUR_PROTOCOL_WALLET'
});
`;

      default:
        return `
// Fallback: Basic approach
import { createMainnetSDK } from '@maikers/mainframe-sdk';

const sdk = createMainnetSDK({
  rpcEndpoint: ${connectionVariableName}.rpcEndpoint,
  programId: 'YOUR_PROGRAM_ID',
  protocolWallet: 'YOUR_PROTOCOL_WALLET'
});

await sdk.initialize();
`;
    }
  }

  /**
   * Print diagnostic results in a readable format
   */
  static printDiagnostics(diagnostics: IntegrationDiagnostics): void {
    console.log('\n🔍 Mainframe SDK Integration Diagnostics');
    console.log('=' .repeat(50));
    
    Object.entries(diagnostics.checks).forEach(([check, result]) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${check}: ${result.message}`);
      
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      
      if (!result.success && result.fix) {
        console.log(`   Fix: ${result.fix}`);
      }
      console.log('');
    });
    
    console.log(`🎯 Recommended approach: ${diagnostics.recommendedApproach}`);
    console.log(`📊 Overall status: ${diagnostics.overall ? '✅ Ready' : '❌ Issues detected'}`);
    console.log('=' .repeat(50) + '\n');
  }
}
