# Mainframe SDK

**TypeScript SDK for Mainframe protocol - Powering the agentic economy**

[![npm version](https://img.shields.io/npm/v/@maikers/mainframe-sdk.svg)](https://www.npmjs.com/package/@maikers/mainframe-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@maikers/mainframe-sdk.svg)](https://www.npmjs.com/package/@maikers/mainframe-sdk)
[![GitHub Stars](https://img.shields.io/github/stars/MaikersHQ/maikers-mainframe-sdk.svg)](https://github.com/MaikersHQ/maikers-mainframe-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](https://github.com/MaikersHQ/maikers-mainframe-sdk)
[![Code Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](https://github.com/MaikersHQ/maikers-mainframe-sdk/tree/main/coverage)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@maikers/mainframe-sdk)](https://bundlephobia.com/package/@maikers/mainframe-sdk)
[![Discord](https://img.shields.io/badge/discord-join-7289da.svg?logo=discord)](https://discord.gg/maikers)
[![Twitter Follow](https://img.shields.io/twitter/follow/TheMaikers?style=social)](https://twitter.com/TheMaikers)


**Mainframe SDK** powers the agentic economy by transforming any verified Solana NFT collection into intelligent AI agents. Create Agent-NFTs that participate in autonomous economic activities with zero-knowledge security, 10K+ operations/minute performance, and built-in revenue sharing.

## What is Mainframe SDK?

The Mainframe SDK enables developers to create AI agents from verified NFT collections on Solana. Unlike other solutions that require custom integrations, Mainframe leverages Solana's native `Collection.verified = true` requirement - creating a permissionless yet secure system where any verified collection can participate in the agentic economy.

Perfect for DeFi trading bots, NFT collection management, gaming agents, social media automation, and any application requiring intelligent blockchain interactions.

## Features

- **🔒 Zero-Knowledge Security** - Client-side XChaCha20 encryption, protocol never sees private data
- **⚡ Production Performance** - 10K+ ops/min throughput, <100ms cached responses  
- **💰 Revenue Sharing** - Built-in affiliate program with up to 50% commission
- **🛠️ Developer Experience** - TypeScript-first with comprehensive tooling and testing
- **🔌 Framework Ready** - Anchor, Wallet Adapter, and React integrations included

## Installation

```bash
npm install @maikers/mainframe-sdk
```

## Quick Start

```typescript
import { createMainnetSDK } from "@maikers/mainframe-sdk";

// Initialize SDK
const sdk = createMainnetSDK({ 
  storage: { primary: 'arweave' } 
});
await sdk.initialize("Phantom");

// Create AI agent from verified NFT
const result = await sdk.createAgent(nftMint, {
  name: "Trading Assistant",
  description: "DeFi trading bot", 
  framework: "elizaOS",
  capabilities: [{ type: "defi", plugins: ["jupiter-swap"] }]
});
```

**[Complete Examples →](examples/)** | **[Full Documentation →](docs/)**

## Revenue Sharing

Earn **up to 50% commission** on every agent activation:

```typescript
// Create agent with affiliate revenue
const result = await sdk.createAgent(nftMint, agentConfig, {
  seller: 'YOUR_WALLET_ADDRESS',
  affiliateBps: 2500  // 25% commission
});

// Track earnings
sdk.events.onAffiliatePaid((event) => {
  console.log(`Earned: ${event.affiliateAmount} lamports`);
});
```

| Monthly Referrals | Revenue (25%) | Revenue (50%) |
|------------------|---------------|---------------|
| 100 agents | **1.25 SOL** | **2.5 SOL** |
| 1,000 agents | **12.5 SOL** | **25 SOL** |

**[Affiliate Program Details →](docs/affiliate-program.md)**

## Framework Integration

**React/Next.js**
```typescript
import { QuickStartIntegrations } from "@maikers/mainframe-sdk";
const sdk = QuickStartIntegrations.walletAdapter(wallet.adapter, connection);
```

**Anchor**
```typescript
import { QuickStartIntegrations } from "@maikers/mainframe-sdk";  
const sdk = QuickStartIntegrations.anchor(provider);
```

**[Integration Examples →](docs/integration.md)** | **[API Reference →](docs/api.md)**

## Documentation

| Guide | Description |
|-------|-------------|
| **[Quick Start](docs/quickstart.md)** | Get up and running in minutes |
| **[API Reference](docs/api.md)** | Complete method documentation |
| **[Security Model](docs/security.md)** | Architecture and best practices |
| **[Integration Examples](docs/integration.md)** | Framework-specific patterns |
| **[Performance Guide](docs/performance.md)** | Optimization strategies |
| **[Release Management](docs/releases.md)** | Versioning and publishing guide |
| **[Troubleshooting](docs/troubleshooting.md)** | Common issues and solutions |

## Development

```bash
git clone https://github.com/MaikersHQ/maikers-mainframe-sdk
cd maikers-mainframe-sdk
pnpm install && pnpm run build
```

**[Contributing Guide →](docs/contributing.md)** | **[Development Setup →](docs/development.md)** | **[Release Process →](docs/releases.md)**

## Resources

- **[NPM Package](https://www.npmjs.com/package/@maikers/mainframe-sdk)** - Official package
- **[Documentation Hub](https://docs.maikers.com)** - Complete docs
- **[Discord Community](https://discord.gg/maikers)** - Get support
- **[GitHub Issues](https://github.com/MaikersHQ/maikers-mainframe-sdk/issues)** - Report bugs
- **[Enterprise Support](mailto:enterprise@maikers.com)** - Business inquiries

## License

Apache 2.0 - see [LICENSE](LICENSE)

---
*Built by [maikers - creators of realities](https://maikers.com)*
