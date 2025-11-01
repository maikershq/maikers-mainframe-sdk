# Changelog

All notable changes to the Mainframe SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-01

### ✨ **New Features**

**Program Update:**
- Updated to Mainframe v1.0.0 program (ID: `mnfm211AwTDA8fGvPezYs3jjxAXgoucHGuTMUbjFssE`)
- Enhanced `createAgent` method with new affiliate and referrer support
- Improved agent creation flow with automatic affiliate account initialization
- Removed redundant `protocolAuthority` account requirement

**API Enhancements:**
```typescript
// Enhanced createAgent method
await sdk.createAgent(nftMint, config, {
  affiliate: 'WALLET_ADDRESS',      // Gets commission
  referrer: 'REFERRER_ADDRESS'      // Optional, for multi-level
});
```

### ✨ **New Features**

**Advanced Affiliate System:**
- ✅ Tier-based commission system (Bronze 15% → Diamond 50%)
- ✅ Automatic affiliate account initialization on first commission
- ✅ Multi-level referral support (earn from your referrals' sales)
- ✅ Streak bonuses up to +15%
- ✅ Milestone rewards (0.1 SOL to 1000 SOL)
- ✅ Permissionless participation (no pre-registration)
- ✅ On-chain tier progression tracking

**New Program Instructions:**
- `register_affiliate` - Explicitly register as affiliate with optional referrer
- `set_affiliate_bonus` - Authority can set custom bonus rates
- `propose_authority_transfer` - Step 1 of 2-step authority transfer
- `accept_authority_transfer` - Step 2 of 2-step authority transfer
- `cancel_authority_transfer` - Cancel pending transfer
- `update_treasury_addresses` - Update treasury wallet addresses

**New Account Types:**
- `AffiliateAccount` - Tracks affiliate performance and earnings
- Enhanced `ProtocolConfig` with manager role and genesis collection

**New Events:**
- `AffiliateBonusSet` - Custom bonus rate applied
- `AffiliateRegistered` - New affiliate joined
- `TierUpgraded` - Affiliate tier progression
- `TreasuryAddressesUpdated` - Treasury wallets changed

### 🔄 **Changed**

- Updated program ID constant to new mainframe v1.0.0 address
- Affiliate system now uses PDA-based accounts instead of simple transfers
- Protocol supports genesis collection with zero fees
- Enhanced authority management with 2-step transfer for security
- Fee structure field renamed: `update_config` → `update_agent_config`

### 📦 **Added Types**

```typescript
interface AffiliateAccount {
  affiliate: string;
  totalSales: number;
  totalRevenue: number;
  referralCount: number;
  referreeSales: number;
  referreeRevenue: number;
  referrer?: string;
  createdAt: number;
  bonusBps: number;
  bump: number;
}

interface AffiliateTier {
  name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  threshold: number;
  commissionRate: number;
}
```

### 🛠 **Technical Updates**

- Added `deriveAffiliateAccount()` method for PDA derivation
- Added `derivePartnerAccount()` method for partner collection PDAs
- Updated transaction building to support optional affiliate accounts
- Enhanced validation for affiliate parameters
- Updated logging to track affiliate and referrer information

### 📖 **Usage Guide**

1. **Agent Creation with Affiliates:**
   ```typescript
   // New affiliate/referrer support in createAgent
   const result = await sdk.createAgent(nftMint, config, {
     affiliate: 'AFFILIATE_WALLET',      // Earns commission
     referrer: 'OPTIONAL_REFERRER'       // Multi-level support
   });
   ```

2. **Tracking Affiliate Performance:**
   ```typescript
   // Monitor affiliate events
   sdk.events.onAffiliatePaid((event) => {
     console.log('Affiliate:', event.seller);
     console.log('Amount:', event.affiliateAmount);
   });
   ```

3. **Program ID:**
   - Current: `mnfm211AwTDA8fGvPezYs3jjxAXgoucHGuTMUbjFssE`

### ⚠️ **Important Notes**

- Updated to support mainframe v1.0.0 program
- Backward compatible with existing agents
- Affiliate accounts auto-initialize on first commission (no manual registration needed)
- Commission rates are determined by on-chain tier progression
- Multi-level referrals create passive income opportunities

## [1.0.6] - 2025-10-19

### 🔒 **Security**
- **FIXED**: Critical form-data vulnerability (GHSA-fjxv-7rqg-78g4) - upgraded from 4.0.0 to 4.0.4
- **FIXED**: High-severity axios SSRF vulnerability (GHSA-jr5f-v2jv-69x6) - upgraded to 1.12.0
- **FIXED**: High-severity axios DoS vulnerability (GHSA-4hjh-wcwx-xvwj) - upgraded to 1.12.0
- **FIXED**: Moderate axios CSRF vulnerability (GHSA-wf5p-g6vw-rhxx) - upgraded to 1.12.0
- **FIXED**: Moderate @conventional-changelog/git-client argument injection vulnerability (GHSA-vh25-5764-9wcr) - upgraded to 2.5.1

### 🛠 **Maintenance**
- Added pnpm overrides for security vulnerability fixes
- Maintained full backward compatibility
- All builds and tests continue to pass

### 📊 **Impact**
- Eliminated 5 out of 6 security vulnerabilities (83% reduction)
- Reduced security risk from Critical/High to Low severity only
- No breaking changes or API modifications

## [1.0.5] - 2025-10-19

### 💥 **Breaking Changes**
- **REMOVED**: IPFS support entirely to eliminate Electron dependencies
- **REMOVED**: `primary` and `fallback` storage configuration options  
- **REMOVED**: All IPFS-related configuration options (`ipfs` object)

### 🔄 **Changed**
- Storage configuration now only supports Arweave
- Simplified `StorageConfig` interface to only require `arweave` configuration
- Updated all SDK factory methods to use Arweave-only configuration
- Updated validation logic to only validate Arweave configuration

### 📖 **Migration Guide**
Replace storage configuration:
```typescript
// Before
storage: {
  primary: 'arweave',
  fallback: ['ipfs'],  
  arweave: { gateway: 'https://arweave.net' },
  ipfs: { gateway: 'https://ipfs.io/ipfs/' }
}

// After
storage: {
  arweave: { gateway: 'https://arweave.net' }
}
```

## [1.0.4] - 2025-10-19

### 🔧 **Fixed**
- **CRITICAL**: Fixed WalletAdapterMainframeSDK circular dependency issue that prevented proper initialization
- **CRITICAL**: Made ProgramService more flexible to support different provider scenarios
- Fixed "SDK not initialized" error when using QuickStartIntegrations.walletAdapter()

### ✨ **Added**
- **NEW**: Added unified QuickStartIntegrations.unified() method that tries multiple approaches with intelligent fallbacks
- **NEW**: Added comprehensive MainframeIntegrationDiagnostics module for debugging integration issues
- **NEW**: Enhanced QuickStartIntegrations with auto-initialization and better error handling
- Added automatic provider creation in WalletAdapterMainframeSDK for seamless wallet integration
- Added flexibility to ProgramService to handle AnchorProvider, Connection, or auto-creation scenarios

### 🔄 **Changed**
- Enhanced QuickStartIntegrations methods to be async with automatic initialization
- Improved error messages and debugging information across integration points
- Updated all QuickStartIntegrations to use consistent patterns and error handling

### 🏗️ **Technical Details**
- WalletAdapterMainframeSDK now creates AnchorProvider internally to resolve circular dependency
- ProgramService supports multiple initialization patterns: AnchorProvider, Connection, or auto-creation
- Enhanced QuickStartIntegrations with unified approach that tries Anchor first, falls back to WalletAdapter
- Added integration diagnostics with automatic issue detection and fix suggestions

### 🎯 **Impact**
This patch release resolves critical integration issues that prevented the SDK from working properly with wallet adapters. 
Users should now be able to use both Anchor and WalletAdapter approaches seamlessly, with automatic fallbacks 
and comprehensive error diagnostics to help with any remaining integration issues.

### 🔗 **Migration Guide**
This is a **patch release** with backward compatibility. Existing code using `QuickStartIntegrations.walletAdapter()` 
will now work correctly without any code changes required.

For enhanced reliability, consider switching to the new unified approach:

```typescript
// EXISTING (now works properly - no changes needed)
const sdk = await QuickStartIntegrations.walletAdapter(adapter, connection, config);

// NEW (recommended for maximum compatibility)
const sdk = await QuickStartIntegrations.unified(adapter, connection, config);
```

---

## [1.0.3] - Previous Release

### Features
- Basic SDK functionality
- Encryption services
- Storage integration
- Anchor and wallet adapter support (with known issues)