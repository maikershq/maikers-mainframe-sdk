# Mainframe SDK Examples

This directory contains comprehensive examples showing how to integrate the Mainframe SDK with popular Solana development tools.

## 📁 Example Files

### Basic Usage
- **`basic-usage.ts`** - Fundamental SDK usage patterns
- Shows agent creation, management, and event monitoring
- Includes both mainnet and development examples

### Framework Integrations
- **`anchor-integration.ts`** - Integration with @coral-xyz/anchor
- **`wallet-adapter-react.tsx`** - React hooks and components
- **`toolkit-integration.ts`** - General toolkit compatibility (Anza, Gill, etc.)

## 🚀 Quick Start by Framework

### Using with Anchor Framework

```bash
npm install @coral-xyz/anchor @maikers/mainframe-sdk
```

```typescript
import { AnchorProvider } from '@coral-xyz/anchor';
import { QuickStartIntegrations } from '@maikers/mainframe-sdk';

const sdk = QuickStartIntegrations.anchor(provider, {
  protocolWallet: 'YOUR_PROTOCOL_WALLET'
});

const result = await sdk.createAgent(nftMint, agentConfig);
```

### Using with Wallet Adapter (React)

```bash
npm install @solana/wallet-adapter-react @maikers/mainframe-sdk
```

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useMainframeSDK } from '@maikers/mainframe-sdk/integrations/wallet-adapters';

function MyComponent() {
  const { sdk, isReady } = useMainframeSDK();
  
  const createAgent = async () => {
    if (!sdk) return;
    await sdk.createAgent(nftMint, agentConfig);
  };
}
```

### Using with Anza Kit / Gill SDK

```bash
npm install anza-xyz/kit @maikers/mainframe-sdk  # or gillsdk/gill
```

```typescript
import { QuickStartIntegrations } from '@maikers/mainframe-sdk';

const sdk = QuickStartIntegrations.toolkit(connection, wallet, {
  programId: 'YOUR_PROGRAM_ID'
});

// Advanced features
await sdk.createAgentWithPriorityFee(nftMint, config, 5000);
await sdk.batchAgentOperations([/* operations */]);
```

## 🏗️ Integration Patterns

### 1. Drop-in Replacement
Replace existing agent management code:
```typescript
// Before (manual approach)
const ix = await program.methods.createAgent(nftMint, metadataUri)
  .accounts({ /* manual account setup */ })
  .instruction();

// After (with SDK)
const result = await sdk.createAgent(nftMint, agentConfig);
```

### 2. Enhanced Functionality
Add SDK features to existing programs:
```typescript
// Your existing Anchor program
const myProgram = new Program(idl, programId, provider);

// SDK with your program
const sdk = QuickStartIntegrations.anchor.withProgram(myProgram, config);

// Now get SDK benefits: encryption, storage, events, etc.
const encrypted = await sdk.encryption.encryptAgentConfig(config, userWallet, nftMint);
```

### 3. Modular Usage
Use only specific SDK services:
```typescript
import { EncryptionService, StorageService } from '@maikers/mainframe-sdk';

// Use just encryption in your existing app
const encryption = new EncryptionService(config);
const encrypted = await encryption.encryptAgentConfig(config, wallet, nft);

// Use just storage
const storage = new StorageService(config);
const result = await storage.uploadMetadata(encrypted);
```

## 🧪 Running Examples

### Node.js Examples
```bash
# Basic usage
npx tsx examples/basic-usage.ts

# Anchor integration  
npx tsx examples/anchor-integration.ts

# Toolkit integration
npx tsx examples/toolkit-integration.ts
```

### React Examples
The React examples are components that can be integrated into your existing React app:

1. Copy the component code
2. Install peer dependencies: `@solana/wallet-adapter-react`
3. Use within your wallet adapter provider

### Environment Variables
Create `.env` file for examples:
```bash
# Required
PROGRAM_ID=MFRMEqXBHSWppwJCmqXqb7oPH9eMqPPUa7Jqi6r8D1v3
PROTOCOL_WALLET=PROTOCOL_WALLET_PUBKEY_HERE
NFT_MINT_ADDRESS=YOUR_NFT_MINT_ADDRESS

# Optional
PINATA_JWT=your_pinata_jwt_token
JUPITER_API_KEY=your_jupiter_api_key
```

## 📚 Best Practices

### 1. Error Handling
```typescript
try {
  const result = await sdk.createAgent(nftMint, agentConfig);
  console.log('✅ Success:', result);
} catch (error) {
  if (MainframeSDKError.isMainframeError(error)) {
    console.error('SDK Error:', ErrorUtils.getUserMessage(error));
  } else {
    console.error('Unknown error:', error);
  }
}
```

### 2. Event Monitoring
```typescript
// Set up event listeners for real-time updates
const subscription = sdk.events.onAgentDeployed(agentAccount, (event) => {
  console.log('🚀 Agent deployed:', event);
});

// Clean up subscriptions
subscription.unsubscribe();
```

### 3. Configuration Validation
```typescript
const validation = sdk.validateAgentConfig(agentConfig);
if (!validation.valid) {
  console.error('Invalid config:', validation.errors);
  return;
}

await sdk.createAgent(nftMint, agentConfig);
```

### 4. Development vs Production
```typescript
// Development with mocks
const devSDK = QuickStart.testing();

// Production with real services
const prodSDK = QuickStart.mainnet({ 
  ipfsApiKey: process.env.PINATA_JWT 
});
```

## 💡 Tips

- Use TypeScript for full type safety and autocompletion
- Enable development logging with `logLevel: 'debug'`
- Test with mock services before mainnet deployment
- Monitor events for real-time agent status updates
- Validate configurations client-side before transactions

## 🤝 Community Examples

Have a great integration example? Submit a PR to add it to this collection!

### Template for New Examples
```typescript
/**
 * Example: Integration with [YOUR_PACKAGE]
 */

import { /* imports */ } from 'your-package';
import { QuickStartIntegrations } from '@maikers/mainframe-sdk';

async function yourIntegrationExample() {
  console.log('🔧 [YOUR_PACKAGE] Integration Example');
  
  try {
    const sdk = QuickStartIntegrations.auto({
      config: { /* your config */ },
      // Add your package's context here
    });
    
    // Your integration code here
    
  } catch (error) {
    console.error('❌ Integration error:', error);
  }
}

if (require.main === module) {
  yourIntegrationExample().catch(console.error);
}
```
