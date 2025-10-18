# 🔗 Integration Guide

This guide shows how to integrate the Mainframe SDK with popular Solana development packages.

## 📦 Supported Packages

### ✅ **@coral-xyz/anchor** - Full Support
- Native Anchor Provider integration
- Direct program method access  
- Custom instruction building
- Account fetching and decoding

### ✅ **@solana/wallet-adapter-react** - Full Support
- React hooks integration
- Wallet context compatibility
- Event-driven connection management
- TypeScript-first components

### ✅ **anza-xyz/kit & gillsdk/gill** - Toolkit Support
- Connection and wallet integration
- Priority fee management
- Batch transaction support
- Versioned transaction compatibility

## 🚀 Quick Integration Examples

### 1. Anchor Framework

```typescript
import { AnchorProvider } from '@coral-xyz/anchor';
import { QuickStartIntegrations } from '@maikers/mainframe-sdk';

// Use your existing Anchor setup
const sdk = QuickStartIntegrations.anchor(anchorProvider, {
  programId: 'YOUR_PROGRAM_ID',
  protocolWallet: 'PROTOCOL_WALLET'
});

await sdk.initializeWithProvider(anchorProvider);
const result = await sdk.createAgent(nftMint, agentConfig);
```

### 2. Wallet Adapter (React)

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useMainframeSDK } from '@maikers/mainframe-sdk/integrations/wallet-adapters';

function MyComponent() {
  const { sdk, isReady, error } = useMainframeSDK();
  
  const createAgent = async () => {
    if (!sdk || !isReady) return;
    await sdk.createAgent(nftMint, agentConfig);
  };

  return (
    <button onClick={createAgent} disabled={!isReady}>
      Create Agent
    </button>
  );
}
```

### 3. Anza Kit / Gill SDK

```typescript
import { QuickStartIntegrations } from '@maikers/mainframe-sdk';

// Works with any toolkit providing connection + wallet
const sdk = QuickStartIntegrations.toolkit(connection, wallet, {
  programId: 'YOUR_PROGRAM_ID',
  protocolWallet: 'PROTOCOL_WALLET'
});

// Advanced toolkit features
await sdk.createAgentWithPriorityFee(nftMint, config, 5000, 600000);
await sdk.batchAgentOperations([
  { type: 'create', nftMint: 'NFT1', agentConfig: config1 },
  { type: 'pause', agentAccount: 'AGENT1' }
]);
```

### 4. Auto-Detection

```typescript
import { QuickStartIntegrations } from '@maikers/mainframe-sdk';

// Automatically detect and use the best integration
const sdk = QuickStartIntegrations.auto({
  config: { programId: 'YOUR_PROGRAM_ID' },
  anchor: { provider }, // If available
  walletAdapter: { adapter, connection }, // If available
  connection, // Fallback
  wallet // Fallback
});
```

## 📚 Import Patterns

### Modular Imports (Recommended)
```typescript
// Core SDK
import { MainframeSDK, createMainnetSDK } from '@maikers/mainframe-sdk';

// Specific integrations
import { createAnchorMainframeSDK } from '@maikers/mainframe-sdk/integrations/anchor';
import { useMainframeSDK } from '@maikers/mainframe-sdk/integrations/wallet-adapters';
import { createToolkitSDK } from '@maikers/mainframe-sdk/integrations';

// Testing utilities
import { createTestSDK, TestFixtures } from '@maikers/mainframe-sdk/testing';
```

### All-in-One Import
```typescript
import { 
  MainframeSDK,
  AnchorMainframeSDK, 
  WalletAdapterMainframeSDK,
  ToolkitMainframeSDK,
  QuickStartIntegrations
} from '@maikers/mainframe-sdk';
```

## 🛠️ Advanced Integration Patterns

### Combined with Existing Programs
```typescript
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { QuickStartIntegrations } from '@maikers/mainframe-sdk';

// Your existing program
const myProgram = new Program(idl, programId, provider);

// Add Mainframe capabilities
const sdk = QuickStartIntegrations.anchor.withProgram(myProgram, {
  protocolWallet: 'PROTOCOL_WALLET'
});

// Now you have both your program AND agent management
const result = await myProgram.methods.myMethod().rpc();
const agent = await sdk.createAgent(nftMint, agentConfig);
```

### Custom Transaction Building
```typescript
import { TransactionBuilderUtils } from '@maikers/mainframe-sdk/integrations';

const optimizedTx = await TransactionBuilderUtils.createOptimizedTransaction(
  connection,
  wallet.publicKey,
  instructions,
  {
    priorityFeeRate: 10000,
    computeUnits: 800000
  }
);
```

### Event Integration
```typescript
// Monitor agents alongside your existing event system
sdk.events.onAgentDeployed(agentAccount, (event) => {
  // Your existing event handler
  handleAgentDeployed(event);
  
  // Integrate with your app state
  updateUI({ agentStatus: 'deployed' });
});
```

## 🎯 Best Practices

### 1. Toolkit-Specific Optimizations
```typescript
// Anchor: Use program methods directly
const instruction = await sdk.buildAnchorInstruction('createAgent', accounts, args);

// Toolkit: Use batch operations for efficiency  
await sdk.batchAgentOperations(operations);

// Wallet Adapter: Use React hooks for state management
const { sdk, isReady } = useMainframeSDK();
```

### 2. Error Handling
```typescript
try {
  const result = await sdk.createAgent(nftMint, agentConfig);
} catch (error) {
  if (MainframeSDKError.isMainframeError(error)) {
    // Handle SDK-specific errors
    console.error('SDK Error:', ErrorUtils.getUserMessage(error));
  } else {
    // Handle toolkit-specific errors
    console.error('Toolkit Error:', error);
  }
}
```

### 3. Development vs Production
```typescript
// Development: Use appropriate network and logging
const devSDK = QuickStartIntegrations.anchor(provider, {
  solanaNetwork: 'devnet',
  development: { 
    logLevel: 'debug',
    skipFees: true 
  }
});

// Production: Full configuration
const prodSDK = QuickStartIntegrations.anchor(provider, {
  solanaNetwork: 'mainnet-beta',
  storage: {
    primary: 'arweave',
    ipfs: { apiKey: process.env.PINATA_JWT }
  }
});
```

⚠️ **STORAGE PROVIDER WARNING**

**Critical**: Arweave is the default and recommended primary storage provider for production. Changing storage providers after agent creation may cause agents to halt if metadata becomes unavailable at the original URI. Only modify storage configuration if you understand the implications for agent availability.

## 💡 Migration Tips

### From Raw Anchor Code
```typescript
// Before: Raw Anchor
const ix = await program.methods.createAgent(nft, uri)
  .accounts({ /* manual setup */ })
  .instruction();

// After: With SDK
const result = await sdk.createAgent(nft, config);
// ✅ Handles encryption, storage, fees automatically
```

### From Wallet Adapter Code
```typescript
// Before: Manual wallet management
const { wallet, connected } = useWallet();
if (!connected) throw new Error('Not connected');

// After: SDK hook
const { sdk, isReady } = useMainframeSDK();
if (!isReady) return <Loading />;
```

### From Custom Solutions
```typescript
// Before: Custom encryption + storage
const encrypted = await encryptData(config);
const uri = await uploadToIPFS(encrypted);
const tx = await buildTransaction(uri);

// After: SDK handles everything
const result = await sdk.createAgent(nftMint, config);
```

This integration system ensures the Mainframe SDK works seamlessly with your existing Solana development stack! 🚀
