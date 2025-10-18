# Affiliate Revenue Program

**Earn SOL by integrating Mainframe into your platform or referring users**

## Overview

The Mainframe protocol includes a built-in affiliate system that enables developers and platforms to earn commission on every agent activation. This creates a powerful incentive structure for ecosystem growth while maintaining security and transparency.

## Key Features

- **High Commission Rates**: Earn up to 50% of activation fees
- **Instant Payouts**: Revenue shared on-chain in real-time during transactions
- **No Registration Required**: Completely permissionless - any Solana address can be an affiliate  
- **Zero-Balance Support**: Affiliates can receive payments to unfunded accounts
- **Transparent Tracking**: All earnings tracked on-chain with `AffiliatePaid` events
- **No Caps or Limits**: Unlimited earning potential based on referrals

## Revenue Model

### Fee Structure

| Affiliate Percentage | Basis Points | Fee (0.05 SOL) | Your Share | Protocol Share |
|---------------------|---------------|----------------|------------|----------------|
| **10%** | 1000 | 0.05 SOL | **0.005 SOL** | 0.045 SOL |
| **25%** | 2500 | 0.05 SOL | **0.0125 SOL** | 0.0375 SOL |
| **50%** (max) | 5000 | 0.05 SOL | **0.025 SOL** | 0.025 SOL |

### Revenue Projections

| Scale | Agents/Month | Base Fee Revenue | Commission (25%) | Commission (50%) |
|-------|--------------|------------------|------------------|------------------|
| **Starter** | 50 agents | 2.5 SOL | **0.625 SOL** | **1.25 SOL** |
| **Growth** | 200 agents | 10 SOL | **2.5 SOL** | **5 SOL** |
| **Scale** | 500 agents | 25 SOL | **6.25 SOL** | **12.5 SOL** |
| **Enterprise** | 1,000+ agents | 50+ SOL | **12.5+ SOL** | **25+ SOL** |

*Projections based on 0.05 SOL standard activation fee

### Fee Distribution Flow

```
Total Activation Fee (100%)
├─ Affiliate Commission (0-50%, configurable)
└─ Protocol Distribution (remaining fee)
   ├─ Protocol Treasury (50% of remaining)
   ├─ Validator Treasury (30% of remaining)
   └─ Network Treasury (20% of remaining)
```

## Implementation

### Basic Integration

```typescript
import { createMainnetSDK } from "@maikers/mainframe-sdk";

const sdk = createMainnetSDK();
await sdk.initialize("Phantom");

// Create agent with affiliate revenue sharing
const result = await sdk.createAgent(
  nftMint,
  agentConfig,
  {
    seller: 'YOUR_AFFILIATE_WALLET_ADDRESS',
    affiliateBps: 2500  // 25% commission (2500 basis points)
  }
);

console.log("Agent created with affiliate:", result.agentAccount);
```

### Event Tracking

Monitor your affiliate earnings in real-time:

```typescript
// Listen for affiliate payments
sdk.events.onAffiliatePaid((event) => {
  console.log({
    agent: event.agentAccount,
    affiliate: event.seller,
    amount: event.affiliateAmount,
    commission: `${event.affiliateBps / 100}%`,
    timestamp: new Date(event.timestamp * 1000)
  });
});

// Example output:
// {
//   agent: "8x7k2V...",
//   affiliate: "9y8j3W...", 
//   amount: 12500000,      // 0.0125 SOL in lamports
//   commission: "25%",
//   timestamp: 2025-01-15T10:30:45.123Z
// }
```

### Platform Integration

#### Web Application

```typescript
// Example: NFT marketplace integration
async function createAgentWithReferral(nftMint: string, config: AgentConfig) {
  const affiliateWallet = getUserWalletFromSession(); // Your platform's affiliate system
  const commissionRate = getUserCommissionRate();     // Based on user tier/agreement
  
  try {
    const result = await sdk.createAgent(nftMint, config, {
      seller: affiliateWallet,
      affiliateBps: commissionRate * 100  // Convert percentage to basis points
    });
    
    // Log for analytics
    await logAffiliateTransaction({
      user: getCurrentUser(),
      agent: result.agentAccount,
      commission: commissionRate,
      earnings: result.fee * (commissionRate / 100)
    });
    
    return result;
  } catch (error) {
    console.error("Agent creation with affiliate failed:", error);
    throw error;
  }
}
```

#### URL-Based Referrals

```typescript
// Example: Handle referral links
const urlParams = new URLSearchParams(window.location.search);
const referralCode = urlParams.get('ref');

if (referralCode) {
  const affiliateWallet = await resolveReferralCode(referralCode);
  const commissionRate = await getAffiliateCommission(referralCode);
  
  // Store in session for later use
  sessionStorage.setItem('affiliate', JSON.stringify({
    wallet: affiliateWallet,
    commission: commissionRate
  }));
}

// Later, when creating agent:
const affiliate = JSON.parse(sessionStorage.getItem('affiliate') || '{}');
if (affiliate.wallet) {
  options.seller = affiliate.wallet;
  options.affiliateBps = affiliate.commission;
}
```

## Validation Rules

### Commission Limits
- **Maximum**: 50% (5000 basis points)
- **Minimum**: 0% (affiliate parameter optional)
- **Granularity**: 1 basis point (0.01%)

### Parameter Validation
```typescript
// Valid configurations
{ seller: 'wallet...', affiliateBps: 2500 }  ✅ 25% commission
{ seller: 'wallet...', affiliateBps: 0 }     ✅ 0% commission  
{ seller: 'wallet...', affiliateBps: 5000 }  ✅ 50% commission (max)

// Invalid configurations  
{ seller: undefined, affiliateBps: 2500 }    ❌ Must provide seller when commission > 0
{ seller: 'wallet...', affiliateBps: 5001 }  ❌ Commission exceeds 50% maximum
{ seller: 'wallet...', affiliateBps: -100 }  ❌ Negative commission not allowed
```

## Business Models

### Direct Integration
Perfect for:
- **NFT Marketplaces** - Earn commission on agent creation from your platform
- **Gaming Platforms** - Monetize AI agent features in games
- **DeFi Protocols** - Add AI trading bots with revenue sharing

### Referral Networks
Perfect for:
- **Content Creators** - Share referral links with your community
- **Influencer Marketing** - Track performance with on-chain transparency  
- **Partner Networks** - Build affiliate networks with sub-referrals

### White-Label Solutions
Perfect for:
- **Enterprise Clients** - Custom branded AI agent platforms
- **SaaS Platforms** - Embedded AI agent creation with revenue split
- **API Integrations** - Programmatic agent management with commission tracking

## Analytics & Reporting

### On-Chain Event Tracking

```typescript
class AffiliateAnalytics {
  private earnings: Map<string, number> = new Map();
  
  constructor(sdk: MainframeSDK) {
    // Track all affiliate payments
    sdk.events.onAffiliatePaid((event) => {
      const current = this.earnings.get(event.seller) || 0;
      this.earnings.set(event.seller, current + event.affiliateAmount);
    });
  }
  
  getTotalEarnings(affiliate: string): number {
    return this.earnings.get(affiliate) || 0;
  }
  
  async getDetailedReport(affiliate: string, fromDate?: Date) {
    // Query blockchain for complete affiliate history
    const events = await this.sdk.getAffiliateHistory(affiliate, fromDate);
    
    return {
      totalAgents: events.length,
      totalEarnings: events.reduce((sum, e) => sum + e.affiliateAmount, 0),
      averageCommission: events.reduce((sum, e) => sum + e.affiliateBps, 0) / events.length / 100,
      monthlyBreakdown: this.groupByMonth(events)
    };
  }
}
```

### Performance Metrics

Track key affiliate performance indicators:

- **Conversion Rate**: Visitors → Agent Creations
- **Average Commission**: Effective commission rate across all referrals
- **Revenue per Referral**: Total earnings ÷ successful referrals
- **Retention Rate**: Users who create multiple agents through your referrals

## Partnership Opportunities

### Volume Discounts

Partner with maikers for enhanced revenue opportunities:

| Monthly Volume | User Discount | Your Commission | Partnership Benefits |
|----------------|---------------|-----------------|---------------------|
| **100+ agents** | 25% off fees | Up to 35% | Priority support |
| **500+ agents** | 50% off fees | Up to 40% | Custom integration |
| **1,000+ agents** | 75% off fees | Up to 45% | Revenue guarantees |
| **Enterprise** | Custom pricing | Up to 50% | Dedicated success manager |

### Integration Support

- **Technical Integration** - Dedicated engineering support
- **Marketing Collaboration** - Co-promotion and content creation
- **Custom Solutions** - Tailored SDK features for your use case
- **Revenue Optimization** - Data-driven commission structure optimization

## Getting Started

### 1. Basic Setup
```bash
npm install @maikers/mainframe-sdk
```

### 2. Enable Affiliate Tracking
```typescript
const sdk = createMainnetSDK();
await sdk.initialize("Phantom");

// Set up affiliate tracking for your platform
const affiliateWallet = "YOUR_WALLET_ADDRESS";
const commissionRate = 2500; // 25%
```

### 3. Start Earning
Every agent creation through your integration earns you commission automatically.

### 4. Scale Your Revenue
Contact [enterprise@maikers.com](mailto:enterprise@maikers.com) to discuss:
- Volume pricing and higher commission rates
- Custom integration support
- Marketing partnership opportunities
- Revenue optimization strategies

---

**Questions?** Join our [Discord community](https://discord.gg/maikers) or contact [enterprise@maikers.com](mailto:enterprise@maikers.com)
