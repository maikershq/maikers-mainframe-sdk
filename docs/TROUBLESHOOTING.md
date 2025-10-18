# Troubleshooting

## Build Issues

### TypeScript Errors

If you encounter TypeScript errors during build:

```bash
# Clean and reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Rebuild from scratch
pnpm run clean
pnpm run build
```

### Common Issues

#### 1. Metaplex Dependencies Not Found

**Solution**: The SDK uses `@metaplex-foundation/mpl-core` v1.7.0+

```bash
pnpm install
```

#### 2. TypeScript Version Compatibility

**Requires**: TypeScript ≥5.0.0

```bash
# Check version
npx tsc --version

# Update if needed
pnpm add -D typescript@latest
```

#### 3. Module Resolution Issues

**Solution**: Ensure `moduleResolution: "bundler"` or `"node16"` in `tsconfig.json`

The SDK uses ESM-first architecture.

#### 4. Type Definition Errors

The SDK exports all types from `dist/types/index.d.ts`

Ensure your IDE/editor is using the workspace TypeScript version.

## Runtime Issues

### Wallet Connection

```typescript
// If wallet connection fails
const sdk = createMainnetSDK({ /* config */ });

// Use explicit wallet name
await sdk.initialize("Phantom");

// Check available wallets
const wallets = sdk.wallet.getAvailableWallets();
console.log('Available:', wallets.map(w => w.name));
```

### Storage Upload Failures

```typescript
// Enable fallback storage
const sdk = createMainnetSDK({
  storage: {
    primary: 'arweave',
    fallback: ['ipfs'], // Automatic fallback on failure
  }
});
```

### Memory Issues

```typescript
// Force cleanup in long-running processes
sdk.forceCleanup();

// Monitor memory usage
const health = await sdk.checkHealth();
console.log('Memory:', health.systemMetrics.memory);
```

### Rate Limiting

```typescript
try {
  await sdk.createAgent(nftMint, config);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    console.log("Rate limit exceeded, please wait before retrying");
  }
}
```

## Error Handling

```typescript
import { ErrorUtils, ErrorCodes } from "@maikers/mainframe-sdk";

try {
  await sdk.createAgent(nftMint, config);
} catch (error) {
  // Check if error is recoverable
  if (ErrorUtils.isRecoverable(error)) {
    console.log('Temporary error - retrying...');
  } else if (ErrorUtils.requiresUserAction(error)) {
    console.log('User action required:', ErrorUtils.getUserMessage(error));
  } else {
    console.error('Permanent error:', error.message);
  }

  console.log('Error Code:', error.code);
  console.log('Error Context:', error.context);
}
```

## Circuit Breaker Pattern

```typescript
import { CircuitBreaker } from "@maikers/mainframe-sdk";

const circuitBreaker = new CircuitBreaker(5, 60000, 2);

try {
  const result = await circuitBreaker.execute(async () => {
    return await someRiskyOperation();
  });
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    console.log('Service temporarily unavailable - will recover automatically');
  }
}

// Monitor circuit breaker status
const status = circuitBreaker.getStatus();
console.log('Circuit Breaker:', status);
```

## Retry Mechanisms

```typescript
import { RetryManager } from "@maikers/mainframe-sdk";

const retryManager = new RetryManager(3, 1000, 30000, 2);

const result = await retryManager.executeWithRetry(
  async () => await sdk.createAgent(nftMint, config),
  (error) => {
    return error.code === 'NETWORK_ERROR' || error.code === 'RPC_ERROR';
  }
);
```

## Getting Help

- **Documentation**: [https://docs.maikers.com/mainframe](https://docs.maikers.com/mainframe)
- **Discord**: Join our community for support
- **GitHub Issues**: Report bugs or request features
- **Security Issues**: security@maikers.com (private disclosure)



