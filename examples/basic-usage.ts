/**
 * Basic usage example for Mainframe SDK
 */

import { createMainnetSDK, type AgentConfig } from '@maikers/mainframe-sdk';

async function basicExample() {
  console.log('🚀 Initializing Mainframe SDK...');
  
  // Initialize SDK for mainnet
  const sdk = createMainnetSDK({
    storage: {
      ipfs: {
        apiKey: process.env.PINATA_JWT // Your Pinata JWT token
      }
    }
  });

  try {
    // Connect wallet
    console.log('👛 Connecting wallet...');
    const walletResult = await sdk.initialize('Phantom');
    console.log(`✅ Connected to ${walletResult.walletName}: ${walletResult.publicKey}`);

    // Define agent configuration
    const agentConfig: AgentConfig = {
      name: 'DeFi Trading Assistant',
      description: 'Automated trading bot for Solana DeFi protocols',
      purpose: 'Execute optimized trading strategies while managing risk',
      personality: {
        traits: ['analytical', 'risk-aware', 'efficient'],
        style: 'professional'
      },
      capabilities: [{
        type: 'defi',
        plugins: ['jupiter-swap', 'orca-pools'],
        config: {
          maxSlippage: 0.5,
          minLiquidity: 10000
        }
      }],
      framework: 'elizaOS',
      plugins: [{
        id: 'jupiter-swap',
        version: '1.0.0',
        enabled: true,
        config: { 
          apiKey: process.env.JUPITER_API_KEY // Your Jupiter API key (encrypted client-side)
        },
        permissions: ['trade', 'quote']
      }],
      runtime: {
        memory: { type: 'redis', ttl: 3600 },
        scheduling: { enabled: true, interval: 60000 },
        monitoring: { enabled: true, alerts: true }
      },
      permissions: {
        maxTradeSize: '1000 USDC',
        allowedTokens: ['SOL', 'USDC', 'USDT'],
        tradingHours: { start: '09:00', end: '17:00', timezone: 'UTC' }
      },
      preferences: {
        notifications: true,
        riskLevel: 'medium',
        autoRebalance: true
      }
    };

    // Create agent from NFT
    console.log('🤖 Creating AI agent...');
    const nftMint = process.env.NFT_MINT_ADDRESS; // Your NFT mint address
    
    if (!nftMint) {
      throw new Error('NFT_MINT_ADDRESS environment variable required');
    }

    const result = await sdk.createAgent(nftMint, agentConfig);
    console.log(`✅ Agent created successfully!`);
    console.log(`📎 Agent Account: ${result.agentAccount}`);
    console.log(`📎 Transaction: ${result.signature}`);
    console.log(`📎 Metadata URI: ${result.metadataUri}`);

    // Listen for agent deployment
    console.log('👂 Listening for agent deployment...');
    const deploySubscription = sdk.events.onAgentDeployed(result.agentAccount, (event) => {
      console.log('🚀 Agent deployed and running:', {
        agentAccount: event.agentAccount,
        nodeId: event.nodeId,
        status: event.status
      });
    });

    // Listen for agent events
    const eventSubscription = sdk.events.onAgentUpdated((event) => {
      console.log('🔄 Agent configuration updated:', {
        agentAccount: event.agentAccount,
        version: event.newVersion,
        metadataUri: event.metadataUri
      });
    });

    // Wait a bit for events, then cleanup
    setTimeout(async () => {
      deploySubscription.unsubscribe();
      eventSubscription.unsubscribe();
      await sdk.cleanup();
      console.log('👋 Example completed');
    }, 30000);

  } catch (error) {
    console.error('❌ Error:', error);
    await sdk.cleanup();
  }
}

// Development example with mock services
async function developmentExample() {
  console.log('🧪 Development example with mocks...');
  
  const { createTestSDK } = await import('@maikers/mainframe-sdk/testing');
  
  const sdk = createTestSDK();
  await sdk.initializeForTesting();
  
  // Create test agent
  const { TestFixtures } = await import('@maikers/mainframe-sdk/testing');
  const agentConfig = TestFixtures.createAgentConfig({
    name: 'Test Bot',
    purpose: 'Testing purposes'
  });
  
  const nftMint = TestFixtures.randomAddress();
  const result = await sdk.createAgent(nftMint, agentConfig);
  
  console.log('✅ Test agent created:', result.agentAccount);
  
  // Get all agents
  const myAgents = await sdk.getMyAgents();
  console.log(`📋 Found ${myAgents.length} agents`);
  
  await sdk.cleanup();
  console.log('🧹 Development example completed');
}

// Run examples
if (require.main === module) {
  const mode = process.argv[2] || 'development';
  
  if (mode === 'mainnet') {
    basicExample().catch(console.error);
  } else {
    developmentExample().catch(console.error);
  }
}
