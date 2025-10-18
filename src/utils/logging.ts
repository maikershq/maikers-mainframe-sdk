/**
 * Production-grade logging system for Mainframe SDK
 */

import { TokenGenerator } from './security';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  requestId?: string;
  userId?: string;
  walletAddress?: string;
  operation?: string;
  duration?: number;
  tags?: string[];
}

export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'text' | 'structured';
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableRemote?: boolean;
  remoteEndpoint?: string;
  apiKey?: string;
  bufferSize?: number;
  flushInterval?: number;
}

/**
 * Production logger with multiple outputs and structured logging
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout | undefined;
  private fileHandle?: any;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      format: 'structured',
      enableConsole: true,
      enableFile: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      bufferSize: 100,
      flushInterval: 5000, // 5 seconds
      ...config
    };

    // Start flush timer for buffered logging
    if (this.config.bufferSize && this.config.bufferSize > 0) {
      this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
    }

    // Initialize file logging if enabled
    if (this.config.enableFile && this.config.filePath) {
      this.initializeFileLogging();
    }
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  static resetInstance(config: Partial<LoggerConfig>): void {
    if (Logger.instance) {
      Logger.instance.close();
    }
    Logger.instance = new Logger(config);
  }

  /**
   * Log trace message
   */
  trace(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel, 
    message: string, 
    context?: Record<string, any>, 
    error?: Error
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message
    };

    if (context !== undefined) entry.context = context;
    if (error !== undefined) entry.error = error;
    entry.requestId = (context?.requestId as string) || this.generateRequestId();
    if (context?.userId !== undefined) entry.userId = context.userId as string;
    if (context?.walletAddress !== undefined) entry.walletAddress = context.walletAddress as string;
    if (context?.operation !== undefined) entry.operation = context.operation as string;
    if (context?.duration !== undefined) entry.duration = context.duration as number;
    if (context?.tags !== undefined) entry.tags = context.tags as string[];

    // Add to buffer or log immediately
    if (this.config.bufferSize && this.config.bufferSize > 0) {
      this.buffer.push(entry);
      if (this.buffer.length >= this.config.bufferSize) {
        this.flush();
      }
    } else {
      this.writeLog(entry);
    }
  }

  /**
   * Write log entry to outputs
   */
  private writeLog(entry: LogEntry): void {
    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // File output
    if (this.config.enableFile && this.fileHandle) {
      this.writeToFile(entry);
    }

    // Remote output
    if (this.config.enableRemote) {
      this.writeToRemote(entry);
    }
  }

  /**
   * Write to console with appropriate formatting
   */
  private writeToConsole(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);
    const method = this.getConsoleMethod(entry.level);
    
    if (entry.error) {
      method(formatted, entry.error);
    } else {
      method(formatted);
    }
  }

  /**
   * Write to file
   */
  private writeToFile(entry: LogEntry): void {
    if (!this.fileHandle) return;

    const formatted = this.formatEntry(entry, 'json');
    this.fileHandle.write(formatted + '\n');
  }

  /**
   * Write to remote logging service
   */
  private async writeToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint || !this.config.apiKey) {
      return;
    }

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          logs: [entry],
          source: 'mainframe-sdk',
          version: '1.0.0'
        })
      });

      if (!response.ok) {
        console.error('Failed to send log to remote service:', response.status);
      }
    } catch (error) {
      console.error('Error sending log to remote service:', error);
    }
  }

  /**
   * Format log entry based on configuration
   */
  private formatEntry(entry: LogEntry, format?: string): string {
    const useFormat = format || this.config.format;

    switch (useFormat) {
      case 'json':
        return JSON.stringify(entry);
      
      case 'text':
        return `${new Date(entry.timestamp).toISOString()} [${LogLevel[entry.level]}] ${entry.message}`;
      
      case 'structured':
      default:
        const timestamp = new Date(entry.timestamp).toISOString();
        const level = LogLevel[entry.level].padEnd(5);
        const reqId = entry.requestId ? `[${entry.requestId.slice(0, 8)}]` : '';
        const operation = entry.operation ? `[${entry.operation}]` : '';
        const duration = entry.duration ? `(${entry.duration}ms)` : '';
        
        let formatted = `${timestamp} ${level} ${reqId} ${operation} ${entry.message} ${duration}`;
        
        if (entry.context && Object.keys(entry.context).length > 0) {
          formatted += ` | ${JSON.stringify(entry.context)}`;
        }
        
        return formatted.trim();
    }
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Initialize file logging
   */
  private initializeFileLogging(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Ensure directory exists
      const dir = path.dirname(this.config.filePath!);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Open file handle
      this.fileHandle = fs.createWriteStream(this.config.filePath!, { flags: 'a' });
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  /**
   * Flush buffered logs
   */
  private flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = this.buffer.splice(0);
    entries.forEach(entry => this.writeLog(entry));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return TokenGenerator.generateSecureToken(8);
  }

  /**
   * Create child logger with additional context
   */
  createChild(context: Record<string, any>): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Close logger and cleanup resources
   */
  close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    this.flush();

    if (this.fileHandle) {
      this.fileHandle.end();
      this.fileHandle = null;
    }
  }
}

/**
 * Child logger with persistent context
 */
export class ChildLogger {
  constructor(
    private parent: Logger,
    private childContext: Record<string, any>
  ) {}

  trace(message: string, context?: Record<string, any>): void {
    this.parent.trace(message, { ...this.childContext, ...context });
  }

  debug(message: string, context?: Record<string, any>): void {
    this.parent.debug(message, { ...this.childContext, ...context });
  }

  info(message: string, context?: Record<string, any>): void {
    this.parent.info(message, { ...this.childContext, ...context });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.parent.warn(message, { ...this.childContext, ...context });
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.parent.error(message, error, { ...this.childContext, ...context });
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    this.parent.fatal(message, error, { ...this.childContext, ...context });
  }

  createChild(additionalContext: Record<string, any>): ChildLogger {
    return new ChildLogger(this.parent, { ...this.childContext, ...additionalContext });
  }
}

/**
 * Performance timing decorator
 */
export function timed(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const logger = Logger.getInstance();
      const startTime = Date.now();
      const timer = logger.createChild({ operation, method: propertyName });
      
      try {
        timer.debug(`Starting ${operation}`);
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        timer.info(`Completed ${operation}`, { duration });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        timer.error(`Failed ${operation}`, error as Error, { duration });
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Audit logging decorator
 */
export function audited(eventType: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const logger = Logger.getInstance();
      const auditLogger = logger.createChild({ 
        eventType, 
        method: propertyName,
        tags: ['audit']
      });
      
      try {
        auditLogger.info(`Audit: ${eventType} started`, {
          arguments: args.length,
          timestamp: Date.now()
        });
        
        const result = await method.apply(this, args);
        
        auditLogger.info(`Audit: ${eventType} completed successfully`);
        return result;
      } catch (error) {
        auditLogger.error(`Audit: ${eventType} failed`, error as Error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Log configuration for different environments
 */
export class LogConfig {
  static development(): Partial<LoggerConfig> {
    return {
      level: LogLevel.DEBUG,
      format: 'structured',
      enableConsole: true,
      enableFile: false
    };
  }

  static production(): Partial<LoggerConfig> {
    return {
      level: LogLevel.INFO,
      format: 'json',
      enableConsole: true,
      enableFile: true,
      filePath: './logs/mainframe-sdk.log',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      bufferSize: 1000,
      flushInterval: 5000
    };
  }

  static testing(): Partial<LoggerConfig> {
    return {
      level: LogLevel.WARN,
      format: 'text',
      enableConsole: false,
      enableFile: false
    };
  }
}

/**
 * Structured logging utilities
 */
export class StructuredLogger {
  private logger: ChildLogger;

  constructor(component: string) {
    this.logger = Logger.getInstance().createChild({ component });
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.logger.info(message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any> | Error): void {
    if (context instanceof Error) {
      this.logger.warn(message, { error: context });
    } else {
      this.logger.warn(message, context);
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | Record<string, any>, context?: Record<string, any>): void {
    if (error instanceof Error) {
      this.logger.error(message, error, context);
    } else if (error && context) {
      this.logger.error(message, undefined, { ...error, ...context });
    } else if (error) {
      this.logger.error(message, undefined, error);
    } else {
      this.logger.error(message, undefined, context);
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(message, context);
  }

  /**
   * Log wallet operation
   */
  walletOperation(
    operation: string,
    walletAddress: string,
    success: boolean,
    details?: Record<string, any>
  ): void {
    const context = {
      walletAddress,
      operation: `wallet_${operation}`,
      success,
      ...details
    };
    
    if (success) {
      this.logger.info(`Wallet ${operation}`, context);
    } else {
      this.logger.error(`Wallet ${operation}`, undefined, context);
    }
  }

  /**
   * Log transaction
   */
  transaction(
    type: string,
    signature: string,
    success: boolean,
    details?: Record<string, any>
  ): void {
    const context = {
      signature,
      operation: `transaction_${type}`,
      success,
      ...details
    };
    
    if (success) {
      this.logger.info(`Transaction ${type}`, context);
    } else {
      this.logger.error(`Transaction ${type}`, undefined, context);
    }
  }

  /**
   * Log encryption operation
   */
  encryption(
    operation: 'encrypt' | 'decrypt',
    success: boolean,
    details?: Record<string, any>
  ): void {
    const context = {
      operation: `encryption_${operation}`,
      success,
      ...details
    };
    
    if (success) {
      this.logger.debug(`Encryption ${operation}`, context);
    } else {
      this.logger.error(`Encryption ${operation}`, undefined, context);
    }
  }

  /**
   * Log storage operation
   */
  storage(
    operation: string,
    provider: string,
    success: boolean,
    details?: Record<string, any>
  ): void {
    const context = {
      provider,
      operation: `storage_${operation}`,
      success,
      ...details
    };
    
    if (success) {
      this.logger.info(`Storage ${operation}`, context);
    } else {
      this.logger.error(`Storage ${operation}`, undefined, context);
    }
  }

  /**
   * Log performance metric
   */
  performance(
    operation: string,
    duration: number,
    details?: Record<string, any>
  ): void {
    this.logger.info(`Performance: ${operation}`, {
      operation: `perf_${operation}`,
      duration,
      ...details
    });
  }
}

// Export singleton instances
export const globalLogger = Logger.getInstance();

// Environment-specific logger configurations
export function configureLogger(environment: 'development' | 'production' | 'testing'): void {
  let config: Partial<LoggerConfig>;
  
  switch (environment) {
    case 'development':
      config = LogConfig.development();
      break;
    case 'production':
      config = LogConfig.production();
      break;
    case 'testing':
      config = LogConfig.testing();
      break;
    default:
      config = LogConfig.development();
  }

  // Create new logger instance with environment config
  Logger.resetInstance(config);
}
