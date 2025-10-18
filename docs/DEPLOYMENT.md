# Production Deployment

## System Requirements

- **Node.js**: ≥18.0.0 (LTS recommended)
- **Memory**: Minimum 512MB, Recommended 1GB+ for production workloads
- **CPU**: 2+ cores recommended for concurrent operations
- **Network**: Stable internet connection for RPC endpoints
- **Storage**: 100MB+ for logs and cache data

## Environment Configuration

```typescript
import { 
  createMainnetSDK, 
  configureLogger,
  SecurityConfig 
} from "@maikers/mainframe-sdk";

// Production environment setup
process.env.NODE_ENV = 'production';
process.env.MAINFRAME_LOG_LEVEL = 'info';
process.env.MAINFRAME_ENABLE_METRICS = 'true';
process.env.MAINFRAME_ENABLE_HEALTH_CHECKS = 'true';

// Configure production logging
configureLogger('production');

// Initialize with production settings
const sdk = createMainnetSDK({
  rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT,
  programId: process.env.MAINFRAME_PROGRAM_ID,
  protocolWallet: process.env.PROTOCOL_WALLET,
  storage: {
    primary: 'arweave',
    fallback: ['ipfs'],
    arweave: {
      gateway: 'https://arweave.net',
      bundler: 'https://node2.bundlr.network'
    },
    ipfs: {
      gateway: 'https://ipfs.io/ipfs/',
      api: 'https://api.pinata.cloud',
      apiKey: process.env.PINATA_JWT
    }
  }
});

await sdk.initialize();

// Health check endpoint for load balancers
const healthStatus = await sdk.checkHealth();
console.log('Health:', healthStatus.healthy ? 'OK' : 'UNHEALTHY');
```

## Monitoring & Alerting

```typescript
// Real-time system monitoring
const status = await sdk.getStatus();

console.log('System Overview:');
console.log('- Health:', status.health.overall ? '✅ Healthy' : '❌ Unhealthy');
console.log('- Memory Usage:', `${(status.performance.memory.usage * 100).toFixed(1)}%`);
console.log('- Active Connections:', status.performance.connections.active);
console.log('- Cache Hit Rate:', `${(status.cache.metadata.hitRate * 100).toFixed(1)}%`);

// Performance metrics dashboard
const metrics = sdk.getPerformanceMetrics();
console.log('\nPerformance Metrics:');
console.log('- Total Operations:', metrics.summary.totalMetrics);
console.log('- Slowest Operation:', metrics.summary.slowestOperations[0]?.name);
console.log('- Most Frequent:', metrics.summary.mostFrequentOperations[0]?.name);

// Security audit trail
import { globalAuditLogger } from "@maikers/mainframe-sdk";
const recentEvents = globalAuditLogger.getLogs(10);
console.log('\nRecent Security Events:', recentEvents.length);
```

## Deployment Checklist

Before production deployment, verify:

```bash
# Run production test suite
pnpm test

# Run production readiness tests
node -e "
import { ProductionTestSuite } from '@maikers/mainframe-sdk';
const suite = new ProductionTestSuite();
suite.runAllTests().then(results => {
  console.log('Production Readiness:', results.summary.coverage + '%');
  if (results.summary.coverage >= 98) {
    console.log('✅ READY FOR PRODUCTION!');
    process.exit(0);
  } else {
    console.log('❌ NOT READY - Address failing tests');
    process.exit(1);
  }
});
"

# Check security configuration
node -e "
import { SecurityConfig } from '@maikers/mainframe-sdk';
console.log('Security Config:', SecurityConfig.getConfig());
"
```

## Support & Maintenance

### 24/7 Production Support
- Real-time monitoring capabilities
- Automated alerting system  
- Performance optimization tools
- Debug logging and troubleshooting
- Hot-fix deployment capabilities

### Maintenance Schedule
- Weekly performance reviews
- Monthly security audits
- Quarterly dependency updates
- Bi-annual penetration testing
- Annual architecture review



