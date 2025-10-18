/**
 * Example: Integration with general Solana toolkits
 * (Anza kit, Gill SDK, or custom toolkits)
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { 
  createToolkitSDK,
  createFromConnection,
  ToolkitIntegration,
  TransactionBuilderUtils,
  TokenAccountUtils,
  IntegrationFactory
} from '@maikers/mainframe-sdk/integrations';
import type { AgentConfig } from '@maikers/mainframe-sdk';

// ============================================================================
// Anza Kit Style Integration
// ============================================================================

async function anzaKitIntegration() {
  console.log('🧰 Anza Kit Style Integration');

  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = Keypair.generate(); // In real app, use wallet from Anza kit
  
  try {
    // Create SDK compatible with Anza patterns
    const sdk = createFromConnection(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: async (tx) => {
          tx.partialSign(wallet);
          return tx;
        }
      },
      {
        programId: 'YOUR_PROGRAM_ID',
        protocolWallet: 'PROTOCOL_WALLET'
      }
    );

    await sdk.initialize();

    // Use toolkit-specific utilities
    const agentConfig: AgentConfig = {
      name: 'Anza-Powered Agent',
      description: 'High-performance trading agent',
      purpose: 'Execute strategies using Anza toolkit patterns',
      personality: {
        traits: ['efficient', 'performance-focused'],
        style: 'technical'
      },
      capabilities: [{
        type: 'defi',
        plugins: ['anza-optimized-swap'],
        config: { useAdvancedRouting: true }
      }],
      framework: 'elizaOS',
      plugins: [],
      runtime: {
        memory: { type: 'memory' },
        scheduling: { enabled: true, interval: 30000 },
        monitoring: { enabled: true }
      },
      permissions: {
        maxTradeSize: '5000 USDC',
        allowedTokens: ['SOL', 'USDC', 'USDT', 'mSOL']
      },
      preferences: {
        notifications: true,
        riskLevel: 'high' // Higher risk for advanced strategies
      }
    };

    // Create with priority fees (common in Anza patterns)
    const result = await sdk.createAgentWithPriorityFee(
      'YOUR_NFT_MINT',
      agentConfig,
      5000, // Priority fee rate
      600000 // Compute units
    );

    console.log('✅ Anza-style agent created:', result);

    await sdk.cleanup();

  } catch (error) {
    console.error('❌ Anza integration error:', error);
  }
}

// ============================================================================
// Gill SDK Style Integration  
// ============================================================================

async function gillSDKIntegration() {
  console.log('🐟 Gill SDK Style Integration');

  try {
    // Auto-detect best integration method
    const sdk = IntegrationFactory.auto({
      config: {
        programId: 'YOUR_PROGRAM_ID',
        protocolWallet: 'PROTOCOL_WALLET',
        development: { logLevel: 'debug' }
      },
      connection: new Connection('https://api.mainnet-beta.solana.com'),
      wallet: {
        publicKey: Keypair.generate().publicKey,
        signTransaction: async (tx) => tx
      }
    });

    await sdk.initialize();

    // Use batch operations (efficient pattern for multiple agents)
    const batchOperations = [
      {
        type: 'create' as const,
        nftMint: 'NFT_MINT_1',
        agentConfig: {
          name: 'Gill Agent 1',
          description: 'First agent in batch',
          purpose: 'Batch operation demo',
          personality: { traits: ['efficient'], style: 'technical' as const },
          capabilities: [{ type: 'defi' as const, plugins: ['swap'], config: {} }],
          framework: 'elizaOS' as const,
          plugins: [],
          runtime: {
            memory: { type: 'memory' as const },
            scheduling: { enabled: true },
            monitoring: { enabled: true }
          },
          permissions: {},
          preferences: { notifications: true, riskLevel: 'low' as const }
        }
      },
      {
        type: 'create' as const,
        nftMint: 'NFT_MINT_2',
        agentConfig: {
          name: 'Gill Agent 2',
          description: 'Second agent in batch',
          purpose: 'Batch operation demo',
          personality: { traits: ['reliable'], style: 'professional' as const },
          capabilities: [{ type: 'analytics' as const, plugins: ['monitor'], config: {} }],
          framework: 'elizaOS' as const,
          plugins: [],
          runtime: {
            memory: { type: 'memory' as const },
            scheduling: { enabled: true },
            monitoring: { enabled: true }
          },
          permissions: {},
          preferences: { notifications: true, riskLevel: 'medium' as const }
        }
      }
    ];

    // Execute batch operations
    if ('batchAgentOperations' in sdk) {
      const batchSignature = await (sdk as any).batchAgentOperations(batchOperations);
      console.log('✅ Batch operations completed:', batchSignature);
    }

    await sdk.cleanup();

  } catch (error) {
    console.error('❌ Gill integration error:', error);
  }
}

// ============================================================================
// Advanced Transaction Building
// ============================================================================

async function advancedTransactionExample() {
  console.log('⚡ Advanced Transaction Building Example');

  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const payer = Keypair.generate();

  try {
    // Use transaction builder utilities
    const instructions = [
      // Mock instruction - replace with actual agent instruction
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: Keypair.generate().publicKey,
        lamports: 1000000,
        space: 0,
        programId: SystemProgram.programId
      })
    ];

    // Create optimized transaction
    const transaction = await TransactionBuilderUtils.createOptimizedTransaction(
      connection,
      payer.publicKey,
      instructions,
      {
        priorityFeeRate: 10000,
        computeUnits: 400000
      }
    );

    // Estimate fees
    const feeEstimate = await TransactionBuilderUtils.estimateTransactionFee(
      connection,
      transaction
    );

    console.log('💰 Fee estimate:', {
      base: `${feeEstimate.baseFee} lamports`,
      compute: `${feeEstimate.computeFee} lamports`, 
      total: `${feeEstimate.totalFee} lamports (${feeEstimate.totalFee / 1e9} SOL)`
    });

    // Calculate rent for agent account
    const rent = await TokenAccountUtils.calculateAgentAccountRent(connection);
    console.log(`🏠 Agent account rent: ${rent} lamports (${rent / 1e9} SOL)`);

  } catch (error) {
    console.error('❌ Advanced transaction error:', error);
  }
}

// ============================================================================
// React Component for Wallet Adapter Pattern
// ============================================================================

export function WalletIntegratedMainframe() {
  const { sdk, isReady, error } = useMainframeSDK();
  const [agents, setAgents] = useState<AgentSummary[]>([]);

  useEffect(() => {
    if (sdk && isReady) {
      sdk.getMyAgents()
        .then(setAgents)
        .catch(console.error);
    }
  }, [sdk, isReady]);

  if (error) {
    return (
      <div style={{ color: 'red', padding: '16px' }}>
        Error: {error.message}
      </div>
    );
  }

  if (!isReady) {
    return (
      <div style={{ padding: '16px' }}>
        Loading Mainframe SDK...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h2>🤖 Mainframe Agents</h2>
      
      <div style={{ display: 'grid', gap: '16px' }}>
        {agents.map(agent => (
          <div 
            key={agent.account}
            style={{
              padding: '16px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              backgroundColor: '#f9fafb'
            }}
          >
            <h3>{agent.name}</h3>
            <p><strong>Status:</strong> {agent.status}</p>
            <p><strong>NFT:</strong> {agent.nftMint}</p>
            <p><strong>Updated:</strong> {agent.lastUpdate.toLocaleString()}</p>
            
            <div style={{ marginTop: '12px' }}>
              <button 
                onClick={() => sdk?.pauseAgent(agent.account)}
                style={{
                  marginRight: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ⏸️ Pause
              </button>
              <button 
                onClick={() => sdk?.resumeAgent(agent.account)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ▶️ Resume
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Run examples (Node.js)
if (require.main === module) {
  console.log('🚀 Running toolkit integration examples...\n');
  
  Promise.all([
    anzaKitIntegration(),
    gillSDKIntegration(),
    advancedTransactionExample()
  ])
  .then(() => console.log('\n✅ All examples completed'))
  .catch(console.error);
}
