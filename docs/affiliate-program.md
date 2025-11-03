# Affiliate Revenue Program

**Earn up to 50% commission on every agent activation—completely permissionless**

## Overview

The Mainframe protocol includes a **tier-based affiliate system** that automatically rewards anyone who drives agent activations. No registration required—just provide your wallet address and start earning instantly. Your commission rate increases automatically as you make more sales.

## Key Features

- ✅ **Permissionless Participation** - No pre-registration required, just provide wallet address
- ✅ **Auto-Initialize** - First commission automatically creates your affiliate account
- ✅ **Tier-Based Commission** - Earn 15-50% based on lifetime sales performance
- ✅ **Streak Bonuses** - Up to +15% for consistent sales activity
- ✅ **Milestone Rewards** - Bonuses from 0.1 SOL to 1000 SOL
- ✅ **Multi-Level Referrals** - Earn from your referrals' sales (10% L1, 5% L2)
- ✅ **Instant Payouts** - Commission paid on-chain in real-time
- ✅ **Competition Seasons** - Win from prize pools
- ✅ **Achievement NFTs** - Earn badges for milestones

## Tier Structure

### Commission Rates

| Tier | Sales Threshold | Base Commission | + Streak Bonus | Monthly (100 sales) | Monthly (500 sales) |
|------|----------------|-----------------|----------------|---------------------|---------------------|
| 🥉 Bronze | 0-99 | **15%** | up to +15% | 0.75 SOL | 3.75 SOL |
| 🥈 Silver | 100-499 | **20%** | up to +15% | 1 SOL | 5 SOL |
| 🥇 Gold | 500-1,999 | **30%** | up to +15% | 1.5 SOL | 7.5 SOL |
| 💎 Platinum | 2,000-9,999 | **40%** | up to +15% | 2 SOL | 10 SOL |
| 💎💎 Diamond | 10,000+ | **50%** | up to +15% | 2.5 SOL | 12.5 SOL |

*Based on 0.05 SOL standard activation fee

### Tier Progression Rules

- **No Demotion**: Tiers are permanent once achieved
- **Cumulative Sales**: Total lifetime sales never decrease
- **Linear Progression**: Must pass through each tier sequentially
- **Automatic Upgrade**: Tiers update automatically as sales accumulate
- **All Sales Equal**: Each agent activation counts as 1 sale

## Milestone Bonuses

Earn one-time bonus rewards when reaching sales milestones:

| Sales Milestone | Bonus Reward | Cumulative Total |
|-----------------|--------------|------------------|
| 10 sales | 0.1 SOL | 0.1 SOL |
| 50 sales | 1 SOL | 1.1 SOL |
| 100 sales | 5 SOL | 6.1 SOL |
| 500 sales | 50 SOL | 56.1 SOL |
| 1,000 sales | 150 SOL | 206.1 SOL |
| 5,000 sales | 1,000 SOL | 1,206.1 SOL |

## Multi-Level Referrals

Build passive income by referring other affiliates:

- **Level 1 (Direct Referrals)**: Earn 10% of your referrals' commissions
- **Level 2 (Second-Level)**: Earn 5% of second-level referrals' commissions

**Example**: If your referral (Level 1) earns 0.75 SOL commission, you automatically earn 0.075 SOL (10%).

## Implementation

### Basic Integration

```typescript
import { createMainnetSDK } from "@maikers/mainframe-sdk";

const sdk = createMainnetSDK({
  storage: { arweave: { gateway: 'https://arweave.net' } }
});
await sdk.initialize("Phantom");

// Create agent with affiliate commission
const result = await sdk.createAgent(
  nftMint,
  agentConfig,
  {
    affiliate: 'YOUR_WALLET_ADDRESS',  // Your affiliate wallet
    referrer: 'OPTIONAL_REFERRER_ADDRESS'  // Optional: multi-level referrals
  }
);

console.log("Agent created:", result.agentAccount);
// Your commission is paid automatically during this transaction!
```

### Auto-Initialization

Your affiliate account automatically initializes on your first commission:
- No manual registration required
- No upfront costs or deposits
- Account created with first successful referral
- Tier starts at Bronze (15%)

### Tracking Earnings

Monitor your affiliate earnings in real-time:

```typescript
// Listen for commission payments
sdk.events.onAffiliatePaid((event) => {
  console.log({
    agent: event.agentAccount,
    affiliate: event.affiliate,
    amount: event.affiliateAmount,  // Commission in lamports
    tier: calculateTier(event.totalSales),
    timestamp: new Date(event.timestamp * 1000)
  });
});

// Example output:
// {
//   agent: "8x7k2V...",
//   affiliate: "9y8j3W...", 
//   amount: 7500000,       // 0.0075 SOL (15% of 0.05 SOL)
//   tier: "Bronze",
//   timestamp: 2025-11-03T10:30:45.123Z
// }
```

### Platform Integration

#### Web Application with Referral System

```typescript
// Example: NFT marketplace with affiliate tracking
async function createAgentWithReferral(
  nftMint: string, 
  config: AgentConfig
) {
  // Get affiliate from URL parameter or session
  const urlParams = new URLSearchParams(window.location.search);
  const affiliateWallet = urlParams.get('ref');
  
  // Optional: Get referrer for multi-level
  const referrerWallet = getReferrerFromAffiliate(affiliateWallet);
  
  try {
    const result = await sdk.createAgent(nftMint, config, {
      affiliate: affiliateWallet || undefined,
      referrer: referrerWallet || undefined
    });
    
    // Log for analytics
    await logAffiliateTransaction({
      agent: result.agentAccount,
      affiliate: affiliateWallet,
      referrer: referrerWallet,
      fee: 0.05,  // Standard fee
      timestamp: Date.now()
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
  // Store in session for later use
  sessionStorage.setItem('affiliateWallet', referralCode);
}

// Later, when creating agent:
const affiliateWallet = sessionStorage.getItem('affiliateWallet');
if (affiliateWallet) {
  await sdk.createAgent(nftMint, agentConfig, {
    affiliate: affiliateWallet
  });
}
```

## Fee Distribution Model

Understanding how fees are split:

```
Total Activation Fee: 0.05 SOL (100%)
├─ Affiliate Commission: Variable (15-50% based on tier)
└─ Remaining Fee → Treasury Distribution:
   ├─ Protocol Treasury: 50%
   ├─ Validator Treasury: 30%
   └─ Network Treasury: 20%
```

### Distribution Examples

**Bronze Affiliate (15%):**
```
Total Fee: 0.05 SOL (50,000,000 lamports)
├─ Bronze Affiliate: 0.0075 SOL (15%)
└─ Remaining: 0.0425 SOL
   ├─ Protocol: 0.02125 SOL (50%)
   ├─ Validators: 0.01275 SOL (30%)
   └─ Network: 0.0085 SOL (20%)
```

**Diamond Affiliate (50%):**
```
Total Fee: 0.05 SOL (50,000,000 lamports)
├─ Diamond Affiliate: 0.025 SOL (50%)
└─ Remaining: 0.025 SOL
   ├─ Protocol: 0.0125 SOL (50%)
   ├─ Validators: 0.0075 SOL (30%)
   └─ Network: 0.005 SOL (20%)
```

## Revenue Projections

### Monthly Earnings by Tier

| Monthly Sales | Bronze (15%) | Silver (20%) | Gold (30%) | Platinum (40%) | Diamond (50%) |
|--------------|-------------|-------------|-----------|---------------|---------------|
| 50 agents | 0.375 SOL | 0.5 SOL | 0.75 SOL | 1 SOL | **1.25 SOL** |
| 100 agents | 0.75 SOL | 1 SOL | 1.5 SOL | 2 SOL | **2.5 SOL** |
| 500 agents | 3.75 SOL | 5 SOL | 7.5 SOL | 10 SOL | **12.5 SOL** |
| 1,000 agents | 7.5 SOL | 10 SOL | 15 SOL | 20 SOL | **25 SOL** |
| 5,000 agents | 37.5 SOL | 50 SOL | 75 SOL | 100 SOL | **125 SOL** |

*Based on 0.05 SOL standard activation fee

### Annual Projections

| Scale | Annual Sales | Bronze | Silver | Gold | Platinum | Diamond |
|-------|-------------|--------|--------|------|----------|---------|
| Starter | 600 agents | 4.5 SOL | 6 SOL | 9 SOL | 12 SOL | **15 SOL** |
| Growth | 2,400 agents | 18 SOL | 24 SOL | 36 SOL | 48 SOL | **60 SOL** |
| Scale | 6,000 agents | 45 SOL | 60 SOL | 90 SOL | 120 SOL | **150 SOL** |
| Enterprise | 12,000+ agents | 90+ SOL | 120+ SOL | 180+ SOL | 240+ SOL | **300+ SOL** |

## Business Models

### Direct Integration
Perfect for:
- **NFT Marketplaces** - Earn commission on agent creation from your platform
- **Gaming Platforms** - Monetize AI agent features in games
- **DeFi Protocols** - Add AI trading bots with revenue sharing
- **dApp Builders** - Integrate agent creation with built-in monetization

### Referral Networks
Perfect for:
- **Content Creators** - Share referral links with your community
- **Influencer Marketing** - Track performance with on-chain transparency
- **Partner Networks** - Build multi-level affiliate networks
- **Community Builders** - Reward community members for growth

### White-Label Solutions
Perfect for:
- **Enterprise Clients** - Custom branded AI agent platforms
- **SaaS Platforms** - Embedded agent creation with revenue split
- **API Integrations** - Programmatic agent management
- **Resellers** - Add value to existing product offerings

## Analytics & Reporting

### Real-Time Tracking

```typescript
class AffiliateAnalytics {
  private earnings: Map<string, number> = new Map();
  private salesCount: Map<string, number> = new Map();
  
  constructor(sdk: MainframeSDK) {
    // Track all affiliate payments
    sdk.events.onAffiliatePaid((event) => {
      // Update earnings
      const currentEarnings = this.earnings.get(event.affiliate) || 0;
      this.earnings.set(event.affiliate, currentEarnings + event.affiliateAmount);
      
      // Update sales count
      const currentSales = this.salesCount.get(event.affiliate) || 0;
      this.salesCount.set(event.affiliate, currentSales + 1);
    });
  }
  
  getTotalEarnings(affiliate: string): number {
    return this.earnings.get(affiliate) || 0;
  }
  
  getTotalSales(affiliate: string): number {
    return this.salesCount.get(affiliate) || 0;
  }
  
  getCurrentTier(affiliate: string): string {
    const sales = this.getTotalSales(affiliate);
    if (sales >= 10000) return "Diamond";
    if (sales >= 2000) return "Platinum";
    if (sales >= 500) return "Gold";
    if (sales >= 100) return "Silver";
    return "Bronze";
  }
  
  getNextTierProgress(affiliate: string): { 
    currentTier: string;
    nextTier: string;
    salesNeeded: number;
    progress: number;
  } {
    const sales = this.getTotalSales(affiliate);
    const tier = this.getCurrentTier(affiliate);
    
    const tierThresholds = {
      Bronze: { next: "Silver", threshold: 100 },
      Silver: { next: "Gold", threshold: 500 },
      Gold: { next: "Platinum", threshold: 2000 },
      Platinum: { next: "Diamond", threshold: 10000 },
      Diamond: { next: "Max", threshold: Infinity }
    };
    
    const { next, threshold } = tierThresholds[tier];
    const salesNeeded = Math.max(0, threshold - sales);
    const progress = tier === "Diamond" ? 100 : (sales / threshold) * 100;
    
    return { currentTier: tier, nextTier: next, salesNeeded, progress };
  }
}
```

### Performance Metrics

Track key affiliate performance indicators:

- **Conversion Rate**: Visitors → Agent Creations
- **Average Commission Rate**: Based on current tier
- **Revenue per Referral**: Total earnings ÷ successful referrals
- **Tier Progression**: Time to reach each tier milestone
- **Multi-Level Earnings**: L1 + L2 referral income
- **Streak Status**: Current consecutive days with sales

## Validation & Security

### Parameter Validation

```typescript
// Valid configurations
{ affiliate: 'wallet...' }                     ✅ Affiliate with auto-tier commission
{ affiliate: 'wallet...', referrer: 'ref...' } ✅ Multi-level referrals

// Invalid configurations  
{ affiliate: undefined }                       ✅ Optional - no affiliate
{ affiliate: 'invalid_address' }               ❌ Must be valid Solana address
```

### Security Features

- **50% Maximum Cap**: Prevents excessive commissions (enforced on-chain)
- **Checked Arithmetic**: Prevents overflows and underflows
- **Balance Validation**: Ensures payer has sufficient funds
- **Atomic Execution**: All-or-nothing transaction processing
- **Zero-Balance Support**: Affiliates can receive payments to unfunded accounts
- **Fraud Protection**: Protocol reserves right to demote/ban fraudulent affiliates

## Getting Started

### 1. Install SDK
```bash
npm install @maikers/mainframe-sdk
```

### 2. Enable Affiliate Tracking
```typescript
import { createMainnetSDK } from "@maikers/mainframe-sdk";

const sdk = createMainnetSDK({
  storage: { arweave: { gateway: 'https://arweave.net' } }
});
await sdk.initialize("Phantom");
```

### 3. Start Earning
```typescript
// Create agent with your affiliate wallet
await sdk.createAgent(nftMint, agentConfig, {
  affiliate: "YOUR_WALLET_ADDRESS"
});
```

### 4. Track Performance
```typescript
// Monitor your earnings
sdk.events.onAffiliatePaid((event) => {
  if (event.affiliate === "YOUR_WALLET_ADDRESS") {
    console.log(`Earned: ${event.affiliateAmount / 1e9} SOL`);
  }
});
```

### 5. Scale Your Revenue
- Share your referral link: `https://mainframe.maikers.com?ref=YOUR_WALLET`
- Build tier progression to increase commission rate
- Refer other affiliates for multi-level earnings
- Track performance with on-chain analytics

## Partnership Opportunities

### Volume Benefits

High-volume affiliates may qualify for additional benefits:

| Monthly Volume | Collection Discount | Effective Commission | Total Savings |
|----------------|---------------------|---------------------|---------------|
| 100+ agents | 25% fee discount | 37.5% effective | Significant |
| 500+ agents | 50% fee discount | 50%+ effective | Substantial |
| 1,000+ agents | 75% fee discount | 60%+ effective | Exceptional |

*Contact enterprise@maikers.com for partnership discussions

### Enterprise Support

- **Technical Integration** - Dedicated engineering support
- **Marketing Collaboration** - Co-promotion and content creation
- **Custom Solutions** - Tailored SDK features for your use case
- **Revenue Optimization** - Data-driven commission structure optimization
- **Priority Support** - Direct access to core team

## FAQ

**Q: Do I need to register to become an affiliate?**  
A: No! Just provide your wallet address when users create agents. Your affiliate account auto-initializes on first commission.

**Q: Do I need SOL to receive commissions?**  
A: No, zero-balance accounts can receive payments.

**Q: How long does it take to receive commission?**  
A: Instant! Commission is paid within the agent creation transaction.

**Q: Can I see my tier progression?**  
A: Yes, track via `AffiliatePaid` events or query your AffiliateAccount on-chain.

**Q: What's the maximum commission rate?**  
A: 50% (Diamond tier with 10,000+ sales).

**Q: Do affiliates increase user costs?**  
A: No, fees remain constant. Commission comes from protocol share.

**Q: Can tiers decrease?**  
A: No, tiers are permanent once achieved (except for fraud violations).

**Q: How do multi-level referrals work?**  
A: Earn 10% from direct referrals (L1) and 5% from their referrals (L2).

**Q: Are there minimum payout thresholds?**  
A: No, every commission is paid immediately regardless of amount.

**Q: Can I track earnings off-chain?**  
A: Yes, monitor `AffiliatePaid` events and store in your own database.

## Resources

- **[Mainframe SDK](https://github.com/MaikersHQ/maikers-mainframe-sdk)** - TypeScript SDK with examples
- **[Mainframe Program](https://github.com/MaikersHQ/maikers-mainframe)** - On-chain program source
- **[API Reference](API.md)** - Complete SDK documentation
- **[Discord Community](https://discord.gg/maikers)** - Get support and connect
- **[Enterprise Contact](mailto:enterprise@maikers.com)** - Partnership inquiries

---

**Ready to start earning?** Just add your wallet address as an affiliate parameter and start receiving commissions automatically! 🚀
