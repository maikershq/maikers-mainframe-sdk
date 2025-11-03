# Mainframe SDK: Quick Start Guide

## Introduction

This guide helps you get started with the Mainframe SDK, whether you're building a web application, integrating with existing Solana tools, or creating automated agent management systems.

## Understanding the SDK

### What is Mainframe SDK?

Mainframe SDK is a production-ready TypeScript client that provides:

- **Agent Management**: Create, update, transfer, and monitor AI agents linked to NFTs
- **Client-Side Encryption**: Zero-knowledge architecture with XChaCha20-Poly1305 AEAD
- **Storage Integration**: Permanent Arweave storage for metadata
- **Framework Support**: First-class integration with Anchor, Wallet Adapter, elizaOS, and more
- **Production Features**: Rate limiting, circuit breakers, caching, and monitoring

### SDK Architecture

```
┌──────────────────────────────────────────┐
│        Mainframe SDK Client              │
│                                          │
│  ┌────────────┐  ┌───────────────────┐  │
│  │  Security  │  │    Performance    │  │
│  │   Layer    │  │      Layer        │  │
│  ├────────────┤  ├───────────────────┤  │
│  │Rate Limiter│  │Connection Pool    │  │
│  │Circuit     │  │Multi-Tier Cache   │  │
│  │ Breaker    │  │Batch Processor    │  │
│  │Audit Logger│  │Metrics Collector  │  │
│  └────────────┘  └───────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │       Core Services                │  │
│  ├────────────────────────────────────┤  │
│  │Encryption│Storage│Program│Wallet   │  │
│  │ Service  │Service│Service│Service  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Core Operations

| Operation | Purpose | Fee | Access Required |
|-----------|---------|-----|-----------------|
| `createAgent` | Link NFT to AI agent | 0.05 SOL* | NFT ownership |
| `updateAgent` | Update agent configuration | 0.005 SOL* | Agent ownership |
| `transferAgent` | Transfer agent ownership | 0.01 SOL* | New owner only |
| `pauseAgent` | Pause agent operations | FREE | Agent ownership |
| `resumeAgent` | Resume agent operations | FREE | Agent ownership |
| `closeAgent` | Permanent shutdown | FREE | Agent ownership |

*Fees vary by collection tier (Genesis: free, Partners: 25-75% off)

## Installation

### Package Installation

```bash
# Using pnpm (recommended)
pnpm add @maikers/mainframe-sdk

# Using npm
npm install @maikers/mainframe-sdk

# Using yarn
yarn add @maikers/mainframe-sdk
```

### Peer Dependencies

The SDK requires these peer dependencies:

```json
{
  "@coral-xyz/anchor": "^0.29.0",
  "@solana/web3.js": "^1.87.0",
  "@solana/spl-token": "^0.4.14"
}
```

## Basic Setup

### Standard Initialization

```typescript
import { createMainnetSDK, configureLogger } from "@maikers/mainframe-sdk";

// Configure logging for your environment
configureLogger('production'); // or 'development' for verbose logs

// Initialize SDK
const sdk = createMainnetSDK({
  // Solana network configuration
  solanaNetwork: "mainnet-beta",
  rpcEndpoint: "https://api.mainnet-beta.solana.com",
  // programId defaults to mainnet: mnfm211AwTDA8fGvPezYs3jjxAXgoucHGuTMUbjFssE
  // protocolWallet deprecated - treasury addresses fetched from on-chain config
  
  // Storage configuration (Arweave only - IPFS removed in v1.0.5)
  storage: {
    arweave: {
      gateway: "https://arweave.net",
      bundler: "https://node2.bundlr.network"
    }
  }
});

// Connect wallet
await sdk.initialize("Phantom");
```

### Quick Start Configurations

```typescript
import { QuickStart } from "@maikers/mainframe-sdk";

// Production mainnet (recommended for live applications)
const mainnetSDK = QuickStart.mainnet({
  arweaveWallet: "your-arweave-wallet-jwk",
});

// Development with devnet
const devSDK = QuickStart.development();

// Testing with mocks
const testSDK = QuickStart.testing();
```

## Framework Integrations

### Anchor Framework Integration

```typescript
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { 
  createAnchorMainframeSDK,
  QuickStartIntegrations 
} from "@maikers/mainframe-sdk";

// Method 1: Direct integration
const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

const sdk = createAnchorMainframeSDK(provider, {
  // protocolWallet deprecated - fetched from on-chain config
});

await sdk.initializeWithProvider(provider);

// Method 2: Using QuickStart helper
const sdk2 = QuickStartIntegrations.anchor(provider);

// Create agent with priority fees (Anchor pattern)
const result = await sdk.createAgentWithPriorityFee(
  nftMint,
  agentConfig,
  5000,    // Priority fee rate
  600000   // Compute units
);
```

### Wallet Adapter Integration

```typescript
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { 
  createWalletAdapterSDK,
  useMainframeSDK 
} from "@maikers/mainframe-sdk";

// Method 1: Direct integration
function AgentManager() {
  const { wallet } = useWallet();
  const { connection } = useConnection();
  
  const sdk = createWalletAdapterSDK(
    wallet?.adapter,
    connection,
    {
      // programId defaults to mainnet, protocolWallet deprecated
    }
  );
  
  // Use SDK...
}

// Method 2: Using React Hook
function AgentDashboard() {
  const { sdk, isReady, error } = useMainframeSDK();
  
  if (!isReady) return <div>Connecting wallet...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const createAgent = async () => {
    const result = await sdk.createAgent(nftMint, agentConfig);
    console.log("Agent created:", result.agentAccount);
  };
  
  return <button onClick={createAgent}>Create Agent</button>;
}
```

### Auto-Detection Integration

```typescript
import { QuickStartIntegrations } from "@maikers/mainframe-sdk";

// Automatically detect and use available integration
const sdk = QuickStartIntegrations.auto({
  config: {
    // programId defaults to mainnet
    // protocolWallet deprecated - fetched from blockchain
  },
  
  // Provide what you have available
  anchor: { provider: anchorProvider },           // If using Anchor
  walletAdapter: { adapter, connection },         // If using wallet-adapter
  connection: connection,                          // Direct connection
  wallet: wallet                                   // Direct wallet
});

await sdk.initialize();
```

## Creating Your First Agent

### Step 1: Define Agent Configuration

```typescript
import { AgentConfig } from "@maikers/mainframe-sdk";

const agentConfig: AgentConfig = {
  // Basic information
  name: "DeFi Trading Assistant",
  description: "Automated trading bot for Solana DeFi protocols",
  purpose: "Execute optimized trading strategies while managing risk",
  
  // AI personality configuration
  personality: {
    traits: ["analytical", "risk-aware", "efficient", "data-driven"],
    style: "professional",
    customPrompt: `You are a professional DeFi trading assistant focused on 
                   risk management and optimal execution strategies.`
  },
  
  // Agent capabilities
  capabilities: [
    {
      type: "defi",
      plugins: ["jupiter-swap", "orca-pools", "raydium-swap"],
      config: {
        maxSlippage: 0.5,
        minLiquidity: 10000,
        priorityFee: 5000
      }
    },
    {
      type: "analytics",
      plugins: ["token-metrics", "market-analysis"],
      config: {
        updateInterval: 60000,
        historicalDataDays: 30
      }
    }
  ],
  
  // Framework and plugins
  framework: "elizaOS",
  plugins: [
    {
      id: "jupiter-swap",
      version: "1.0.0",
      enabled: true,
      config: {
        apiKey: "your-jupiter-api-key" // Encrypted client-side
      },
      permissions: ["trade", "quote"]
    }
  ],
  
  // Runtime configuration
  runtime: {
    memory: {
      type: "redis",
      ttl: 3600,
      maxSize: "100MB"
    },
    scheduling: {
      enabled: true,
      interval: 60000,
      cronExpression: "*/5 * * * *"
    },
    monitoring: {
      enabled: true,
      alerts: true,
      healthCheckInterval: 30000
    }
  },
  
  // Security and permissions
  permissions: {
    maxTradeSize: "1000 USDC",
    allowedTokens: ["SOL", "USDC", "USDT", "RAY", "ORCA"],
    tradingHours: {
      start: "09:00",
      end: "17:00",
      timezone: "UTC"
    },
    requireConfirmation: true
  },
  
  // User preferences
  preferences: {
    notifications: true,
    notificationChannels: ["discord", "telegram"],
    riskLevel: "medium",
    autoRebalance: true,
    rebalanceThreshold: 0.05
  }
};
```

### Step 2: Create Agent

```typescript
try {
  // Ensure wallet is connected
  if (!sdk.wallet.isConnected()) {
    await sdk.initialize("Phantom");
  }
  
  // Verify NFT ownership
  const nftMint = "YOUR_VERIFIED_NFT_MINT_ADDRESS";
  const isOwned = await sdk.wallet.ownsNFT(nftMint);
  
  if (!isOwned) {
    throw new Error("You must own this NFT to create an agent");
  }
  
  // Create agent
  console.log("Creating agent...");
  const result = await sdk.createAgent(nftMint, agentConfig);
  
  console.log("✅ Agent created successfully!");
  console.log("Agent Account:", result.agentAccount);
  console.log("Transaction:", result.signature);
  console.log("Metadata URI:", result.metadataUri);
  
  // Wait for deployment event
  sdk.events.onAgentDeployed(result.agentAccount, (event) => {
    console.log("✅ Agent deployed and operational!");
    console.log("Runtime ID:", event.runtimeId);
    console.log("Status:", event.status);
  });
  
} catch (error) {
  console.error("❌ Agent creation failed:", error.message);
  
  // Handle specific errors
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    console.log("Rate limit exceeded. Please wait before retrying.");
  } else if (error.code === 'INSUFFICIENT_BALANCE') {
    console.log("Insufficient SOL balance for transaction fees.");
  } else if (error.code === 'NFT_NOT_VERIFIED') {
    console.log("NFT must be from a verified collection.");
  }
}
```

### Step 3: Monitor Agent Status

```typescript
// Get agent information
const agentData = await sdk.getAgentAccount(result.agentAccount);
console.log("Agent Status:", agentData.status);
console.log("Owner:", agentData.owner.toString());
console.log("Created:", new Date(agentData.activatedAt * 1000));

// Get decrypted configuration
const config = await sdk.getAgentConfiguration(result.agentAccount);
console.log("Agent Configuration:", config);

// Monitor real-time events
sdk.events.onAgentUpdated((event) => {
  if (event.agentAccount === result.agentAccount) {
    console.log("Agent configuration updated");
  }
});

sdk.events.onAgentError(result.agentAccount, (error) => {
  console.error("Agent error:", error);
  // Implement error handling logic
});
```

## Managing Agents

### Update Agent Configuration

```typescript
// Update specific configuration fields
await sdk.updateAgent(agentAccount, {
  name: "Updated Trading Bot v2",
  permissions: {
    maxTradeSize: "2000 USDC",
    allowedTokens: ["SOL", "USDC", "USDT", "RAY", "ORCA", "MNGO"]
  },
  runtime: {
    monitoring: {
      enabled: true,
      alerts: true,
      healthCheckInterval: 15000 // More frequent checks
    }
  }
});

console.log("✅ Agent configuration updated");
```

### Transfer Agent Ownership

```typescript
const newOwner = new PublicKey("NEW_OWNER_WALLET_ADDRESS");

// One-sided operation: only new NFT owner signs and pays (0.01 SOL)
// The connected wallet must own the NFT to successfully claim the agent
// Previous owner signature NOT required
await sdk.transferAgent(agentAccount, newOwner);

console.log("✅ Agent ownership transferred to:", newOwner.toString());
```

### Pause and Resume Operations

```typescript
// Pause agent temporarily (e.g., for maintenance)
await sdk.pauseAgent(agentAccount);
console.log("✅ Agent paused");

// Resume operations
await sdk.resumeAgent(agentAccount);
console.log("✅ Agent resumed");
```

### Close Agent Permanently

```typescript
// Warning: This operation is irreversible!
const confirmation = confirm(
  "Are you sure you want to permanently close this agent? This cannot be undone."
);

if (confirmation) {
  await sdk.closeAgent(agentAccount);
  console.log("✅ Agent closed permanently");
}
```

## Event Monitoring

### On-Chain Events

```typescript
// Monitor all agent creation events
sdk.events.onAgentCreated((event) => {
  console.log("New agent created:");
  console.log("  Account:", event.agentAccount);
  console.log("  NFT Mint:", event.nftMint);
  console.log("  Owner:", event.owner);
  console.log("  Timestamp:", new Date(event.timestamp * 1000));
});

// Monitor agent updates
sdk.events.onAgentUpdated((event) => {
  console.log("Agent updated:");
  console.log("  Account:", event.agentAccount);
  console.log("  New Version:", event.newVersion);
  console.log("  Metadata URI:", event.metadataUri);
});

// Monitor ownership transfers
sdk.events.onAgentTransferred((event) => {
  console.log("Agent transferred:");
  console.log("  From:", event.oldOwner);
  console.log("  To:", event.newOwner);
});
```

### Off-Chain Events

```typescript
// Monitor agent deployment (from mainframe-node)
sdk.events.onAgentDeployed(agentAccount, (event) => {
  console.log("Agent deployed successfully!");
  console.log("Runtime:", event.runtimeId);
  console.log("Plugins loaded:", event.pluginsLoaded);
});

// Monitor agent execution events
sdk.events.onAgentAction(agentAccount, (event) => {
  console.log("Agent action:", event.action);
  console.log("Result:", event.result);
  console.log("Duration:", event.duration);
});

// Monitor agent errors
sdk.events.onAgentError(agentAccount, (error) => {
  console.error("Agent error:", {
    type: error.type,
    message: error.message,
    timestamp: error.timestamp,
    context: error.context
  });
  
  // Implement error recovery logic
  if (error.recoverable) {
    console.log("Attempting automatic recovery...");
  }
});
```

## Error Handling

### Comprehensive Error Handling

```typescript
import { ErrorUtils, ErrorCodes } from "@maikers/mainframe-sdk";

try {
  const result = await sdk.createAgent(nftMint, agentConfig);
} catch (error) {
  // Check if error is recoverable
  if (ErrorUtils.isRecoverable(error)) {
    console.log("Temporary error - implementing retry logic");
    await retryOperation();
  }
  
  // Check if user action is required
  else if (ErrorUtils.requiresUserAction(error)) {
    const userMessage = ErrorUtils.getUserMessage(error);
    console.log("User action required:", userMessage);
    displayUserNotification(userMessage);
  }
  
  // Handle specific error codes
  else {
    switch (error.code) {
      case ErrorCodes.RATE_LIMIT_EXCEEDED:
        console.log("Rate limit exceeded. Retry after:", error.retryAfter);
        break;
        
      case ErrorCodes.INSUFFICIENT_BALANCE:
        console.log("Insufficient balance. Required:", error.required);
        break;
        
      case ErrorCodes.NFT_NOT_VERIFIED:
        console.log("NFT must be from a verified collection");
        break;
        
      case ErrorCodes.WALLET_NOT_CONNECTED:
        console.log("Please connect your wallet first");
        await sdk.initialize("Phantom");
        break;
        
      default:
        console.error("Unexpected error:", error.message);
        console.error("Error context:", error.context);
    }
  }
}
```

## Next Steps

### For Application Developers
1. Review the [Integration Guide](integration.md) for framework-specific patterns
2. Implement comprehensive error handling and retry logic
3. Set up event monitoring for real-time agent status updates
4. Test thoroughly on devnet before mainnet deployment

### For Production Deployment
1. Review the [Deployment Guide](DEPLOYMENT.md) for production checklist
2. Configure proper monitoring and alerting
3. Implement security best practices from the [Security Guide](SECURITY.md)
4. Set up performance monitoring using the [Performance Guide](PERFORMANCE.md)

### For Advanced Usage
1. Study the [Architecture Guide](ARCHITECTURE.md) for deep technical understanding
2. Explore batch operations and optimization strategies
3. Implement custom monitoring and analytics dashboards
4. Review the [API Reference](API.md) for complete SDK capabilities

This quick start guide provides the foundation for working with the Mainframe SDK. For detailed technical specifications and advanced features, refer to the complete documentation.


