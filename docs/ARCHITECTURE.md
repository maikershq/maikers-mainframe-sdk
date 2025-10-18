# Architecture

The SDK consists of several key services and production utilities designed for enterprise-scale reliability.

## Core Services

### Encryption Service
- **Client-side encryption** using libsodium XChaCha20-Poly1305
- **Dual access keyring** for user + protocol wallet access
- **NFT binding** via associated data in AEAD encryption
- **Key derivation** from Ed25519 to Curve25519 for sealed boxes

### Storage Service
- **Arweave primary storage** for permanent, immutable metadata storage  
- **IPFS fallback** with HTTP API and pinning support
- **Automatic failover** and redundancy mechanisms
- **Intelligent caching** with multi-tier TTL expiration

**CRITICAL WARNING**: Changing the primary storage provider after agent creation may cause agents to halt if metadata becomes unavailable at the original URI. Arweave is the recommended default for production due to its permanent storage guarantees.

### Program Service
- **Anchor program integration** for Solana transactions
- **PDA derivation** for agent accounts and protocol config
- **Fee calculation** with collection-based discounts
- **Event parsing** from transaction logs

### Wallet Service
- **Multi-wallet support** (Phantom, Solflare, Backpack, Glow)
- **Transaction signing** with user approval
- **Auto-reconnection** to previously connected wallets
- **Mobile wallet** deep link support

### Event Service
- **Real-time monitoring** of on-chain events
- **WebSocket connection** to mainframe-node for off-chain events
- **Event filtering** and subscription management
- **Historical event** queries

## Production Utilities

### Security Layer
- **Rate Limiter**: Per-user request throttling with sliding window
- **Circuit Breaker**: Automatic failure detection and recovery
- **Security Middleware**: Operation-level validation and audit logging
- **Input Sanitizer**: XSS/SQL injection protection and file validation
- **Audit Logger**: Complete security event tracking and analysis

### Performance Layer
- **Connection Pool**: Intelligent RPC connection management
- **LRU Cache**: Multi-tier caching with configurable TTL
- **Batch Processor**: Smart operation batching with retry logic
- **Metrics Collector**: Real-time performance monitoring
- **Memory Manager**: Automatic resource optimization and cleanup

### Monitoring Layer
- **Resource Monitor**: System health checks and alerting
- **Structured Logger**: Production-grade logging with rotation
- **Performance Dashboard**: Real-time metrics and visualization
- **Health Check System**: Automated system status monitoring

## Package Exports

The SDK provides multiple import paths for different use cases:

```typescript
// Main SDK
import { MainframeSDK, createMainnetSDK } from "@maikers/mainframe-sdk";

// Integration utilities
import {
  AnchorMainframeSDK,
  WalletAdapterMainframeSDK,
  ToolkitMainframeSDK,
} from "@maikers/mainframe-sdk/integrations";

// Specific integrations
import { createAnchorMainframeSDK } from "@maikers/mainframe-sdk/integrations/anchor";
import { createWalletAdapterSDK } from "@maikers/mainframe-sdk/integrations/wallet-adapters";

// Testing utilities
import { createTestSDK, TestFixtures } from "@maikers/mainframe-sdk/testing";
```

## Advanced Integration Examples

### Anchor Framework + Priority Fees

```typescript
import { AnchorProvider } from "@coral-xyz/anchor";
import { createAnchorMainframeSDK } from "@maikers/mainframe-sdk/integrations/anchor";

const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
const sdk = createAnchorMainframeSDK(provider, {
  protocolWallet: "PROTOCOL_KEY",
});

await sdk.initializeWithProvider(provider);

const result = await sdk.createAgentWithPriorityFee(
  nftMint,
  agentConfig,
  5000,
  600000
);
```

### React Hook Pattern

```typescript
import { useMainframeSDK } from "@maikers/mainframe-sdk/integrations/wallet-adapters";

function AgentDashboard() {
  const { sdk, isReady, error } = useMainframeSDK();

  const createAgent = async () => {
    if (!sdk) return;
    const result = await sdk.createAgent(nftMint, agentConfig);
  };

  if (!isReady) return <div>Connecting...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <button onClick={createAgent}>Create Agent</button>;
}
```

### Batch Operations

```typescript
import { ToolkitMainframeSDK } from "@maikers/mainframe-sdk/integrations";

const sdk = new ToolkitMainframeSDK(config);

await sdk.batchAgentOperations([
  { type: "create", nftMint: "NFT1", agentConfig: config1 },
  { type: "create", nftMint: "NFT2", agentConfig: config2 },
  { type: "pause", agentAccount: "AGENT1" },
]);
```

### Versioned Transactions

```typescript
const versionedTx = await sdk.createVersionedTransaction(nftMint, agentConfig, {
  priorityFee: 10000,
  lookupTables: [lookupTablePubkey],
});

const signature = await wallet.sendTransaction(versionedTx, connection);
```



