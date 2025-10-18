# Partner Collections SDK Guide

## Overview

Partner collections are stored in individual PDA accounts, enabling unlimited scalability with O(1) lookup performance. The SDK automatically handles partner PDA derivation and discount application.

## Key Features

- ✅ **Unlimited Scalability**: Support for 1000+ partner collections
- ✅ **Automatic PDA Derivation**: SDK handles all PDA calculations
- ✅ **O(1) Lookups**: Constant-time partner discount checks
- ✅ **Seamless Integration**: Transparent to end users

## Partner Collection Management

### Add Partner Collection

```typescript
import { MainframeSDK } from '@maikers/mainframe-sdk';

const sdk = new MainframeSDK(config);
await sdk.initialize();

// Add a partner collection (requires protocol authority)
const result = await sdk.addPartnerCollection(
  'CollectionMintAddress',
  50,  // 50% discount
  'Gold Partner'
);

console.log('Partner added:', result.partnerAccount);
```

### Remove Partner Collection

```typescript
// Remove a partner collection (requires protocol authority)
const result = await sdk.removePartnerCollection('CollectionMintAddress');

console.log('Partner removed:', result.signature);
```

### Check Partner Status

```typescript
// Check if a collection is a partner and get discount
const partnerInfo = await sdk.getPartnerInfo('CollectionMintAddress');

if (partnerInfo) {
  console.log(`Partner: ${partnerInfo.name}`);
  console.log(`Discount: ${partnerInfo.discountPercent}%`);
  console.log(`Active: ${partnerInfo.active}`);
  console.log(`Added: ${new Date(partnerInfo.addedAt * 1000)}`);
} else {
  console.log('Not a partner collection');
}
```

## Agent Creation with Partner Discounts

### Automatic Discount Application

The SDK automatically applies partner discounts when creating agents:

```typescript
// Create agent from partner collection NFT
const result = await sdk.createAgent(
  nftMint,
  agentConfig
);

// Partner discount is automatically applied if:
// 1. NFT belongs to a partner collection
// 2. Partner PDA exists and is active
// 3. SDK derives and includes partner_account in transaction
```

### How It Works

1. **SDK derives collection mint** from NFT metadata
2. **SDK derives partner PDA**: `seeds = [b"partner", collection_mint]`
3. **SDK checks partner account** existence and active status
4. **SDK calculates discounted fee** if partner exists
5. **SDK includes partner_account** in transaction for on-chain validation

### Manual Partner Account Specification

For advanced use cases:

```typescript
import { PublicKey } from '@solana/web3.js';

// Derive partner PDA manually
const [partnerPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('partner'), collectionMint.toBuffer()],
  programId
);

// Include in transaction (usually automatic)
const result = await sdk.createAgent(nftMint, agentConfig);
```

## PDA Architecture

### Partner Account PDA

**Seeds:** `[b"partner", collection_mint]`

**Structure:**
```typescript
interface PartnerCollectionAccount {
  collectionMint: string;      // Collection this partner represents
  discountPercent: number;     // Discount percentage (0-100)
  name: string;                // Partner name (max 50 chars)
  active: boolean;             // Active status
  addedAt: number;             // Timestamp when added
}
```

**Storage:** 105 bytes per partner  
**Rent:** ~0.0007 SOL (rent-exempt)

### Protocol Config Updates

**Old (Vec-based):**
```typescript
interface ProtocolConfigData {
  partnerCollections: PartnerCollection[];  // Limited array
}
```

**New (PDA-based):**
```typescript
interface ProtocolConfigData {
  totalPartners: number;  // Lightweight counter
}
```

## Fee Calculation

### Discount Priority

1. **Genesis Collection**: 0 fees (bypasses all other calculations)
2. **Partner Collection**: Discounted fees (via PDA lookup)
3. **Standard Collection**: Full fees

### Example Calculations

**Base Fee:** 50,000,000 lamports (0.05 SOL)

```typescript
// Genesis collection (maikers'collectibles)
Fee: 0 lamports (100% discount)

// Partner with 50% discount
Fee: 25,000,000 lamports (0.025 SOL)

// Partner with 75% discount
Fee: 12,500,000 lamports (0.0125 SOL)

// Standard collection
Fee: 50,000,000 lamports (0.05 SOL)
```

### With Affiliate

**Example:** Partner collection (50% discount) + 10% affiliate

```
Base Fee: 50,000,000 lamports
After Partner Discount (50%): 25,000,000 lamports
├─ Affiliate (10%): 2,500,000 lamports
└─ Remaining: 22,500,000 lamports
   ├─ Protocol: 11,250,000 lamports
   ├─ Validator: 6,750,000 lamports
   └─ Network: 4,500,000 lamports
```

## SDK Implementation Details

### Partner PDA Derivation

```typescript
class ProgramService {
  private derivePartnerAccount(collectionMint: PublicKey): PublicKey {
    const [partnerAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('partner'), collectionMint.toBuffer()],
      new PublicKey(this.config.programId)
    );
    return partnerAccount;
  }
}
```

### Partner Discount Lookup

```typescript
private async getPartnerDiscount(collectionMint: PublicKey): Promise<number> {
  try {
    const partnerPda = this.derivePartnerAccount(collectionMint);
    const accountInfo = await this.connection.getAccountInfo(partnerPda);
    
    if (!accountInfo) {
      return 0;  // Not a partner
    }
    
    // Parse account data
    const data = accountInfo.data;
    const discountPercent = data[40];  // Offset after discriminator + pubkey
    const active = data[95] === 1;      // Active flag
    
    return (active && discountPercent !== undefined) ? discountPercent : 0;
  } catch (error) {
    return 0;
  }
}
```

### Fee Calculation Flow

```typescript
async calculateFee(operation: string, collectionMint?: PublicKey): Promise<number> {
  const protocolConfig = await this.getProtocolConfig();
  let baseFee = protocolConfig.fees[operation];
  
  if (baseFee === 0) return 0;
  
  if (collectionMint) {
    // Check genesis
    if (collectionMint.toBase58() === MAIKERS_COLLECTIBLES) {
      return 0;
    }
    
    // Check partner discount via PDA
    const discount = await this.getPartnerDiscount(collectionMint);
    if (discount > 0) {
      return Math.floor(baseFee * (100 - discount) / 100);
    }
  }
  
  return baseFee;
}
```

## Migration Guide

### From Vec-Based to PDA-Based

**Old SDK Usage:**
```typescript
// Partner collections were in protocol config
const config = await sdk.getProtocolConfig();
const partners = config.partnerCollections;  // Array
```

**New SDK Usage:**
```typescript
// Partner collections in separate PDAs
const config = await sdk.getProtocolConfig();
const totalPartners = config.totalPartners;  // Counter only

// Get specific partner info
const partner = await sdk.getPartnerInfo(collectionMint);
```

### No Breaking Changes for End Users

Agent creation remains unchanged:
```typescript
// Works exactly the same
const result = await sdk.createAgent(nftMint, agentConfig);
```

Partner discounts are still automatically applied.

## Performance

### Caching Strategy

The SDK can implement partner caching for optimal performance:

```typescript
const partnerCache = new Map<string, {discount: number, expires: number}>();

async function getCachedPartnerDiscount(collection: PublicKey): Promise<number> {
  const key = collection.toBase58();
  const cached = partnerCache.get(key);
  
  if (cached && Date.now() < cached.expires) {
    return cached.discount;
  }
  
  const discount = await getPartnerDiscount(collection);
  
  partnerCache.set(key, {
    discount,
    expires: Date.now() + 60000 // Cache for 1 minute
  });
  
  return discount;
}
```

### RPC Call Optimization

- **Genesis check**: Local (no RPC)
- **Partner check**: 1 RPC call (`getAccountInfo`)
- **Cacheable**: Partner data rarely changes
- **Parallel**: Multiple collections can be checked concurrently

## Error Handling

### Common Errors

```typescript
try {
  await sdk.addPartnerCollection(collection, 50, 'Partner');
} catch (error) {
  if (error.toString().includes('already in use')) {
    console.error('Partner collection already exists');
  } else if (error.toString().includes('Unauthorized')) {
    console.error('Only protocol authority can add partners');
  } else if (error.toString().includes('InvalidDiscountPercent')) {
    console.error('Discount must be 0-100%');
  }
}
```

### Graceful Degradation

If partner PDA check fails, SDK falls back to standard fees:

```typescript
private async getPartnerDiscount(collectionMint: PublicKey): Promise<number> {
  try {
    // ... partner lookup
  } catch (error) {
    return 0;  // Default to no discount
  }
}
```

## Best Practices

### For Protocol Operators

1. **Add Partners Strategically**: Focus on high-value collections
2. **Monitor Usage**: Track total_partners counter
3. **Set Appropriate Discounts**: 25-75% typical range
4. **Communicate Benefits**: Inform partners of their status

### For Integrators

1. **Cache Partner Data**: Reduce RPC calls
2. **Handle Null Gracefully**: Not all collections are partners
3. **Display Discounts**: Show users their benefits
4. **Parallel Checks**: Check multiple collections concurrently

### For End Users

1. **Transparent**: Partner discounts applied automatically
2. **No Extra Steps**: Same activation flow
3. **Clear Savings**: Display discount amount
4. **Trust**: PDA architecture ensures fair application

## Advanced Usage

### List All Partners

```typescript
// Get total partner count
const config = await sdk.getProtocolConfig();
console.log(`Total partners: ${config.totalPartners}`);

// Query specific partners
const collectionMints = ['collection1', 'collection2', 'collection3'];
const partners = await Promise.all(
  collectionMints.map(mint => sdk.getPartnerInfo(mint))
);

const activePartners = partners.filter(p => p !== null);
console.log(`Active partners: ${activePartners.length}`);
```

### Batch Partner Operations

```typescript
// Add multiple partners in parallel
const newPartners = [
  { mint: 'collection1', discount: 25, name: 'Silver' },
  { mint: 'collection2', discount: 50, name: 'Gold' },
  { mint: 'collection3', discount: 75, name: 'Platinum' },
];

await Promise.all(
  newPartners.map(p => 
    sdk.addPartnerCollection(p.mint, p.discount, p.name)
  )
);
```

### Partner Analytics

```typescript
// Track partner performance
interface PartnerMetrics {
  collection: string;
  name: string;
  discount: number;
  activations: number;
  totalSavings: number;
}

async function getPartnerMetrics(sdk: MainframeSDK): Promise<PartnerMetrics[]> {
  const events = await sdk.events.getAgentCreatedEvents();
  
  const metrics = new Map<string, PartnerMetrics>();
  
  for (const event of events) {
    if (event.collectionMint) {
      const partner = await sdk.getPartnerInfo(event.collectionMint);
      if (partner) {
        const key = event.collectionMint;
        const existing = metrics.get(key) || {
          collection: key,
          name: partner.name,
          discount: partner.discountPercent,
          activations: 0,
          totalSavings: 0
        };
        
        existing.activations++;
        // Calculate savings based on base fee
        const baseFee = 50_000_000;
        const savings = baseFee * partner.discountPercent / 100;
        existing.totalSavings += savings;
        
        metrics.set(key, existing);
      }
    }
  }
  
  return Array.from(metrics.values());
}
```

## Testing

### Unit Tests

```typescript
describe('Partner Collection PDA', () => {
  it('derives partner PDA correctly', () => {
    const collectionMint = new PublicKey('...');
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('partner'), collectionMint.toBuffer()],
      programId
    );
    
    expect(pda).to.be.instanceOf(PublicKey);
    expect(bump).to.be.lessThan(256);
  });
  
  it('fetches partner discount', async () => {
    const discount = await sdk.getPartnerInfo(collectionMint);
    expect(discount).to.be.a('number');
  });
});
```

## Migration Checklist

- [ ] Update SDK to latest version
- [ ] Remove references to `protocolConfig.partnerCollections`
- [ ] Use `sdk.getPartnerInfo()` instead of array lookups
- [ ] Test partner discount application
- [ ] Update client-side caching if implemented
- [ ] Verify all partner collections migrated to PDAs

## Resources

- **[Partner PDA Architecture](../../maikers-mainframe/docs/partner-pda-architecture.md)** - Program-level documentation
- **[SDK API Reference](./api.md)** - Complete SDK API
- **[Integration Guide](../../maikers-mainframe/docs/integration.md)** - Protocol integration

## Support

For issues or questions:
- GitHub Issues: [maikers-mainframe-sdk/issues](https://github.com/maikers/mainframe-sdk/issues)
- Documentation: [docs.maikers.com](https://docs.maikers.com)

