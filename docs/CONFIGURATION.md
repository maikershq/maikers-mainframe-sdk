# Configuration

## Production Configuration

Setup with comprehensive monitoring, security, and performance optimization:

```typescript
import { 
  MainframeConfig, 
  configureLogger,
  SecurityConfig,
  LogLevel 
} from "@maikers/mainframe-sdk";

// Configure production logging
configureLogger('production');

// Configure security settings
SecurityConfig.updateConfig({
  rateLimiting: {
    enabled: true,
    maxRequests: 1000,
    windowMs: 60000
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    recoveryTimeoutMs: 60000
  },
  audit: {
    enabled: true,
    logSensitiveOperations: false
  }
});

const productionConfig: MainframeConfig = {
  // Solana network
  solanaNetwork: "mainnet-beta",
  rpcEndpoint: "https://api.mainnet-beta.solana.com",
  programId: "mnfm211AwTDA8fGvPezYs3jjxAXgoucHGuTMUbjFssE",

  // Protocol
  protocolWallet: "PROTOCOL_WALLET_PUBKEY_HERE",

  // Storage providers (Production optimized)
  storage: {
    primary: "arweave",
    fallback: ["ipfs"],
    arweave: {
      gateway: "https://arweave.net",
      bundler: "https://node2.bundlr.network",
    },
    ipfs: {
      gateway: "https://ipfs.io/ipfs/",
      api: "https://api.pinata.cloud",
      apiKey: process.env.PINATA_JWT,
    },
  },

  // Production options
  development: {
    mockWallet: false,
    mockStorage: false,
    logLevel: "info",
    skipFees: false,
  },
};
```

## Development Configuration

```typescript
// Development setup with debug features
configureLogger('development');

const devConfig: MainframeConfig = {
  solanaNetwork: "devnet",
  rpcEndpoint: "https://api.devnet.solana.com",
  programId: "DEV_PROGRAM_ID_HERE",
  protocolWallet: "DEV_PROTOCOL_WALLET_HERE",
  
  storage: {
    primary: "arweave",
    fallback: ["ipfs"]
  },
  
  development: {
    mockWallet: false,
    mockStorage: false,
    logLevel: "debug",
    skipFees: true,
  },
};
```

**Storage Provider Warning**: Use Arweave as primary storage for production. Changing storage providers after agent creation may cause agent execution to halt if metadata URIs become unavailable.

## Agent Configuration

The `AgentConfig` interface defines all aspects of your AI agent:

```typescript
interface AgentConfig {
  // Basic info
  name: string;
  description: string;
  purpose: string;

  // AI personality
  personality: {
    traits: string[];
    style: "professional" | "casual" | "technical" | "friendly" | "custom";
    customPrompt?: string;
  };

  // Capabilities and plugins
  capabilities: AgentCapability[];
  plugins: PluginConfig[];

  // Technical config
  framework: "elizaOS";
  runtime: RuntimeConfig;

  // Security
  permissions: PermissionSet;
  apiKeys?: Record<string, string>; // Encrypted client-side

  // User preferences
  preferences: UserPreferences;
}
```

## Quick Setup Options

```typescript
import { QuickStart } from "@maikers/mainframe-sdk";

// Production mainnet with full monitoring
const mainnetSDK = QuickStart.mainnet({
  arweaveWallet: "your-arweave-wallet",
});

// Development with devnet
const devSDK = QuickStart.development();

// Testing with mocks
const testSDK = QuickStart.testing();
```



