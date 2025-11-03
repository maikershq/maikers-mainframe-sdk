import { ZodError } from 'zod';
import { 
  AgentConfigSchema, 
  MainframeConfigSchema, 
  type AgentConfig, 
  type MainframeConfig,
  type ValidationResult 
} from '../types';
import { ErrorFactory, MainframeSDKError } from './errors';
import { VALIDATION_CONSTANTS, ENCRYPTION_CONSTANTS, PROTOCOL_CONSTANTS } from './constants';

/**
 * Configuration validation utilities
 */
export class ConfigValidator {
  /**
   * Validate agent configuration
   */
  static validateAgentConfig(config: AgentConfig): ValidationResult {
    try {
      AgentConfigSchema.parse(config);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });
        return { valid: false, errors };
      }
      return { valid: false, errors: [String(error)] };
    }
  }

  /**
   * Validate mainframe configuration
   */
  static validateMainframeConfig(config: MainframeConfig): ValidationResult {
    try {
      MainframeConfigSchema.parse(config);
      
      // Additional custom validations
      const customErrors: string[] = [];
      
      // Validate RPC endpoint connectivity (basic format check)
      if (!this.isValidRpcEndpoint(config.rpcEndpoint)) {
        customErrors.push('rpcEndpoint: Invalid RPC endpoint format');
      }
      
      // Validate program ID format (optional - has default)
      if (config.programId && !this.isValidPublicKey(config.programId)) {
        customErrors.push('programId: Invalid Solana public key format');
      }
      
      // Validate protocol wallet format (optional - deprecated, fetched from on-chain config)
      if (config.protocolWallet && !this.isValidPublicKey(config.protocolWallet)) {
        customErrors.push('protocolWallet: Invalid Solana public key format (deprecated - fetched from on-chain config)');
      }
      
      // Validate storage configuration
      const storageErrors = this.validateStorageConfig(config);
      customErrors.push(...storageErrors);
      
      if (customErrors.length > 0) {
        return { valid: false, errors: customErrors };
      }
      
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });
        return { valid: false, errors };
      }
      return { valid: false, errors: [String(error)] };
    }
  }

  /**
   * Validate and throw on invalid agent configuration
   */
  static validateAgentConfigStrict(config: AgentConfig): void {
    const result = this.validateAgentConfig(config);
    if (!result.valid) {
      throw ErrorFactory.configValidationFailed(result.errors);
    }
  }

  /**
   * Validate and throw on invalid mainframe configuration
   */
  static validateMainframeConfigStrict(config: MainframeConfig): void {
    const result = this.validateMainframeConfig(config);
    if (!result.valid) {
      throw ErrorFactory.configValidationFailed(result.errors);
    }
  }

  // Public validation helpers
  static isValidRpcEndpoint(endpoint: string): boolean {
    try {
      const url = new URL(endpoint);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  static isValidPublicKey(key: string): boolean {
    // Basic Solana public key validation (base58, length ~44 chars)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(key);
  }

  static validateStorageConfig(config: MainframeConfig): string[] {
    const errors: string[] = [];
    const { storage } = config;

    // Validate Arweave configuration (required)
    if (!storage.arweave?.gateway) {
      errors.push('storage.arweave.gateway is required');
    } else if (!this.isValidUrl(storage.arweave.gateway)) {
      errors.push('storage.arweave.gateway: Invalid URL format');
    }

    return errors;
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Runtime validation utilities
 */
export class RuntimeValidator {
  /**
   * Validate NFT mint address format
   */
  static validateNftMint(mint: string): void {
    if (!mint || typeof mint !== 'string') {
      throw ErrorFactory.invalidConfig('nftMint', mint);
    }
    
    if (!ConfigValidator.isValidPublicKey(mint)) {
      throw ErrorFactory.invalidNFT(mint);
    }
  }

  /**
   * Validate metadata URI format
   */
  static validateMetadataUri(uri: string): void {
    if (!uri || typeof uri !== 'string') {
      throw ErrorFactory.invalidConfig('metadataUri', uri);
    }

    // Check for supported URI schemes
    const supportedSchemes = ['ipfs://', 'ar://', 'https://'];
    const hasValidScheme = supportedSchemes.some(scheme => uri.startsWith(scheme));
    
    if (!hasValidScheme) {
      throw ErrorFactory.invalidConfig(
        'metadataUri', 
        `URI must use one of: ${supportedSchemes.join(', ')}`
      );
    }
  }

  /**
   * Validate account address format
   */
  static validateAccountAddress(address: string, fieldName: string = 'account'): void {
    if (!address || typeof address !== 'string') {
      throw ErrorFactory.invalidConfig(fieldName, address);
    }
    
    if (!ConfigValidator.isValidPublicKey(address)) {
      throw ErrorFactory.invalidConfig(fieldName, 'Invalid Solana address format');
    }
  }

  /**
   * Validate fee amount
   */
  static validateFeeAmount(amount: number, operation: string): void {
    if (typeof amount !== 'number' || amount < 0) {
      throw ErrorFactory.invalidConfig('fee', amount);
    }
    
    // Check for reasonable fee limits (prevent user mistakes)
    if (amount > PROTOCOL_CONSTANTS.MAX_REASONABLE_FEE) {
      throw ErrorFactory.invalidConfig(
        'fee',
        `Fee amount ${amount} seems unusually high for operation: ${operation}`
      );
    }
  }

  /**
   * Validate version number
   */
  static validateVersion(version: number): void {
    if (!Number.isInteger(version) || version < 0) {
      throw ErrorFactory.invalidConfig('version', version);
    }
  }

  /**
   * Validate timestamp
   */
  static validateTimestamp(timestamp: number): void {
    if (!Number.isInteger(timestamp) || timestamp <= 0) {
      throw ErrorFactory.invalidConfig('timestamp', timestamp);
    }
    
    // Check if timestamp is reasonable (not too far in future/past)
    const now = Date.now() / 1000;
    
    if (Math.abs(timestamp - now) > VALIDATION_CONSTANTS.MAX_TIMESTAMP_DIFFERENCE) {
      throw ErrorFactory.invalidConfig(
        'timestamp',
        'Timestamp is more than 1 year from current time'
      );
    }
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent injection attacks
   */
  static sanitizeString(input: string, maxLength: number = VALIDATION_CONSTANTS.MAX_STRING_LENGTH): string {
    if (typeof input !== 'string') {
      throw ErrorFactory.invalidArgument('Input must be a string');
    }
    
    // Remove control characters and normalize
    let sanitized = input
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .normalize('NFC') // Unicode normalization
      .trim();
    
    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize and validate JSON string
   */
  static sanitizeJson(input: string): any {
    try {
      const sanitized = this.sanitizeString(input, VALIDATION_CONSTANTS.MAX_JSON_SIZE);
      return JSON.parse(sanitized);
    } catch (error) {
      throw ErrorFactory.invalidConfig('json', 'Invalid JSON format');
    }
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: any, min?: number, max?: number): number {
    const num = Number(input);
    
    if (!Number.isFinite(num)) {
      throw ErrorFactory.invalidArgument('Input must be a valid number');
    }
    
    if (min !== undefined && num < min) {
      throw ErrorFactory.invalidArgument(`Number must be >= ${min}`);
    }
    
    if (max !== undefined && num > max) {
      throw ErrorFactory.invalidArgument(`Number must be <= ${max}`);
    }
    
    return num;
  }

  /**
   * Sanitize boolean input
   */
  static sanitizeBoolean(input: any): boolean {
    if (typeof input === 'boolean') {
      return input;
    }
    
    if (typeof input === 'string') {
      const lower = input.toLowerCase().trim();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    
    if (typeof input === 'number') {
      return Boolean(input);
    }
    
    throw ErrorFactory.invalidArgument('Input must be convertible to boolean');
  }
}

/**
 * Security validation utilities
 */
export class SecurityValidator {
  /**
   * Validate that sensitive data isn't being logged or transmitted
   */
  static validateNoSensitiveData(data: any, context: string): void {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret/i,
      /private[_-]?key/i,
      /password/i,
      /token/i,
      /auth/i,
      /credential/i
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(dataString)) {
        console.warn(`⚠️ Potential sensitive data detected in ${context}`);
        break;
      }
    }
  }

  /**
   * Validate encryption parameters
   */
  static validateEncryptionParams(
    nonce: Uint8Array,
    key: Uint8Array,
    data: Uint8Array
  ): void {
    // Import sodium for nonce size validation
    const sodium = require('libsodium-wrappers-sumo');
    const expectedNonceSize = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
    
    if (!(nonce instanceof Uint8Array) || nonce.length !== expectedNonceSize) {
      throw ErrorFactory.internalError(`Invalid nonce: must be ${expectedNonceSize} bytes for XChaCha20-Poly1305 AEAD`);
    }
    
    if (!(key instanceof Uint8Array) || key.length !== ENCRYPTION_CONSTANTS.ENCRYPTION_KEY_SIZE) {
      throw ErrorFactory.internalError(`Invalid key: must be ${ENCRYPTION_CONSTANTS.ENCRYPTION_KEY_SIZE} bytes`);
    }
    
    if (!(data instanceof Uint8Array)) {
      throw ErrorFactory.internalError('Invalid data: must be Uint8Array');
    }
    
    // Check for reasonable data size limits
    if (data.length > ENCRYPTION_CONSTANTS.MAX_ENCRYPTION_DATA_SIZE) {
      throw ErrorFactory.internalError('Data too large for encryption');
    }
  }
}
