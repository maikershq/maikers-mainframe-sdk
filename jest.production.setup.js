/**
 * Production test environment setup
 */

// Configure production logging for tests
process.env.NODE_ENV = 'test';
process.env.MAINFRAME_LOG_LEVEL = 'warn'; // Reduce noise in tests
process.env.MAINFRAME_ENABLE_METRICS = 'true';
process.env.MAINFRAME_ENABLE_AUDIT = 'true';

// Global test utilities
global.testUtils = {
  // Production test helpers
  async waitForCondition(condition, timeoutMs = 10000, intervalMs = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return false;
  },

  // Performance measurement helper
  async measurePerformance(operation, iterations = 100) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime();
      await operation();
      const [seconds, nanoseconds] = process.hrtime(start);
      times.push(seconds * 1000 + nanoseconds / 1000000);
    }

    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((sum, time) => sum + time, 0) / times.length,
      median: times.sort()[Math.floor(times.length / 2)],
      iterations
    };
  },

  // Memory usage helper
  getMemoryDelta(beforeUsage, afterUsage) {
    return {
      heapUsed: afterUsage.heapUsed - beforeUsage.heapUsed,
      heapTotal: afterUsage.heapTotal - beforeUsage.heapTotal,
      external: afterUsage.external - beforeUsage.external,
      rss: afterUsage.rss - beforeUsage.rss
    };
  },

  // Clean up production utilities after tests
  async cleanupProductionUtils() {
    try {
      const { 
        globalConnectionPool, 
        globalResourceMonitor,
        globalMemoryManager,
        metadataCache,
        accountCache,
        configCache 
      } = require('../dist/cjs/index.js');

      // Stop monitoring
      globalResourceMonitor?.stopMonitoring();
      
      // Clear caches
      metadataCache?.clear();
      accountCache?.clear();
      configCache?.clear();
      
      // Close connections
      globalConnectionPool?.closeAll();
      
      // Force garbage collection
      globalMemoryManager?.forceGC();
      
      console.log('🧹 Production utilities cleaned up after tests');
    } catch (error) {
      console.warn('Warning during test cleanup:', error.message);
    }
  }
};

// Global setup for production tests
beforeAll(async () => {
  console.log('🚀 Setting up production test environment...');
  
  // Initialize production utilities
  try {
    const { configureLogger } = require('../dist/cjs/index.js');
    configureLogger('testing');
    
    console.log('✅ Production test environment ready');
  } catch (error) {
    console.warn('Production utilities not available (build may not be complete)');
  }
});

// Global cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up production test environment...');
  
  await global.testUtils.cleanupProductionUtils();
  
  // Give some time for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('✅ Production test cleanup complete');
});

// Handle unhandled promises in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection in production test:', reason);
});

// Extended timeout for production tests
jest.setTimeout(30000);
