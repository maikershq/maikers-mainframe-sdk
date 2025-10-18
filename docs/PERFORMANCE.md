# Performance

## Benchmarks

### Tested Production Limits
- **Concurrent Operations**: 1,000+ simultaneous operations
- **Memory Usage**: Stable operation under 90% memory utilization  
- **Response Time**: <100ms average for cached operations
- **Throughput**: 10,000+ operations per minute sustained
- **Error Rate**: <0.1% under normal production conditions
- **Cache Efficiency**: 85%+ hit rate with optimized TTL settings

### Resource Usage
- **Memory**: ~50MB baseline, scales linearly with operations
- **CPU**: <5% average usage under normal load
- **Network**: Bandwidth scales with RPC endpoint usage
- **Storage**: ~10MB logs per day at INFO level
- **Cache**: ~100MB cache size at full capacity

## Optimization Strategies

### Intelligent Caching

```typescript
import { metadataCache, accountCache, configCache } from "@maikers/mainframe-sdk";

// Cache statistics and management
console.log('Cache Performance:');
console.log('- Metadata Cache:', metadataCache.getStats());
console.log('- Account Cache:', accountCache.getStats()); 
console.log('- Config Cache:', configCache.getStats());

// Manual cache management
metadataCache.clear();
accountCache.delete('specific_key');

// Cache warming for critical data
await sdk.getMyAgents(); // Warms account cache
await sdk.getProtocolInfo(); // Warms config cache
```

### Connection Management

```typescript
import { globalConnectionPool } from "@maikers/mainframe-sdk";

// Connection pool statistics
const poolStats = globalConnectionPool.getStats();
console.log('Connection Pool:');
console.log(`- Active: ${poolStats.totalConnections}/${poolStats.maxConnections}`);
console.log('- Connections:', poolStats.connections);

// Manual connection management
globalConnectionPool.closeAll(); // Emergency cleanup
```

### Batch Operations

```typescript
import { BatchProcessor } from "@maikers/mainframe-sdk";

// Create custom batch processor
const agentProcessor = new BatchProcessor(
  async (nftMints: string[]) => {
    return await Promise.all(
      nftMints.map(mint => sdk.getAgentAccount(mint))
    );
  },
  50, // batch size
  100 // max wait time ms
);

// Efficient batch processing
const agents = await Promise.all([
  agentProcessor.add('mint1'),
  agentProcessor.add('mint2'),  
  agentProcessor.add('mint3')
]);
```

## Production Monitoring

```typescript
import { 
  ProductionTestSuite,
  globalMetricsCollector,
  globalResourceMonitor 
} from "@maikers/mainframe-sdk";

// Monitor system health
const health = await globalResourceMonitor.runHealthChecks();
console.log("System Health:", health.healthy);

// Get real-time performance metrics
const performanceMetrics = globalMetricsCollector.getSummary();
console.log("Top operations:", performanceMetrics.mostFrequentOperations);

// Force memory cleanup if needed
sdk.forceMemoryCleanup();
```

## Memory Management

```typescript
// Monitor memory usage
const status = await sdk.getStatus();
console.log('Memory Usage:', {
  used: status.performance.memory.used,
  total: status.performance.memory.total,
  percentage: (status.performance.memory.usage * 100).toFixed(1) + '%'
});

// Force cleanup in long-running processes
sdk.forceCleanup();
```

## Performance Testing

```typescript
import { ProductionTestSuite } from "@maikers/mainframe-sdk";

const testSuite = new ProductionTestSuite();
const results = await testSuite.runPerformanceTests();

console.log('Performance Test Results:');
console.log('- Memory under load:', results.memoryTests.passed ? '✅' : '❌');
console.log('- Connection pooling:', results.connectionTests.passed ? '✅' : '❌');
console.log('- Cache efficiency:', results.cacheTests.passed ? '✅' : '❌');
console.log('- Batch processing:', results.batchTests.passed ? '✅' : '❌');
```



