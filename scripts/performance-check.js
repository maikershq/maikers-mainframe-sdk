#!/usr/bin/env node

/**
 * Performance check script for production monitoring
 */

async function runPerformanceCheck() {
  const { 
    globalMetricsCollector, 
    globalResourceMonitor, 
    globalMemoryManager 
  } = await import('../dist/esm/index.js');
  console.log('🔍 Running Performance Check...\n');

  try {
    // Check system health
    const healthStatus = await globalResourceMonitor.runHealthChecks();
    
    console.log('📊 System Health:');
    console.log(`- Overall: ${healthStatus.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    healthStatus.checks.forEach(check => {
      const status = check.healthy ? '✅' : '❌';
      console.log(`- ${check.name}: ${status} (failures: ${check.consecutiveFailures})`);
    });

    // Memory usage
    const memoryUsage = globalMemoryManager.getMemoryUsage();
    console.log('\n🧠 Memory Usage:');
    console.log(`- Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Usage: ${(memoryUsage.percentage * 100).toFixed(1)}%`);
    
    if (memoryUsage.percentage > 0.8) {
      console.log('⚠️  High memory usage detected!');
    }

    // Performance metrics
    const performanceMetrics = globalMetricsCollector.getSummary();
    console.log('\n⚡ Performance Metrics:');
    console.log(`- Total Operations: ${performanceMetrics.totalMetrics}`);
    console.log(`- Active Timers: ${performanceMetrics.activeTimers}`);
    
    if (performanceMetrics.slowestOperations.length > 0) {
      console.log('\n🐌 Slowest Operations:');
      performanceMetrics.slowestOperations.slice(0, 3).forEach((op, i) => {
        console.log(`  ${i + 1}. ${op.name}: ${op.max.toFixed(2)}ms (avg: ${op.avg.toFixed(2)}ms)`);
      });
    }

    if (performanceMetrics.mostFrequentOperations.length > 0) {
      console.log('\n🔥 Most Frequent Operations:');
      performanceMetrics.mostFrequentOperations.slice(0, 3).forEach((op, i) => {
        console.log(`  ${i + 1}. ${op.name}: ${op.count} calls`);
      });
    }

    // Performance recommendations
    console.log('\n💡 Recommendations:');
    
    if (memoryUsage.percentage > 0.9) {
      console.log('- ⚠️  Critical: Memory usage above 90% - consider scaling resources');
    } else if (memoryUsage.percentage > 0.8) {
      console.log('- 🟡 Warning: Memory usage above 80% - monitor closely');
    } else {
      console.log('- ✅ Memory usage within acceptable range');
    }

    if (performanceMetrics.totalMetrics === 0) {
      console.log('- 📝 No metrics collected yet - system may be idle');
    } else {
      console.log('- ✅ Performance metrics collection active');
    }

    if (healthStatus.healthy) {
      console.log('- ✅ All systems operational');
    } else {
      console.log('- ❌ System health issues detected - investigate failing checks');
    }

    console.log('\n🎯 Performance Check Complete!');
    
    // Exit with appropriate code
    process.exit(healthStatus.healthy ? 0 : 1);

  } catch (error) {
    console.error('❌ Performance check failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Performance check interrupted');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the check
// Run if this is the main module (ES module equivalent)
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceCheck().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
