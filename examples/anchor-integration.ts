/**
 * Example: Integration with @coral-xyz/anchor
 */

import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair } from '@solana/web3.js';
import { 
  createAnchorMainframeSDK, 
  AnchorUtils,
  QuickIntegration 
} from '@maikers/mainframe-sdk/integrations';
import type { AgentConfig } from '@maikers/mainframe-sdk';

async function anchorIntegrationExample() {
  console.log('🏗️ Anchor Framework Integration Example');

  // Setup Anchor provider (typical Anchor pattern)
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = new Wallet(Keypair.generate()); // In real app, use connected wallet
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed'
  });

  try {
    // Method 1: Create SDK with Anchor provider
    const sdk = QuickIntegration.anchor.fromProvider(provider, {
      programId: 'MFRMEqXBHSWppwJCmqXqb7oPH9eMqPPUa7Jqi6r8D1v3',
      protocolWallet: 'PROTOCOL_WALLET_PUBKEY_HERE'
    });

    await sdk.initializeWithProvider(provider);

    // Method 2: Use existing Anchor program
    const programIdl = await AnchorUtils.loadIdl('./program-idl.json');
    const program = new Program(programIdl, provider);
    
    const sdkWithProgram = QuickIntegration.anchor.withProgram(program, {
      protocolWallet: 'PROTOCOL_WALLET_PUBKEY_HERE'
    });

    // Create agent using Anchor patterns
    const agentConfig: AgentConfig = {
      name: 'Anchor-Powered Bot',
      description: 'Agent created using Anchor integration',
      purpose: 'Demonstrate Anchor compatibility',
      personality: {
        traits: ['technical', 'precise'],
        style: 'professional'
      },
      capabilities: [{
        type: 'defi',
        plugins: ['anchor-program-interactions'],
        config: { useAnchor: true }
      }],
      framework: 'elizaOS',
      plugins: [],
      runtime: {
        memory: { type: 'memory' },
        scheduling: { enabled: true },
        monitoring: { enabled: true }
      },
      permissions: {
        allowedTokens: ['SOL', 'USDC']
      },
      preferences: {
        notifications: true,
        riskLevel: 'low'
      }
    };

    const nftMint = 'YOUR_NFT_MINT_ADDRESS';
    const result = await sdk.createAgent(nftMint, agentConfig);

    console.log('✅ Agent created with Anchor integration:', result.agentAccount);

    // Use Anchor-specific features
    const [agentPDA] = AnchorUtils.derivePDA(
      ['agent', Buffer.from(nftMint)],
      program.programId
    );

    console.log('📎 Derived Agent PDA:', agentPDA.toBase58());

    // Build custom Anchor instruction
    const customInstruction = await sdk.buildAnchorInstruction(
      'updateAgentConfig',
      {
        agentAccount: agentPDA,
        owner: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId
      },
      ['new-metadata-uri']
    );

    console.log('🔧 Custom Anchor instruction built');

    // Cleanup
    await sdk.cleanup();

  } catch (error) {
    console.error('❌ Anchor integration error:', error);
  }
}

// Run example
if (require.main === module) {
  anchorIntegrationExample().catch(console.error);
}
