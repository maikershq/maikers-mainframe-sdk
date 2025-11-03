/**
 * Comprehensive error handling system for Mainframe SDK
 */

export class MainframeSDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'MainframeSDKError';
    
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MainframeSDKError);
    }
  }

  /**
   * Serialize error for logging or transmission
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    };
  }

  /**
   * Check if error is of specific type
   */
  static isMainframeError(error: any): error is MainframeSDKError {
    return error instanceof MainframeSDKError;
  }

  /**
   * Check if error has specific code
   */
  hasCode(code: ErrorCodes): boolean {
    return this.code === code;
  }
}

export enum ErrorCodes {
  // ============================================================================
  // Wallet Errors (1000-1099)
  // ============================================================================
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_INSUFFICIENT_FUNDS = 'WALLET_INSUFFICIENT_FUNDS',
  WALLET_SIGNATURE_REJECTED = 'WALLET_SIGNATURE_REJECTED',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_CONNECTION_FAILED = 'WALLET_CONNECTION_FAILED',
  WALLET_UNSUPPORTED = 'WALLET_UNSUPPORTED',
  WALLET_PERMISSION_DENIED = 'WALLET_PERMISSION_DENIED',

  // ============================================================================
  // Encryption Errors (2000-2099)
  // ============================================================================
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  INVALID_KEYRING = 'INVALID_KEYRING',
  KEY_GENERATION_FAILED = 'KEY_GENERATION_FAILED',
  KEY_DERIVATION_FAILED = 'KEY_DERIVATION_FAILED',
  INVALID_ENCRYPTION_FORMAT = 'INVALID_ENCRYPTION_FORMAT',
  UNSUPPORTED_ENCRYPTION_VERSION = 'UNSUPPORTED_ENCRYPTION_VERSION',
  CRYPTO_LIBRARY_ERROR = 'CRYPTO_LIBRARY_ERROR',

  // ============================================================================
  // Storage Errors (3000-3099)
  // ============================================================================
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  FETCH_FAILED = 'FETCH_FAILED',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  IPFS_ERROR = 'IPFS_ERROR',
  ARWEAVE_ERROR = 'ARWEAVE_ERROR',
  INVALID_STORAGE_URI = 'INVALID_STORAGE_URI',
  STORAGE_TIMEOUT = 'STORAGE_TIMEOUT',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  PINNING_FAILED = 'PINNING_FAILED',

  // ============================================================================
  // Program Errors (4000-4099)
  // ============================================================================
  SDK_NOT_INITIALIZED = 'SDK_NOT_INITIALIZED',
  INVALID_NFT = 'INVALID_NFT',
  AGENT_ALREADY_EXISTS = 'AGENT_ALREADY_EXISTS',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  INSUFFICIENT_FEE = 'INSUFFICIENT_FEE',
  PROTOCOL_PAUSED = 'PROTOCOL_PAUSED',
  UNAUTHORIZED_OPERATION = 'UNAUTHORIZED_OPERATION',
  INVALID_PROGRAM_ID = 'INVALID_PROGRAM_ID',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ACCOUNT_DATA = 'INVALID_ACCOUNT_DATA',
  ANCHOR_ERROR = 'ANCHOR_ERROR',

  // ============================================================================
  // Configuration Errors (5000-5099)
  // ============================================================================
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  UNSUPPORTED_FEATURE = 'UNSUPPORTED_FEATURE',
  INVALID_NETWORK = 'INVALID_NETWORK',
  INVALID_RPC_ENDPOINT = 'INVALID_RPC_ENDPOINT',
  CONFIG_VALIDATION_FAILED = 'CONFIG_VALIDATION_FAILED',
  INCOMPATIBLE_VERSION = 'INCOMPATIBLE_VERSION',

  // ============================================================================
  // Network & Connection Errors (6000-6099)
  // ============================================================================
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INVALID_RESPONSE = 'INVALID_RESPONSE',

  // ============================================================================
  // Agent Errors (7000-7099)
  // ============================================================================
  AGENT_CONFIG_INVALID = 'AGENT_CONFIG_INVALID',
  AGENT_DEPLOYMENT_FAILED = 'AGENT_DEPLOYMENT_FAILED',
  AGENT_ALREADY_PAUSED = 'AGENT_ALREADY_PAUSED',
  AGENT_ALREADY_ACTIVE = 'AGENT_ALREADY_ACTIVE',
  AGENT_CLOSED = 'AGENT_CLOSED',
  PLUGIN_ERROR = 'PLUGIN_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR',

  // ============================================================================
  // Generic Errors (9000-9099)
  // ============================================================================
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
  TIMEOUT = 'TIMEOUT',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT'
}

// ============================================================================
// Error Factory Functions
// ============================================================================

export class ErrorFactory {
  // Wallet Errors
  static walletNotConnected(): MainframeSDKError {
    return new MainframeSDKError(
      'Wallet is not connected. Please connect your wallet first.',
      ErrorCodes.WALLET_NOT_CONNECTED
    );
  }

  static walletInsufficientFunds(required: number, available: number): MainframeSDKError {
    return new MainframeSDKError(
      `Insufficient funds. Required: ${required} SOL, Available: ${available} SOL`,
      ErrorCodes.WALLET_INSUFFICIENT_FUNDS,
      undefined,
      { required, available }
    );
  }

  static walletSignatureRejected(): MainframeSDKError {
    return new MainframeSDKError(
      'Transaction signature was rejected by user.',
      ErrorCodes.WALLET_SIGNATURE_REJECTED
    );
  }

  static walletNotFound(): MainframeSDKError {
    return new MainframeSDKError(
      'No compatible wallet found. Please install a supported Solana wallet.',
      ErrorCodes.WALLET_NOT_CONNECTED
    );
  }

  static walletConnectionFailed(cause?: Error): MainframeSDKError {
    return new MainframeSDKError(
      'Failed to connect to wallet. Please try again.',
      ErrorCodes.WALLET_NOT_CONNECTED,
      cause
    );
  }

  // Program Errors
  static programNotInitialized(): MainframeSDKError {
    return new MainframeSDKError(
      'Program service is not initialized. Please initialize the SDK first.',
      ErrorCodes.SDK_NOT_INITIALIZED
    );
  }

  // Encryption Errors
  static encryptionFailed(cause?: Error): MainframeSDKError {
    return new MainframeSDKError(
      'Failed to encrypt agent configuration.',
      ErrorCodes.ENCRYPTION_FAILED,
      cause
    );
  }

  static decryptionFailed(cause?: Error): MainframeSDKError {
    return new MainframeSDKError(
      'Failed to decrypt agent configuration. Check your wallet access permissions.',
      ErrorCodes.DECRYPTION_FAILED,
      cause
    );
  }

  static invalidKeyring(): MainframeSDKError {
    return new MainframeSDKError(
      'Invalid keyring format or missing access keys.',
      ErrorCodes.INVALID_KEYRING
    );
  }

  // Storage Errors
  static uploadFailed(provider: string, cause?: Error): MainframeSDKError {
    return new MainframeSDKError(
      `Failed to upload to ${provider}. Please check your network connection.`,
      ErrorCodes.UPLOAD_FAILED,
      cause,
      { provider }
    );
  }

  static fetchFailed(uri: string, cause?: Error): MainframeSDKError {
    return new MainframeSDKError(
      `Failed to fetch metadata from ${uri}.`,
      ErrorCodes.FETCH_FAILED,
      cause,
      { uri }
    );
  }

  static storageUnavailable(provider: string): MainframeSDKError {
    return new MainframeSDKError(
      `Storage provider ${provider} is currently unavailable.`,
      ErrorCodes.STORAGE_UNAVAILABLE,
      undefined,
      { provider }
    );
  }

  // Program Errors
  static invalidNFT(mint: string): MainframeSDKError {
    return new MainframeSDKError(
      `Invalid NFT: ${mint}. NFT must be from a verified collection.`,
      ErrorCodes.INVALID_NFT,
      undefined,
      { mint }
    );
  }

  static agentAlreadyExists(agentAccount: string): MainframeSDKError {
    return new MainframeSDKError(
      `Agent already exists for this NFT: ${agentAccount}`,
      ErrorCodes.AGENT_ALREADY_EXISTS,
      undefined,
      { agentAccount }
    );
  }

  static insufficientFee(required: number, provided: number): MainframeSDKError {
    return new MainframeSDKError(
      `Insufficient fee. Required: ${required} lamports, Provided: ${provided} lamports`,
      ErrorCodes.INSUFFICIENT_FEE,
      undefined,
      { required, provided }
    );
  }

  static protocolPaused(): MainframeSDKError {
    return new MainframeSDKError(
      'Protocol is currently paused. Please try again later.',
      ErrorCodes.PROTOCOL_PAUSED
    );
  }

  // Configuration Errors
  static invalidConfig(field: string, value: any): MainframeSDKError {
    return new MainframeSDKError(
      `Invalid configuration for field '${field}': ${value}`,
      ErrorCodes.INVALID_CONFIG,
      undefined,
      { field, value }
    );
  }

  static missingRequiredField(field: string): MainframeSDKError {
    return new MainframeSDKError(
      `Missing required field: ${field}`,
      ErrorCodes.MISSING_REQUIRED_FIELD,
      undefined,
      { field }
    );
  }

  static configValidationFailed(errors: string[]): MainframeSDKError {
    return new MainframeSDKError(
      `Configuration validation failed: ${errors.join(', ')}`,
      ErrorCodes.CONFIG_VALIDATION_FAILED,
      undefined,
      { errors }
    );
  }

  static validationError(message: string, context?: Record<string, any>): MainframeSDKError {
    return new MainframeSDKError(
      message,
      ErrorCodes.INVALID_CONFIG,
      undefined,
      context
    );
  }

  // Network Errors
  static networkError(operation: string, cause?: Error): MainframeSDKError {
    return new MainframeSDKError(
      `Network error during ${operation}. Please check your connection.`,
      ErrorCodes.NETWORK_ERROR,
      cause,
      { operation }
    );
  }

  static rpcError(endpoint: string, cause?: Error): MainframeSDKError {
    return new MainframeSDKError(
      `RPC error from ${endpoint}. The endpoint may be unavailable.`,
      ErrorCodes.RPC_ERROR,
      cause,
      { endpoint }
    );
  }

  // Generic Errors
  static timeout(operation: string, timeoutMs: number): MainframeSDKError {
    return new MainframeSDKError(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      ErrorCodes.TIMEOUT,
      undefined,
      { operation, timeoutMs }
    );
  }

  static internalError(message: string, cause?: Error): MainframeSDKError {
    return new MainframeSDKError(
      `Internal error: ${message}`,
      ErrorCodes.INTERNAL_ERROR,
      cause
    );
  }

  static invalidArgument(message: string): MainframeSDKError {
    return new MainframeSDKError(
      message,
      ErrorCodes.INVALID_ARGUMENT
    );
  }

  static notImplemented(message: string): MainframeSDKError {
    return new MainframeSDKError(
      message,
      ErrorCodes.NOT_IMPLEMENTED
    );
  }
}

// ============================================================================
// Error Type Guards
// ============================================================================

export class ErrorUtils {
  /**
   * Check if error is recoverable (user can retry)
   */
  static isRecoverable(error: MainframeSDKError): boolean {
    const recoverableCodes = [
      ErrorCodes.NETWORK_ERROR,
      ErrorCodes.RPC_ERROR,
      ErrorCodes.CONNECTION_TIMEOUT,
      ErrorCodes.STORAGE_UNAVAILABLE,
      ErrorCodes.UPLOAD_FAILED,
      ErrorCodes.FETCH_FAILED,
      ErrorCodes.SERVICE_UNAVAILABLE
    ];
    return recoverableCodes.includes(error.code as ErrorCodes);
  }

  /**
   * Check if error requires user action
   */
  static requiresUserAction(error: MainframeSDKError): boolean {
    const userActionCodes = [
      ErrorCodes.WALLET_NOT_CONNECTED,
      ErrorCodes.WALLET_INSUFFICIENT_FUNDS,
      ErrorCodes.WALLET_SIGNATURE_REJECTED,
      ErrorCodes.INVALID_CONFIG,
      ErrorCodes.MISSING_REQUIRED_FIELD,
      ErrorCodes.AGENT_CONFIG_INVALID
    ];
    return userActionCodes.includes(error.code as ErrorCodes);
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: MainframeSDKError): string {
    const userMessages: Record<string, string> = {
      [ErrorCodes.WALLET_NOT_CONNECTED]: 'Please connect your wallet to continue.',
      [ErrorCodes.WALLET_INSUFFICIENT_FUNDS]: 'Insufficient SOL balance. Please add funds to your wallet.',
      [ErrorCodes.WALLET_SIGNATURE_REJECTED]: 'Transaction was cancelled. Please try again and approve the transaction.',
      [ErrorCodes.NETWORK_ERROR]: 'Network connection issue. Please check your internet and try again.',
      [ErrorCodes.STORAGE_UNAVAILABLE]: 'Storage service is temporarily unavailable. Please try again later.',
      [ErrorCodes.PROTOCOL_PAUSED]: 'The protocol is temporarily paused for maintenance. Please try again later.',
      [ErrorCodes.AGENT_ALREADY_EXISTS]: 'An agent is already associated with this NFT.',
      [ErrorCodes.INVALID_NFT]: 'This NFT is not from a supported collection.',
      [ErrorCodes.INSUFFICIENT_FEE]: 'Transaction fee is insufficient. Please increase the fee amount.'
    };

    return userMessages[error.code] || error.message;
  }

  /**
   * Convert any error to MainframeSDKError
   */
  static wrap(error: unknown, context?: Record<string, any>): MainframeSDKError {
    if (MainframeSDKError.isMainframeError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new MainframeSDKError(
        error.message,
        ErrorCodes.UNKNOWN_ERROR,
        error,
        context
      );
    }

    return new MainframeSDKError(
      `Unknown error: ${String(error)}`,
      ErrorCodes.UNKNOWN_ERROR,
      undefined,
      { originalError: error, ...context }
    );
  }
}

// ============================================================================
// Error Reporting
// ============================================================================

export interface ErrorReporter {
  report(error: MainframeSDKError): Promise<void>;
}

export class ConsoleErrorReporter implements ErrorReporter {
  async report(error: MainframeSDKError): Promise<void> {
    console.error('[MainframeSDK Error]', {
      code: error.code,
      message: error.message,
      context: error.context,
      stack: error.stack
    });
  }
}

export class ErrorLogger {
  private reporters: ErrorReporter[] = [];

  addReporter(reporter: ErrorReporter): void {
    this.reporters.push(reporter);
  }

  async logError(error: MainframeSDKError): Promise<void> {
    await Promise.allSettled(
      this.reporters.map(reporter => reporter.report(error))
    );
  }
}

// Default error logger instance
export const defaultErrorLogger = new ErrorLogger();
defaultErrorLogger.addReporter(new ConsoleErrorReporter());
