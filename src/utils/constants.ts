/**
 * Configuration constants for Mainframe SDK
 * 
 * Centralizes all magic numbers and configuration values used throughout the SDK
 * to improve maintainability and make configuration more explicit.
 */

// ============================================================================
// Network & Protocol Constants
// ============================================================================

export const PROTOCOL_CONSTANTS = {
  /** Mainframe program ID on Solana */
  PROGRAM_ID: 'mnfm211AwTDA8fGvPezYs3jjxAXgoucHGuTMUbjFssE',
  /** Maximum reasonable fee amount in lamports (1 SOL) */
  MAX_REASONABLE_FEE: 1000000000,
  
  /** Default RPC connection timeout in milliseconds */
  RPC_CONNECTION_TIMEOUT: 60000,
  
  /** Default transaction confirmation timeout in milliseconds */
  TRANSACTION_CONFIRMATION_TIMEOUT: 60000
} as const;

// ============================================================================
// Security Constants
// ============================================================================

export const SECURITY_CONSTANTS = {
  /** Default rate limiting - requests per minute */
  RATE_LIMIT_DEFAULT: 1000,
  
  /** Default rate limiting window in milliseconds */
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  
  /** Circuit breaker failure threshold */
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: 5,
  
  /** Circuit breaker recovery timeout in milliseconds */
  CIRCUIT_BREAKER_RECOVERY_TIMEOUT_MS: 60000, // 1 minute
  
  /** Circuit breaker success threshold for recovery */
  CIRCUIT_BREAKER_SUCCESS_THRESHOLD: 2,
  
  /** Maximum audit logs to keep in memory */
  MAX_AUDIT_LOGS: 10000,
  
  /** Default retry attempts for failed operations */
  DEFAULT_RETRY_ATTEMPTS: 3,
  
  /** Base delay for retry operations in milliseconds */
  RETRY_BASE_DELAY_MS: 1000,
  
  /** Maximum delay for retry operations in milliseconds */
  RETRY_MAX_DELAY_MS: 30000,
  
  /** Retry backoff multiplier */
  RETRY_BACKOFF_MULTIPLIER: 2
} as const;

// ============================================================================
// Memory Management Constants
// ============================================================================

export const MEMORY_CONSTANTS = {
  /** Memory warning threshold (80% usage) */
  MEMORY_WARNING_THRESHOLD: 0.8,
  
  /** Memory critical threshold (90% usage) */
  MEMORY_CRITICAL_THRESHOLD: 0.9,
  
  /** Garbage collection interval in milliseconds */
  GC_INTERVAL_MS: 30000, // 30 seconds
  
  /** Rate limiter cleanup interval in milliseconds */
  RATE_LIMIT_CLEANUP_INTERVAL_MS: 300000 // 5 minutes
} as const;

// ============================================================================
// Cache Configuration Constants
// ============================================================================

export const CACHE_CONSTANTS = {
  /** Metadata cache TTL in milliseconds */
  METADATA_CACHE_TTL: 300000, // 5 minutes
  
  /** Metadata cache maximum items */
  METADATA_CACHE_MAX_ITEMS: 1000,
  
  /** Account cache TTL in milliseconds */
  ACCOUNT_CACHE_TTL: 60000, // 1 minute
  
  /** Account cache maximum items */
  ACCOUNT_CACHE_MAX_ITEMS: 500,
  
  /** Configuration cache TTL in milliseconds */
  CONFIG_CACHE_TTL: 600000, // 10 minutes
  
  /** Configuration cache maximum items */
  CONFIG_CACHE_MAX_ITEMS: 100
} as const;

// ============================================================================
// Encryption Constants
// ============================================================================

export const ENCRYPTION_CONSTANTS = {
  /** XChaCha20-Poly1305 key size in bytes */
  ENCRYPTION_KEY_SIZE: 32,
  
  /** XChaCha20-Poly1305 nonce size in bytes */
  ENCRYPTION_NONCE_SIZE: 24,
  
  /** Ed25519 public key size in bytes */
  ED25519_PUBLIC_KEY_SIZE: 32,
  
  /** Ed25519 secret key size in bytes (full key) */
  ED25519_SECRET_KEY_SIZE: 64,
  
  /** Ed25519 seed size in bytes */
  ED25519_SEED_SIZE: 32,
  
  /** Maximum data size for encryption (10MB) */
  MAX_ENCRYPTION_DATA_SIZE: 10 * 1024 * 1024
} as const;

// ============================================================================
// Validation Constants
// ============================================================================

export const VALIDATION_CONSTANTS = {
  /** Maximum JSON input size in bytes */
  MAX_JSON_SIZE: 1024 * 1024, // 1MB
  
  /** Maximum string input length */
  MAX_STRING_LENGTH: 1000,
  
  /** Maximum file upload size in bytes */
  MAX_FILE_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  
  /** Allowed file extensions for uploads */
  ALLOWED_FILE_EXTENSIONS: ['.json', '.txt'] as readonly string[],
  
  /** Maximum agent name length */
  MAX_AGENT_NAME_LENGTH: 50,
  
  /** Maximum agent description length */
  MAX_AGENT_DESCRIPTION_LENGTH: 500,
  
  /** Maximum agent purpose length */
  MAX_AGENT_PURPOSE_LENGTH: 200,
  
  /** Maximum time difference for timestamp validation (1 year in seconds) */
  MAX_TIMESTAMP_DIFFERENCE: 365 * 24 * 60 * 60
} as const;

// ============================================================================
// Batch Processing Constants
// ============================================================================

export const BATCH_CONSTANTS = {
  /** Default batch size for operations */
  DEFAULT_BATCH_SIZE: 50,
  
  /** Maximum wait time for batch processing in milliseconds */
  MAX_BATCH_WAIT_TIME_MS: 100,
  
  /** Maximum batch size to prevent memory issues */
  MAX_BATCH_SIZE: 1000
} as const;

// ============================================================================
// Connection Pool Constants
// ============================================================================

export const CONNECTION_CONSTANTS = {
  /** Maximum connections in pool */
  MAX_CONNECTIONS: 10,
  
  /** Connection idle timeout in milliseconds */
  CONNECTION_IDLE_TIMEOUT_MS: 300000, // 5 minutes
  
  /** Connection health check interval in milliseconds */
  HEALTH_CHECK_INTERVAL_MS: 60000 // 1 minute
} as const;

// ============================================================================
// Storage Constants
// ============================================================================

export const STORAGE_CONSTANTS = {
  /** Default upload timeout in milliseconds */
  DEFAULT_UPLOAD_TIMEOUT_MS: 30000, // 30 seconds
  
  /** Default retry attempts for storage operations */
  DEFAULT_STORAGE_RETRIES: 3,
  
  /** Maximum metadata size in bytes */
  MAX_METADATA_SIZE: 1024 * 1024 // 1MB
} as const;

// ============================================================================
// Testing Constants
// ============================================================================

export const TESTING_CONSTANTS = {
  /** Mock operation delay in milliseconds */
  MOCK_OPERATION_DELAY_MS: 100,
  
  /** Mock connection delay in milliseconds */
  MOCK_CONNECTION_DELAY_MS: 500,
  
  /** Test timeout in milliseconds */
  TEST_TIMEOUT_MS: 30000 // 30 seconds
} as const;

// ============================================================================
// Combined Constants Export
// ============================================================================

export const MAINFRAME_CONSTANTS = {
  PROTOCOL: PROTOCOL_CONSTANTS,
  SECURITY: SECURITY_CONSTANTS,
  MEMORY: MEMORY_CONSTANTS,
  CACHE: CACHE_CONSTANTS,
  ENCRYPTION: ENCRYPTION_CONSTANTS,
  VALIDATION: VALIDATION_CONSTANTS,
  BATCH: BATCH_CONSTANTS,
  CONNECTION: CONNECTION_CONSTANTS,
  STORAGE: STORAGE_CONSTANTS,
  TESTING: TESTING_CONSTANTS
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type MainframeConstants = typeof MAINFRAME_CONSTANTS;
export type SecurityConstants = typeof SECURITY_CONSTANTS;
export type CacheConstants = typeof CACHE_CONSTANTS;
export type EncryptionConstants = typeof ENCRYPTION_CONSTANTS;


