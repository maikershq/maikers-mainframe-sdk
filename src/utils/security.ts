/**
 * Production-grade security utilities for Mainframe SDK
 */

import { ErrorFactory } from './errors';
import { SECURITY_CONSTANTS, MEMORY_CONSTANTS, VALIDATION_CONSTANTS } from './constants';

/**
 * Rate limiting utility to prevent abuse
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = SECURITY_CONSTANTS.RATE_LIMIT_DEFAULT,
    private windowMs: number = SECURITY_CONSTANTS.RATE_LIMIT_WINDOW_MS,
    private cleanupIntervalMs: number = MEMORY_CONSTANTS.RATE_LIMIT_CLEANUP_INTERVAL_MS
  ) {
    // Periodic cleanup of old entries
    setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }

  /**
   * Check if request is allowed for given identifier
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Get rate limiter statistics
   */
  getStats() {
    return {
      totalIdentifiers: this.requests.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs
    };
  }
}

/**
 * Circuit breaker pattern for service resilience
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = SECURITY_CONSTANTS.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    private recoveryTimeoutMs: number = SECURITY_CONSTANTS.CIRCUIT_BREAKER_RECOVERY_TIMEOUT_MS,
    private successThreshold: number = SECURITY_CONSTANTS.CIRCUIT_BREAKER_SUCCESS_THRESHOLD
  ) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw ErrorFactory.internalError('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Force reset circuit breaker
   */
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryManager {
  constructor(
    private maxRetries: number = SECURITY_CONSTANTS.DEFAULT_RETRY_ATTEMPTS,
    private baseDelayMs: number = SECURITY_CONSTANTS.RETRY_BASE_DELAY_MS,
    private maxDelayMs: number = SECURITY_CONSTANTS.RETRY_MAX_DELAY_MS,
    private backoffMultiplier: number = SECURITY_CONSTANTS.RETRY_BACKOFF_MULTIPLIER
  ) {}

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    isRetryable: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries || !isRetryable(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          this.baseDelayMs * Math.pow(this.backoffMultiplier, attempt),
          this.maxDelayMs
        );
        const jitteredDelay = delay * (0.5 + Math.random() * 0.5);

        // Using minimal logging for retry attempts to avoid log spam
        if (attempt === this.maxRetries - 1) {
          console.warn(`Final retry attempt after ${jitteredDelay}ms delay`);
        }
        await this.sleep(jitteredDelay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Memory usage monitoring and management
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private memoryWarningThreshold = MEMORY_CONSTANTS.MEMORY_WARNING_THRESHOLD;
  private criticalThreshold = MEMORY_CONSTANTS.MEMORY_CRITICAL_THRESHOLD;
  private gcIntervalMs = MEMORY_CONSTANTS.GC_INTERVAL_MS;
  private gcTimer?: NodeJS.Timeout | undefined;

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    if (typeof global !== 'undefined' && global.gc) {
      this.gcTimer = setInterval(() => {
        const memUsage = this.getMemoryUsage();
        
        if (memUsage.percentage > this.criticalThreshold) {
          // Use console.error for critical system messages that should always be visible
          console.error('CRITICAL: Memory usage >90%, forcing garbage collection');
          if (global.gc) {
            global.gc();
          }
        } else if (memUsage.percentage > this.memoryWarningThreshold) {
          console.warn(`WARNING: Memory usage at ${(memUsage.percentage * 100).toFixed(1)}%`);
        }
      }, this.gcIntervalMs);
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      percentage: usage.heapUsed / usage.heapTotal,
      timestamp: Date.now()
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): void {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = undefined;
    }
  }
}

/**
 * Secure random token generator
 */
export class TokenGenerator {
  /**
   * Generate cryptographically secure random token
   */
  static generateSecureToken(length: number = 32): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // Browser environment
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
      // Node.js environment
      const crypto = require('crypto');
      return crypto.randomBytes(length).toString('hex');
    }
  }

  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    return this.generateSecureToken(16);
  }

  /**
   * Generate API key
   */
  static generateApiKey(): string {
    return `mk_${this.generateSecureToken(24)}`;
  }
}

/**
 * Input sanitization and validation
 */
export class SecuritySanitizer {
  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeHtml(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize SQL input to prevent injection
   */
  static sanitizeSql(input: string): string {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  /**
   * Validate and sanitize JSON input
   */
  static sanitizeJson(input: string, maxSize: number = VALIDATION_CONSTANTS.MAX_JSON_SIZE): any {
    if (input.length > maxSize) {
      throw ErrorFactory.invalidArgument(`JSON input too large: ${input.length} bytes`);
    }

    try {
      return JSON.parse(input);
    } catch (error) {
      throw ErrorFactory.invalidArgument('Invalid JSON format');
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    filename: string,
    content: Uint8Array,
    allowedExtensions: string[] = [...VALIDATION_CONSTANTS.ALLOWED_FILE_EXTENSIONS],
    maxSize: number = VALIDATION_CONSTANTS.MAX_FILE_UPLOAD_SIZE
  ): void {
    // Check file size
    if (content.length > maxSize) {
      throw ErrorFactory.invalidArgument(`File too large: ${content.length} bytes`);
    }

    // Check file extension
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      throw ErrorFactory.invalidArgument(`File type not allowed: ${extension}`);
    }

    // Basic content validation
    if (content.length === 0) {
      throw ErrorFactory.invalidArgument('Empty file not allowed');
    }
  }
}

/**
 * Audit logging for security events
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private logs: AuditEvent[] = [];
  private maxLogs = SECURITY_CONSTANTS.MAX_AUDIT_LOGS;

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log security event
   */
  logEvent(event: AuditEvent): void {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: Date.now(),
      id: TokenGenerator.generateSecureToken(8)
    };

    this.logs.push(auditEvent);

    // Rotate logs if needed
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', auditEvent);
    }
  }

  /**
   * Get audit logs
   */
  getLogs(limit: number = 100): AuditEvent[] {
    return this.logs.slice(-limit).reverse();
  }

  /**
   * Search audit logs
   */
  searchLogs(criteria: Partial<AuditEvent>): AuditEvent[] {
    return this.logs.filter(log => {
      return Object.entries(criteria).every(([key, value]) => {
        return log[key as keyof AuditEvent] === value;
      });
    });
  }

  /**
   * Clear audit logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

export interface AuditEvent {
  id?: string;
  type: 'security' | 'access' | 'error' | 'operation';
  action: string;
  userId?: string;
  walletAddress?: string;
  resource?: string;
  result: 'success' | 'failure';
  details?: Record<string, any>;
  timestamp?: number;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Security middleware for SDK operations
 */
export class SecurityMiddleware {
  private rateLimiter = new RateLimiter();
  private auditLogger = AuditLogger.getInstance();

  /**
   * Validate and log operation
   */
  async validateOperation(
    operation: string,
    userIdentifier: string,
    execute: () => Promise<any>
  ): Promise<any> {
    // Rate limiting
    if (!this.rateLimiter.isAllowed(userIdentifier)) {
      this.auditLogger.logEvent({
        type: 'security',
        action: 'rate_limit_exceeded',
        userId: userIdentifier,
        resource: operation,
        result: 'failure',
        details: { remaining: this.rateLimiter.getRemaining(userIdentifier) }
      });
      throw ErrorFactory.internalError('Rate limit exceeded. Please try again later.');
    }

    // Execute operation
    try {
      const result = await execute();
      
      this.auditLogger.logEvent({
        type: 'operation',
        action: operation,
        userId: userIdentifier,
        result: 'success'
      });
      
      return result;
    } catch (error) {
      this.auditLogger.logEvent({
        type: 'operation',
        action: operation,
        userId: userIdentifier,
        result: 'failure',
        details: { error: String(error) }
      });
      throw error;
    }
  }
}

/**
 * Global security configuration
 */
export class SecurityConfig {
  private static config = {
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      recoveryTimeoutMs: 60000
    },
    retry: {
      enabled: true,
      maxRetries: 3,
      baseDelayMs: 1000
    },
    audit: {
      enabled: true,
      logSensitiveOperations: false
    },
    memory: {
      monitoring: true,
      warningThreshold: 0.8,
      criticalThreshold: 0.9
    }
  };

  static getConfig() {
    return { ...this.config };
  }

  static updateConfig(updates: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...updates };
  }

  static isFeatureEnabled(feature: keyof typeof this.config): boolean {
    const featureConfig = this.config[feature];
    if (typeof featureConfig === 'object' && featureConfig !== null && 'enabled' in featureConfig) {
      return featureConfig.enabled;
    }
    return true;
  }
}

// Export singleton instances
export const globalRateLimiter = new RateLimiter();
export const globalRetryManager = new RetryManager();
export const globalMemoryManager = MemoryManager.getInstance();
export const globalAuditLogger = AuditLogger.getInstance();
export const globalSecurityMiddleware = new SecurityMiddleware();
