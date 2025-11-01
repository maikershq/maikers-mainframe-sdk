/**
 * Storage service for Mainframe SDK
 * 
 * Handles direct client-to-storage uploads to maintain zero-knowledge architecture.
 * Uses Arweave for permanent, decentralized storage.
 */

import Arweave from 'arweave';
import type { 
  MainframeConfig, 
  EncryptedMetadata, 
  StorageResult, 
  StorageUpload, 
  UploadOptions,
  CacheOptions 
} from '../types';
import { ErrorFactory, MainframeSDKError } from '../utils/errors';

interface CacheEntry {
  data: EncryptedMetadata;
  timestamp: number;
  ttl: number;
}

export class StorageService {
  private config: MainframeConfig;
  private arweaveClient?: Arweave;
  private cache: Map<string, CacheEntry> = new Map();
  private uploadQueue: Map<string, Promise<StorageResult>> = new Map();

  constructor(config: MainframeConfig) {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Upload encrypted metadata to Arweave
   */
  async uploadMetadata(
    encryptedMetadata: EncryptedMetadata,
    options: UploadOptions = {}
  ): Promise<StorageResult> {
    try {
      // Create metadata with additional fields
      const metadata = {
        ...encryptedMetadata,
        timestamp: Date.now(),
        version: '1.0.0'
      };

      // Generate cache key for deduplication
      const cacheKey = this.generateCacheKey(metadata);
      
      // Check if upload is already in progress
      const existingUpload = this.uploadQueue.get(cacheKey);
      if (existingUpload) {
        return await existingUpload;
      }

      // Start upload process
      const uploadPromise = this.performUpload(metadata, options);
      this.uploadQueue.set(cacheKey, uploadPromise);

      try {
        const result = await uploadPromise;
        
        // Cache the result
        this.cacheMetadata(result.uri, metadata);
        
        return result;
      } finally {
        this.uploadQueue.delete(cacheKey);
      }

    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.uploadFailed('arweave', error as Error);
    }
  }

  /**
   * Fetch encrypted metadata from Arweave URI
   */
  async fetchMetadata(uri: string): Promise<EncryptedMetadata> {
    try {
      // Check cache first
      const cached = this.getFromCache(uri);
      if (cached) {
        return cached;
      }

      // Fetch from Arweave
      const metadata = await this.fetchFromArweave(uri);

      // Cache for future use
      this.cacheMetadata(uri, metadata, { ttl: 3600 });

      return metadata;

    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.fetchFailed(uri, error as Error);
    }
  }

  /**
   * Check if metadata exists at URI
   */
  async exists(uri: string): Promise<boolean> {
    try {
      await this.fetchMetadata(uri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    // Simple implementation - in production you'd track hits/misses
    return {
      size: this.cache.size,
      hits: 0,
      misses: 0
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeClient(): void {
    // Initialize Arweave client
    if (this.config.storage.arweave) {
      try {
        const url = new URL(this.config.storage.arweave.gateway);
        this.arweaveClient = Arweave.init({
          host: url.hostname,
          port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
          protocol: url.protocol.replace(':', ''),
          timeout: 30000
        });
      } catch (error) {
        console.warn('Failed to initialize Arweave client:', error);
      }
    }
  }

  private async performUpload(
    metadata: EncryptedMetadata,
    options: UploadOptions
  ): Promise<StorageResult> {
    const upload = await this.uploadToArweave(metadata, options);

    return {
      primary: upload,
      backups: [],
      uri: this.generateMetadataURI(upload)
    };
  }

  private async uploadToArweave(
    metadata: EncryptedMetadata,
    options: UploadOptions
  ): Promise<StorageUpload> {
    if (!this.arweaveClient) {
      throw ErrorFactory.storageUnavailable('arweave');
    }

    try {
      const content = JSON.stringify(metadata);
      const data = new TextEncoder().encode(content);

      // Create transaction
      const transaction = await this.arweaveClient.createTransaction({
        data
      });

      // Add tags
      transaction.addTag('Content-Type', 'application/json');
      transaction.addTag('App-Name', 'Maikers-Mainframe');
      transaction.addTag('Version', '1.0.0');

      // Sign transaction (would need wallet integration in real implementation)
      // For now, we'll simulate the upload
      
      const upload: StorageUpload = {
        provider: 'arweave',
        txId: transaction.id,
        url: `${this.config.storage.arweave!.gateway}/${transaction.id}`,
        timestamp: Date.now()
      };

      return upload;

    } catch (error) {
      throw ErrorFactory.uploadFailed('arweave', error as Error);
    }
  }

  private async fetchFromArweave(uri: string): Promise<EncryptedMetadata> {
    if (!this.config.storage.arweave) {
      throw ErrorFactory.storageUnavailable('arweave');
    }

    try {
      const txId = this.extractArweaveTxId(uri);
      const response = await fetch(`${this.config.storage.arweave.gateway}/${txId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata = await response.json();
      return metadata as EncryptedMetadata;

    } catch (error) {
      throw ErrorFactory.fetchFailed(uri, error as Error);
    }
  }

  private extractArweaveTxId(uri: string): string {
    if (uri.startsWith('ar://')) {
      return uri.substring(5);
    }
    const match = uri.match(/\/([a-zA-Z0-9_-]{43})\/?$/);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error(`Invalid Arweave URI: ${uri}`);
  }

  private generateMetadataURI(upload: StorageUpload): string {
    return `ar://${upload.txId}`;
  }

  private generateCacheKey(metadata: EncryptedMetadata): string {
    // Generate deterministic key based on content
    const content = JSON.stringify({
      ciphertext: metadata.ciphertext,
      nonce: metadata.nonce,
      ad: metadata.ad
    });
    
    // Simple hash - in production use crypto hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `metadata_${Math.abs(hash).toString(36)}`;
  }

  private cacheMetadata(
    uri: string, 
    metadata: EncryptedMetadata, 
    options: CacheOptions = {}
  ): void {
    const ttl = options.ttl || 3600; // Default 1 hour
    const entry: CacheEntry = {
      data: metadata,
      timestamp: Date.now(),
      ttl: ttl * 1000 // Convert to milliseconds
    };
    
    this.cache.set(uri, entry);
    
    // Cleanup old entries
    this.cleanupCache();
  }

  private getFromCache(uri: string): EncryptedMetadata | null {
    const entry = this.cache.get(uri);
    if (!entry) {
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(uri);
      return null;
    }
    
    return entry.data;
  }

  private cleanupCache(): void {
    const now = Date.now();
    const maxSize = 100; // Maximum cache entries
    
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
    
    // Remove oldest entries if cache is too large
    if (this.cache.size > maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - maxSize);
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// Storage Utilities
// ============================================================================

export class StorageUtils {
  /**
   * Validate Arweave URI format
   */
  static isValidURI(uri: string): boolean {
    const patterns = [
      /^ar:\/\/[a-zA-Z0-9_-]{43}$/,
      /^https?:\/\/.+/
    ];
    
    return patterns.some(pattern => pattern.test(uri));
  }

  /**
   * Get storage provider from URI
   */
  static getProvider(uri: string): 'arweave' | 'http' | 'unknown' {
    if (uri.startsWith('ar://')) return 'arweave';
    if (uri.startsWith('http://') || uri.startsWith('https://')) return 'http';
    return 'unknown';
  }

  /**
   * Estimate Arweave storage cost
   */
  static estimateStorageCost(
    data: any
  ): { size: number; estimatedCost: number; currency: string } {
    const content = JSON.stringify(data);
    const size = new TextEncoder().encode(content).length;
    
    // Simplified Arweave cost estimation
    const costPerKB = 0.005; // Very rough estimate in AR
    const sizeKB = Math.ceil(size / 1024);
    const estimatedCost = sizeKB * costPerKB;
    
    return {
      size,
      estimatedCost,
      currency: 'AR'
    };
  }
}

// ============================================================================
// Mock Storage Service for Development
// ============================================================================

export class MockStorageService extends StorageService {
  private mockStorage: Map<string, EncryptedMetadata> = new Map();

  constructor(config: MainframeConfig) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('MockStorageService can only be used in testing environment');
    }
    super(config);
  }

  async uploadMetadata(
    encryptedMetadata: EncryptedMetadata,
    options: UploadOptions = {}
  ): Promise<StorageResult> {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const mockHash = this.generateMockTxId();
    const uri = `ipfs://${mockHash}`;
    
    // Store in mock storage
    this.mockStorage.set(uri, encryptedMetadata);
    
    const upload: StorageUpload = {
      provider: 'ipfs',
      txId: mockHash,
      url: `https://ipfs.io/ipfs/${mockHash}`,
      timestamp: Date.now()
    };
    
    return {
      primary: upload,
      backups: [],
      uri
    };
  }

  async fetchMetadata(uri: string): Promise<EncryptedMetadata> {
    // Simulate fetch delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const metadata = this.mockStorage.get(uri);
    if (!metadata) {
      throw ErrorFactory.fetchFailed(uri, new Error('Not found in mock storage'));
    }
    
    return metadata;
  }

  private generateMockTxId(): string {
    // Generate a 43-character mock transaction ID similar to Arweave
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    for (let i = 0; i < 43; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}