/**
 * Example: Integration with @solana/wallet-adapter-react
 */

import React, { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { 
  createWalletAdapterSDK,
  QuickIntegration,
  WalletAdapterMainframeSDK 
} from '@maikers/mainframe-sdk/integrations';
import type { AgentConfig, AgentSummary } from '@maikers/mainframe-sdk';

// ============================================================================
// React Hook for MainframeSDK
// ============================================================================

export function useMainframeSDK() {
  const { wallet, connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [sdk, setSdk] = useState<WalletAdapterMainframeSDK | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!connected || !wallet || !publicKey) {
      setSdk(null);
      setIsReady(false);
      return;
    }

    const initializeSDK = async () => {
      try {
        setError(null);
        
        // Create SDK from wallet adapter context
        const newSDK = QuickIntegration.walletAdapter.fromHook(
          wallet.adapter,
          connection,
          {
            programId: process.env.NEXT_PUBLIC_PROGRAM_ID || 'MFRMEqXBHSWppwJCmqXqb7oPH9eMqPPUa7Jqi6r8D1v3',
            protocolWallet: process.env.NEXT_PUBLIC_PROTOCOL_WALLET || 'PROTOCOL_WALLET_PUBKEY_HERE'
          }
        );

        if (newSDK) {
          await newSDK.initializeWithAdapter(wallet.adapter, connection);
          setSdk(newSDK);
          setIsReady(true);
        }

      } catch (err) {
        setError(err as Error);
        setIsReady(false);
      }
    };

    initializeSDK();

    // Cleanup on unmount or wallet change
    return () => {
      if (sdk) {
        sdk.cleanup().catch(console.error);
      }
    };
  }, [connected, wallet, publicKey, connection]);

  const reconnect = async () => {
    if (wallet) {
      try {
        await wallet.adapter.connect();
      } catch (err) {
        setError(err as Error);
      }
    }
  };

  return {
    sdk,
    isReady,
    error,
    reconnect
  };
}

// ============================================================================
// Example React Components
// ============================================================================

export function AgentCreator() {
  const { sdk, isReady } = useMainframeSDK();
  const [isCreating, setIsCreating] = useState(false);
  const [agentAccount, setAgentAccount] = useState<string | null>(null);

  const handleCreateAgent = async () => {
    if (!sdk || !isReady) return;

    setIsCreating(true);
    try {
      const agentConfig: AgentConfig = {
        name: 'React DeFi Bot',
        description: 'Agent created from React app',
        purpose: 'Execute DeFi strategies from web interface',
        personality: {
          traits: ['responsive', 'user-friendly'],
          style: 'friendly'
        },
        capabilities: [{
          type: 'defi',
          plugins: ['jupiter-swap'],
          config: { maxSlippage: 1.0 }
        }],
        framework: 'elizaOS',
        plugins: [],
        runtime: {
          memory: { type: 'memory' },
          scheduling: { enabled: true },
          monitoring: { enabled: true }
        },
        permissions: {
          maxTradeSize: '500 USDC',
          allowedTokens: ['SOL', 'USDC']
        },
        preferences: {
          notifications: true,
          riskLevel: 'medium'
        }
      };

      const nftMint = 'YOUR_NFT_MINT_ADDRESS'; // Get from user input
      const result = await sdk.createAgent(nftMint, agentConfig);
      
      setAgentAccount(result.agentAccount);
      
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isReady) {
    return <div>Connect your wallet to create agents...</div>;
  }

  return (
    <div>
      <h3>Create AI Agent</h3>
      <button 
        onClick={handleCreateAgent} 
        disabled={isCreating}
        style={{
          padding: '12px 24px',
          backgroundColor: '#9333ea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isCreating ? 'not-allowed' : 'pointer'
        }}
      >
        {isCreating ? 'Creating...' : 'Create Agent'}
      </button>
      
      {agentAccount && (
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
          <h4>✅ Agent Created!</h4>
          <p><strong>Account:</strong> {agentAccount}</p>
        </div>
      )}
    </div>
  );
}

export function AgentList() {
  const { sdk, isReady } = useMainframeSDK();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAgents = async () => {
    if (!sdk || !isReady) return;

    setLoading(true);
    try {
      const myAgents = await sdk.getMyAgents();
      setAgents(myAgents);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady) {
      loadAgents();
    }
  }, [isReady]);

  if (!isReady) {
    return <div>Connect your wallet to view agents...</div>;
  }

  return (
    <div>
      <h3>My AI Agents</h3>
      <button 
        onClick={loadAgents} 
        disabled={loading}
        style={{
          padding: '8px 16px',
          marginBottom: '16px',
          backgroundColor: '#059669',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>

      {agents.length === 0 ? (
        <p>No agents found. Create your first agent!</p>
      ) : (
        <div>
          {agents.map((agent) => (
            <div 
              key={agent.account}
              style={{
                padding: '16px',
                marginBottom: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#fafafa'
              }}
            >
              <h4>{agent.name}</h4>
              <p><strong>Status:</strong> {agent.status}</p>
              <p><strong>NFT:</strong> {agent.nftMint.slice(0, 8)}...{agent.nftMint.slice(-8)}</p>
              <p><strong>Last Update:</strong> {agent.lastUpdate.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Complete React App Example
// ============================================================================

export function MainframeApp() {
  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🤖 Mainframe</h1>
      <p>AI Agent Management powered by Solana</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div>
          <AgentCreator />
        </div>
        <div>
          <AgentList />
        </div>
      </div>
    </div>
  );
}
