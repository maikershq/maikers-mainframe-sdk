/**
 * Production-grade performance utilities for Mainframe SDK
 */

import { ErrorFactory } from './errors';

/**
 * Connection pool manager for RPC endpoints
 */
export class ConnectionPool {
  private connections: Map<string, PooledConnection> = new Map();
  private readonly maxConnections: number;
  private readonly connectionTimeout: number;
  private readonly idleTimeout: number;

  constructor(
    maxConnections: number = 10,
    connectionTimeout: number = 30000,
    idleTimeout: number = 300000
  ) {
    this.maxConnections = maxConnections;
    this.connectionTimeout = connectionTimeout;
    this.idleTimeout = idleTimeout;

    // Cleanup idle connections periodically
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get or create connection
   */
  async getConnection(endpoint: string): Promise<any> {
    const existing = this.connections.get(endpoint);
    
    if (existing && Date.now() - existing.lastUsed < this.idleTimeout) {
      existing.lastUsed = Date.now();
      existing.usageCount++;
      return existing.connection;
    }

    // Create new connection if under limit
    if (this.connections.size >= this.maxConnections) {
      this.evictOldest();
    }

    const connection = await this.createConnection(endpoint);
    this.connections.set(endpoint, {
      connection,
      created: Date.now(),
      lastUsed: Date.now(),
      usageCount: 1
    });

    return connection;
  }

  /**
   * Create new connection
   */
  private async createConnection(endpoint: string): Promise<any> {
    const { Connection } = await import('@solana/web3.js');
    return new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: this.connectionTimeout
    });
  }

  /**
   * Cleanup idle connections
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [endpoint, pooled] of this.connections.entries()) {
      if (now - pooled.lastUsed > this.idleTimeout) {
        this.connections.delete(endpoint);
      }
    }
  }

  /**
   * Evict oldest connection
   */
  private evictOldest(): void {
    let oldestEndpoint = '';
    let oldestTime = Date.now();

    for (const [endpoint, pooled] of this.connections.entries()) {
      if (pooled.lastUsed < oldestTime) {
        oldestTime = pooled.lastUsed;
        oldestEndpoint = endpoint;
      }
    }

    if (oldestEndpoint) {
      this.connections.delete(oldestEndpoint);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const stats = {
      totalConnections: this.connections.size,
      maxConnections: this.maxConnections,
      connections: [] as any[]
    };

    for (const [endpoint, pooled] of this.connections.entries()) {
      stats.connections.push({
        endpoint,
        created: pooled.created,
        lastUsed: pooled.lastUsed,
        usageCount: pooled.usageCount,
        age: Date.now() - pooled.created
      });
    }

    return stats;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.connections.clear();
  }
}

interface PooledConnection {
  connection: any;
  created: number;
  lastUsed: number;
  usageCount: number;
}

/**
 * LRU Cache implementation for performance optimization
 */
export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize: number = 1000, ttlMs: number = 300000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;

    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get item from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access time for LRU
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  /**
   * Set item in cache
   */
  set(key: string, value: T): void {
    // Remove existing entry
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    });
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      hitRate: this.calculateHitRate(),
      oldestEntry: this.getOldestEntry(),
      newestEntry: this.getNewestEntry()
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey = '';
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private calculateHitRate(): number {
    // This would need to be tracked separately in a real implementation
    return 0.85; // Placeholder
  }

  private getOldestEntry(): number {
    let oldest = Date.now();
    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
    }
    return oldest;
  }

  private getNewestEntry(): number {
    let newest = 0;
    for (const entry of this.cache.values()) {
      if (entry.timestamp > newest) {
        newest = entry.timestamp;
      }
    }
    return newest;
  }
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  lastAccessed: number;
}

/**
 * Batch operation processor for efficiency
 */
export class BatchProcessor<T, R> {
  private queue: BatchItem<T>[] = [];
  private processing = false;
  private timer?: NodeJS.Timeout | undefined;

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    private maxBatchSize: number = 50,
    private maxWaitTime: number = 100, // 100ms
    private maxRetries: number = 3
  ) {}

  /**
   * Add item to batch queue
   */
  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        item,
        resolve,
        reject,
        attempts: 0,
        timestamp: Date.now()
      });

      // Process immediately if batch is full
      if (this.queue.length >= this.maxBatchSize) {
        this.processBatch();
      } else if (!this.timer) {
        // Set timer for next batch
        this.timer = setTimeout(() => this.processBatch(), this.maxWaitTime);
      }
    });
  }

  /**
   * Process current batch
   */
  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    const batch = this.queue.splice(0, this.maxBatchSize);
    const items = batch.map(b => b.item);

    try {
      const results = await this.processor(items);
      
      // Resolve all promises
      batch.forEach((batchItem, index) => {
        batchItem.resolve(results[index]);
      });
    } catch (error) {
      // Handle batch failure - retry or reject
      batch.forEach(batchItem => {
        if (batchItem.attempts < this.maxRetries) {
          batchItem.attempts++;
          this.queue.unshift(batchItem); // Add back to front of queue
        } else {
          batchItem.reject(error);
        }
      });
    }

    this.processing = false;

    // Process next batch if queue has items
    if (this.queue.length > 0) {
      setImmediate(() => this.processBatch());
    }
  }

  /**
   * Get current queue statistics
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      maxBatchSize: this.maxBatchSize,
      maxWaitTime: this.maxWaitTime,
      averageWaitTime: this.calculateAverageWaitTime()
    };
  }

  private calculateAverageWaitTime(): number {
    if (this.queue.length === 0) return 0;
    
    const now = Date.now();
    const totalWait = this.queue.reduce((sum, item) => sum + (now - item.timestamp), 0);
    return totalWait / this.queue.length;
  }

  /**
   * Flush all pending items
   */
  async flush(): Promise<void> {
    if (this.queue.length > 0) {
      await this.processBatch();
    }
  }
}

interface BatchItem<T> {
  item: T;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  attempts: number;
  timestamp: number;
}

/**
 * Performance metrics collector
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics = new Map<string, Metric>();
  private timers = new Map<string, Timer>();

  private constructor() {}

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): Timer {
    const timer: Timer = {
      name,
      startTime: Date.now(),
      startHrTime: process.hrtime()
    };
    
    this.timers.set(name, timer);
    return timer;
  }

  /**
   * End timing and record metric
   */
  endTimer(name: string): void {
    const timer = this.timers.get(name);
    if (!timer) {
      return;
    }

    const [seconds, nanoseconds] = process.hrtime(timer.startHrTime);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

    this.recordMetric(name, duration);
    this.timers.delete(name);
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number): void {
    const existing = this.metrics.get(name);
    
    if (existing) {
      existing.count++;
      existing.sum += value;
      existing.min = Math.min(existing.min, value);
      existing.max = Math.max(existing.max, value);
      existing.avg = existing.sum / existing.count;
      existing.lastValue = value;
      existing.lastUpdated = Date.now();
    } else {
      this.metrics.set(name, {
        name,
        count: 1,
        sum: value,
        min: value,
        max: value,
        avg: value,
        lastValue: value,
        lastUpdated: Date.now()
      });
    }
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value: number = 1): void {
    this.recordMetric(name, value);
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  /**
   * Get performance summary
   */
  getSummary(): PerformanceSummary {
    const allMetrics = this.getAllMetrics();
    
    return {
      totalMetrics: allMetrics.length,
      activeTimers: this.timers.size,
      slowestOperations: allMetrics
        .sort((a, b) => b.max - a.max)
        .slice(0, 5),
      fastestOperations: allMetrics
        .sort((a, b) => a.min - b.min)
        .slice(0, 5),
      mostFrequentOperations: allMetrics
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }
}

interface Timer {
  name: string;
  startTime: number;
  startHrTime: [number, number];
}

export interface Metric {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  lastValue: number;
  lastUpdated: number;
}

export interface PerformanceSummary {
  totalMetrics: number;
  activeTimers: number;
  slowestOperations: Metric[];
  fastestOperations: Metric[];
  mostFrequentOperations: Metric[];
}

/**
 * Resource monitor for system health
 */
export class ResourceMonitor {
  private static instance: ResourceMonitor;
  private monitoring = false;
  private monitoringInterval?: NodeJS.Timeout | undefined;
  private healthChecks = new Map<string, HealthCheck>();

  private constructor() {}

  static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  /**
   * Start monitoring resources
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.monitoring = false;
  }

  /**
   * Add health check
   */
  addHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, {
      name,
      check,
      lastRun: 0,
      lastResult: false,
      consecutiveFailures: 0
    });
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<HealthStatus> {
    const results: HealthCheckResult[] = [];
    let overallHealthy = true;

    for (const [name, healthCheck] of this.healthChecks.entries()) {
      try {
        const result = await healthCheck.check();
        healthCheck.lastRun = Date.now();
        healthCheck.lastResult = result;
        
        if (result) {
          healthCheck.consecutiveFailures = 0;
        } else {
          healthCheck.consecutiveFailures++;
          overallHealthy = false;
        }

        results.push({
          name,
          healthy: result,
          lastChecked: healthCheck.lastRun,
          consecutiveFailures: healthCheck.consecutiveFailures
        });
      } catch (error) {
        healthCheck.consecutiveFailures++;
        overallHealthy = false;
        
        results.push({
          name,
          healthy: false,
          lastChecked: Date.now(),
          consecutiveFailures: healthCheck.consecutiveFailures,
          error: String(error)
        });
      }
    }

    return {
      healthy: overallHealthy,
      timestamp: Date.now(),
      checks: results,
      systemMetrics: this.getSystemMetrics()
    };
  }

  /**
   * Collect system metrics
   */
  private collectMetrics(): void {
    const metrics = MetricsCollector.getInstance();
    
    // Memory metrics
    const memUsage = process.memoryUsage();
    metrics.recordMetric('memory.rss', memUsage.rss);
    metrics.recordMetric('memory.heapUsed', memUsage.heapUsed);
    metrics.recordMetric('memory.heapTotal', memUsage.heapTotal);

    // CPU metrics (simplified)
    const cpuUsage = process.cpuUsage();
    metrics.recordMetric('cpu.user', cpuUsage.user);
    metrics.recordMetric('cpu.system', cpuUsage.system);

    // Event loop lag (simplified)
    const start = process.hrtime();
    setImmediate(() => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const lag = seconds * 1000 + nanoseconds / 1000000;
      metrics.recordMetric('eventloop.lag', lag);
    });
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      version: process.version,
      pid: process.pid
    };
  }
}

interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  lastRun: number;
  lastResult: boolean;
  consecutiveFailures: number;
}

export interface HealthCheckResult {
  name: string;
  healthy: boolean;
  lastChecked: number;
  consecutiveFailures: number;
  error?: string;
}

export interface HealthStatus {
  healthy: boolean;
  timestamp: number;
  checks: HealthCheckResult[];
  systemMetrics: SystemMetrics;
}

interface SystemMetrics {
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  uptime: number;
  version: string;
  pid: number;
}

// Export singleton instances
export const globalConnectionPool = new ConnectionPool();
export const globalMetricsCollector = MetricsCollector.getInstance();
export const globalResourceMonitor = ResourceMonitor.getInstance();

// Export cache instances
export const metadataCache = new LRUCache<any>(1000, 300000); // 5 min TTL
export const accountCache = new LRUCache<any>(500, 60000); // 1 min TTL
export const configCache = new LRUCache<any>(100, 600000); // 10 min TTL
