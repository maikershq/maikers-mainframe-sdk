/**
 * Client-side encryption service for Mainframe SDK
 *
 * Implements zero-knowledge architecture where sensitive agent configurations
 * are encrypted locally and never transmitted unencrypted to Maikers infrastructure.
 *
 * Uses XChaCha20-Poly1305 AEAD encryption with dual access pattern:
 * - User wallet can decrypt for management operations
 * - Protocol wallet can decrypt for agent execution
 */

import sodium from 'libsodium-wrappers-sumo';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import type { AgentConfig, SecureBlock, EncryptedMetadata, MainframeConfig, WalletInfo } from '../types';
import { ErrorFactory, MainframeSDKError } from '../utils/errors';
import { SecurityValidator } from '../utils/validation';

export class EncryptionService {
  private config: MainframeConfig;
  private isReady: boolean = false;

  constructor(config: MainframeConfig) {
    this.config = config;
  }

  /**
   * Initialize the encryption service
   */
  async initialize(): Promise<void> {
    try {
      await sodium.ready;
      this.isReady = true;
    } catch (error) {
      throw ErrorFactory.internalError('Failed to initialize crypto library', error as Error);
    }
  }

  /**
   * Initialize sodium for synchronous usage
   */
  private async initSodium(): Promise<void> {
    await sodium.ready;
  }

  /**
   * Build secure encrypted block with dual wallet access (PoC Compatible)
   */
  async buildSecure(
    mintAddressBase58: string,
    userWallet: WalletInfo,
    mainframeWallet: WalletInfo,
    agentConfig: AgentConfig | string
  ): Promise<SecureBlock> {
    await sodium.ready;

    const configJson = typeof agentConfig === 'string' ? agentConfig : JSON.stringify(agentConfig, null, 2);
    const pt = new TextEncoder().encode(configJson);
    
    // Both user and Mainframe protocol wallets get access
    const recipients = [userWallet.publicKey, mainframeWallet.publicKey];

    const contentKey = sodium.randombytes_buf(32);
    const nonce = sodium.randombytes_buf(
      sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
    );
    const adStr = `mint:${mintAddressBase58}`;
    const ad = new TextEncoder().encode(adStr);

    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      pt, ad, null, nonce, contentKey
    );

    const keyring: Record<string, string> = {};
    for (const addr of recipients) {
      const edPk = Uint8Array.from(bs58.decode(addr)); // 32 bytes
      if (edPk.length !== 32) throw new Error(`Bad Solana address: ${addr}`);
      const curvePk = sodium.crypto_sign_ed25519_pk_to_curve25519(edPk);
      const sealed = sodium.crypto_box_seal(contentKey, curvePk);
      keyring[addr] = `base64:${sodium.to_base64(sealed)}`;
    }

    return {
      ver: 1,
      aead: 'xchacha20poly1305-ietf',
      ad: adStr,
      nonce: `base64:${sodium.to_base64(nonce)}`,
      ciphertext: `base64:${sodium.to_base64(ciphertext)}`,
      keyring
    };
  }

  /**
   * Helper to decode base64 with prefix
   */
  private b64in(s: string): Uint8Array {
    return sodium.from_base64(s.replace(/^base64:/, ''));
  }

  /**
   * Decrypt secure block using wallet (PoC Compatible)
   */
  async decryptSecure(
    secure: SecureBlock,
    wallet: WalletInfo,
    expectedMint?: string
  ): Promise<AgentConfig> {
    await sodium.ready;

    // Get Ed25519 keys from wallet
    const secretKeyBytes = bs58.decode(wallet.secretKey);
    const edSk = secretKeyBytes;
    const edPk = bs58.decode(wallet.publicKey);

    // Validate key lengths
    if (edSk.length !== 64 && edSk.length !== 32) {
      throw new Error('Invalid secret key length');
    }
    if (edPk.length !== 32) {
      throw new Error('Invalid public key length');
    }

    // Handle 32-byte seed vs 64-byte secret key
    let fullSecretKey = edSk;
    if (edSk.length === 32) {
      const kp = sodium.crypto_sign_seed_keypair(edSk);
      fullSecretKey = kp.privateKey; // 64 bytes
    }

    // Find sealed content key for this wallet
    const myAddr = wallet.publicKey;
    const sealedB64 = secure.keyring[myAddr];
    if (!sealedB64) {
      throw new Error(`Not authorized: no sealed key for wallet ${myAddr}`);
    }

    // Convert to X25519 and open sealed box
    const curveSk = sodium.crypto_sign_ed25519_sk_to_curve25519(fullSecretKey);
    const curvePk = sodium.crypto_sign_ed25519_pk_to_curve25519(edPk);
    const contentKey = sodium.crypto_box_seal_open(this.b64in(sealedB64), curvePk, curveSk);

    // Optional mint binding check
    if (expectedMint && secure.ad !== `mint:${expectedMint}`) {
      throw new Error('Mint mismatch');
    }

    // Decrypt payload
    const nonce = this.b64in(secure.nonce);
    const ct = this.b64in(secure.ciphertext);
    const ad = new TextEncoder().encode(secure.ad);

    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null, ct, ad, nonce, contentKey
    );
    
    const configJson = new TextDecoder().decode(plaintext);
    return JSON.parse(configJson) as AgentConfig;
  }

  /**
   * Create sample agent configuration (PoC Compatible)
   */
  createSampleAgentConfig(agentType: string = 'DeFi Trading Assistant'): AgentConfig {
    const configs: Record<string, AgentConfig> = {
      'DeFi Trading Assistant': {
        name: agentType,
        description: 'Automated DeFi trading bot for Solana protocols',
        purpose: 'Execute automated DeFi trading strategies with risk management',
        personality: {
          traits: ['analytical', 'risk-aware', 'efficient'],
          style: 'professional'
        },
        capabilities: [{
          type: 'defi',
          plugins: ['jupiter-swap', 'orca-pools'],
          config: {
            maxSlippage: 0.5,
            minLiquidity: 10000
          }
        }],
        framework: 'elizaOS',
        plugins: [
          {
            id: 'jupiter-swap',
            version: '1.0.0',
            enabled: true,
            config: { apiKey: 'your-jupiter-key' },
            permissions: ['trade', 'quote']
          }
        ],
        runtime: {
          memory: { type: 'redis', ttl: 3600 },
          scheduling: { enabled: true, interval: 60000 },
          monitoring: { enabled: true, alerts: true }
        },
        permissions: {
          maxTradeSize: '1000 USDC',
          allowedTokens: ['SOL', 'USDC', 'USDT'],
          tradingHours: { start: '09:00', end: '17:00', timezone: 'UTC' }
        },
        preferences: {
          notifications: true,
          riskLevel: 'medium',
          autoRebalance: true
        }
      },
      'Content Creator': {
        name: agentType,
        description: 'AI-powered content creation assistant',
        purpose: 'Generate and manage social media content for Web3 projects',
        personality: {
          traits: ['creative', 'engaging', 'knowledgeable'],
          style: 'friendly'
        },
        capabilities: [{
          type: 'social',
          plugins: ['content-generation', 'social-media'],
          config: {
            platforms: ['Twitter', 'Discord'],
            tone: 'professional'
          }
        }],
        framework: 'elizaOS',
        plugins: [
          {
            id: 'content-generation',
            version: '1.0.0',
            enabled: true,
            config: { openai: '' },
            permissions: ['generate', 'schedule']
          }
        ],
        runtime: {
          memory: { type: 'memory' },
          scheduling: { enabled: true, interval: 3600000 },
          monitoring: { enabled: true }
        },
        permissions: {
          maxRequestsPerMinute: 60,
          allowedEndpoints: ['api.openai.com', 'api.twitter.com']
        },
        preferences: {
          notifications: true,
          riskLevel: 'low'
        }
      }
    };

    return configs[agentType] || configs['DeFi Trading Assistant']!;
  }

  /**
   * Test encryption/decryption flow (PoC Compatible)
   */
  async testEncryptionFlow(
    mintAddress: string,
    userWallet: WalletInfo,
    mainframeWallet: WalletInfo,
    unauthorizedWallet: WalletInfo
  ): Promise<void> {
    console.log('\n🔐 Testing encryption/decryption flow...');

    // Create sample config
    const agentConfig = this.createSampleAgentConfig('DeFi Trading Assistant');
    console.log('📋 Original agent config:', JSON.stringify(agentConfig, null, 2));

    // Encrypt with dual access
    const secureBlock = await this.buildSecure(mintAddress, userWallet, mainframeWallet, agentConfig);
    console.log('🔒 Encrypted secure block created with keyring for:', Object.keys(secureBlock.keyring));

    // Test authorized access - User wallet
    try {
      const decryptedByUser = await this.decryptSecure(secureBlock, userWallet, mintAddress);
      console.log('✅ User wallet successfully decrypted agent config');
      console.log('📋 Decrypted purpose:', decryptedByUser.purpose);
    } catch (error: any) {
      console.error('❌ User wallet decryption failed:', error?.message || error);
    }

    // Test authorized access - Mainframe wallet
    try {
      const decryptedByMainframe = await this.decryptSecure(secureBlock, mainframeWallet, mintAddress);
      console.log('✅ Mainframe wallet successfully decrypted agent config');
      console.log('📋 Decrypted capabilities:', decryptedByMainframe.capabilities.map(c => c.type));
    } catch (error: any) {
      console.error('❌ Mainframe wallet decryption failed:', error?.message || error);
    }

    // Test unauthorized access - Should fail
    try {
      await this.decryptSecure(secureBlock, unauthorizedWallet, mintAddress);
      console.error('❌ SECURITY ISSUE: Unauthorized wallet should not be able to decrypt!');
    } catch (error: any) {
      console.log('✅ Unauthorized wallet correctly blocked:', error?.message || error);
    }
  }

  /**
   * Encrypt agent configuration with dual access pattern (Legacy Support)
   * 
   * @param config Agent configuration to encrypt
   * @param userWallet User's wallet public key (base58)
   * @param nftMint NFT mint address for binding
   * @returns Encrypted metadata with dual access keyring
   */
  async encryptAgentConfig(
    config: AgentConfig,
    userWallet: string,
    nftMint: string
  ): Promise<EncryptedMetadata> {
    this.ensureReady();
    
    try {
      // Validate inputs
      this.validateInputs(config, userWallet, nftMint);
      
      // Generate content key for encryption
      const contentKey = this.generateContentKey();
      
      // Prepare payload
      const payload = JSON.stringify(config);
      const payloadBytes = new TextEncoder().encode(payload);
      
      // Generate nonce for AEAD
      const nonce = this.generateNonce();
      
      // Create associated data for NFT binding
      const ad = `mint:${nftMint}`;
      const adBytes = new TextEncoder().encode(ad);
      
        // Encrypt the payload using XChaCha20-Poly1305
        const ciphertext = this.encryptAEAD(payloadBytes, contentKey, nonce, adBytes);
        
        // Create keyring for dual access
        const keyring = await this.createKeyring(contentKey, [
          userWallet,
          this.config.protocolWallet
        ]);
        
        const encryptedMetadata: EncryptedMetadata = {
          ver: 1,
          aead: 'xchacha20poly1305-ietf',
          ad,
          nonce: sodium.to_base64(nonce),
          ciphertext: sodium.to_base64(ciphertext),
          keyring,
          timestamp: Date.now(),
          version: '1.0.0'
        };
      
      // Security check: ensure no sensitive data in metadata
      SecurityValidator.validateNoSensitiveData(
        { ...encryptedMetadata, keyring: {} }, // Exclude keyring from check
        'encrypted metadata'
      );
      
      return encryptedMetadata;
      
    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.encryptionFailed(error as Error);
    }
  }

  /**
   * Decrypt agent configuration
   * 
   * @param encrypted Encrypted metadata
   * @param walletSecretKey Wallet's secret key for decryption
   * @returns Decrypted agent configuration
   */
  async decryptAgentConfig(
    encrypted: EncryptedMetadata,
    walletSecretKey: Uint8Array
  ): Promise<AgentConfig> {
    this.ensureReady();
    
    try {
      // Validate encrypted metadata format
      this.validateEncryptedMetadata(encrypted);
      
      // Handle both 32-byte seed and 64-byte secret key formats
      let fullSecretKey = walletSecretKey;
      let walletPublicKey: Uint8Array;
      
      if (walletSecretKey.length === 32) {
        // If we have a 32-byte seed, derive the full keypair
        const keypair = sodium.crypto_sign_seed_keypair(walletSecretKey);
        fullSecretKey = keypair.privateKey; // 64 bytes
        walletPublicKey = keypair.publicKey; // 32 bytes
      } else if (walletSecretKey.length === 64) {
        // Extract public key from 64-byte secret key (last 32 bytes)
        walletPublicKey = walletSecretKey.slice(32);
      } else {
        throw ErrorFactory.invalidArgument('Invalid secret key length. Must be 32 or 64 bytes.');
      }
      
      const walletAddress = bs58.encode(walletPublicKey);
      
      // Unwrap content key using wallet's secret key
      const contentKey = await this.unwrapContentKey(
        encrypted.keyring,
        fullSecretKey,
        walletAddress
      );
      
      // Decrypt the ciphertext
      const ciphertext = sodium.from_base64(encrypted.ciphertext);
      const nonce = sodium.from_base64(encrypted.nonce);
      const adBytes = new TextEncoder().encode(encrypted.ad);
      
      const plaintext = this.decryptAEAD(ciphertext, contentKey, nonce, adBytes);
      
      // Parse and return the configuration
      const configJson = new TextDecoder().decode(plaintext);
      const config = JSON.parse(configJson) as AgentConfig;
      
      return config;
      
    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.decryptionFailed(error as Error);
    }
  }

  /**
   * Re-encrypt configuration for key rotation
   */
  async rotateKeys(
    encrypted: EncryptedMetadata,
    oldWalletSecretKey: Uint8Array,
    newUserWallet: string
  ): Promise<EncryptedMetadata> {
    // Decrypt with old key
    const config = await this.decryptAgentConfig(encrypted, oldWalletSecretKey);
    
    // Extract NFT mint from associated data
    const nftMint = encrypted.ad.replace('mint:', '');
    
    // Re-encrypt with new user wallet
    return await this.encryptAgentConfig(config, newUserWallet, nftMint);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureReady(): void {
    if (!this.isReady) {
      throw ErrorFactory.internalError('Encryption service not initialized');
    }
  }

  private validateInputs(config: AgentConfig, userWallet: string, nftMint: string): void {
    if (!config) {
      throw ErrorFactory.invalidConfig('config', 'Agent configuration is required');
    }
    
    if (!userWallet) {
      throw ErrorFactory.invalidConfig('userWallet', 'User wallet is required');
    }
    
    if (!nftMint) {
      throw ErrorFactory.invalidConfig('nftMint', 'NFT mint is required');
    }
    
    // Validate wallet format
    try {
      new PublicKey(userWallet);
    } catch {
      throw ErrorFactory.invalidConfig('userWallet', 'Invalid wallet public key format');
    }
    
    // Validate NFT mint format
    try {
      new PublicKey(nftMint);
    } catch {
      throw ErrorFactory.invalidConfig('nftMint', 'Invalid NFT mint format');
    }
  }

  private validateEncryptedMetadata(encrypted: EncryptedMetadata): void {
    if (!encrypted || typeof encrypted !== 'object') {
      throw ErrorFactory.invalidKeyring();
    }
    
    const required = ['ver', 'aead', 'ad', 'nonce', 'ciphertext', 'keyring'];
    for (const field of required) {
      if (!(field in encrypted)) {
        throw ErrorFactory.invalidKeyring();
      }
    }
    
    if (encrypted.ver !== 1) {
      throw ErrorFactory.internalError('Unsupported encryption version');
    }
    
    if (encrypted.aead !== 'xchacha20poly1305-ietf') {
      throw ErrorFactory.internalError('Unsupported encryption algorithm');
    }
  }

  private generateContentKey(): Uint8Array {
    return sodium.randombytes_buf(32); // 256-bit key for XChaCha20
  }

  private generateNonce(): Uint8Array {
    return sodium.randombytes_buf(
      sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
    ); // Proper nonce size for XChaCha20-Poly1305 AEAD
  }

  private encryptAEAD(
    plaintext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
    additionalData: Uint8Array
  ): Uint8Array {
    SecurityValidator.validateEncryptionParams(nonce, key, plaintext);
    
    try {
      // Use XChaCha20-Poly1305 AEAD encryption
      // libsodium-wrappers-sumo includes XChaCha20-Poly1305 support
      const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext,
        additionalData,
        null, // nsec not used
        nonce,
        key
      );
      return ciphertext;
    } catch (error) {
      throw ErrorFactory.encryptionFailed(error as Error);
    }
  }

  private decryptAEAD(
    ciphertext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
    additionalData: Uint8Array
  ): Uint8Array {
    SecurityValidator.validateEncryptionParams(nonce, key, ciphertext);
    
    try {
      // Use XChaCha20-Poly1305 AEAD decryption
      const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null, // nsec not used
        ciphertext,
        additionalData,
        nonce,
        key
      );
      return plaintext;
    } catch (error) {
      throw ErrorFactory.decryptionFailed(error as Error);
    }
  }

  private async createKeyring(
    contentKey: Uint8Array,
    wallets: string[]
  ): Promise<Record<string, string>> {
    const keyring: Record<string, string> = {};
    
    for (const wallet of wallets) {
      try {
        // Convert Ed25519 public key to Curve25519 for encryption
        const publicKey = this.ed25519ToCurve25519(bs58.decode(wallet));
        
        // Seal the content key for this wallet
        const sealedKey = sodium.crypto_box_seal(contentKey, publicKey);
        
        keyring[wallet] = `base64:${sodium.to_base64(sealedKey)}`;
      } catch (error) {
        throw ErrorFactory.keyDerivationFailed(
          `Failed to create keyring entry for wallet: ${wallet}`,
          error as Error
        );
      }
    }
    
    return keyring;
  }

  private async unwrapContentKey(
    keyring: Record<string, string>,
    walletSecretKey: Uint8Array,
    walletAddress: string
  ): Promise<Uint8Array> {
    if (!keyring[walletAddress]) {
      throw ErrorFactory.invalidKeyring();
    }
    
    try {
      const sealedKeyB64 = keyring[walletAddress];
      
      // Extract base64 data
      if (!sealedKeyB64.startsWith('base64:')) {
        throw new Error('Invalid keyring format');
      }
      
      const sealedKey = sodium.from_base64(sealedKeyB64.substring(7));
      
      // Convert Ed25519 secret key to Curve25519
      const curveSecretKey = this.ed25519ToCurve25519Secret(walletSecretKey);
      
      // Derive Curve25519 public key from the Ed25519 public key (stored in wallet address)
      const ed25519PublicKey = bs58.decode(walletAddress);
      const curvePublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(ed25519PublicKey);
      
      // Open the sealed box
      const contentKey = sodium.crypto_box_seal_open(sealedKey, curvePublicKey, curveSecretKey);
      
      return contentKey;
    } catch (error) {
      throw ErrorFactory.decryptionFailed(error as Error);
    }
  }

  private ed25519ToCurve25519(ed25519PublicKey: Uint8Array): Uint8Array {
    // Ed25519 to Curve25519 conversion using libsodium
    if (ed25519PublicKey.length !== 32) {
      throw new Error('Invalid Ed25519 public key length');
    }
    
    try {
      // Use libsodium's secure Ed25519 to Curve25519 conversion
      return sodium.crypto_sign_ed25519_pk_to_curve25519(ed25519PublicKey);
    } catch (error) {
      throw ErrorFactory.keyDerivationFailed(
        'Failed to convert Ed25519 public key to Curve25519',
        error as Error
      );
    }
  }

  private ed25519ToCurve25519Secret(ed25519SecretKey: Uint8Array): Uint8Array {
    // Ed25519 to Curve25519 secret key conversion using libsodium
    if (ed25519SecretKey.length !== 64 && ed25519SecretKey.length !== 32) {
      throw new Error('Invalid Ed25519 secret key length');
    }
    
    try {
      // Handle both 32-byte seed and 64-byte secret key formats
      let fullSecretKey = ed25519SecretKey;
      if (ed25519SecretKey.length === 32) {
        // If we have a 32-byte seed, derive the full keypair
        const keypair = sodium.crypto_sign_seed_keypair(ed25519SecretKey);
        fullSecretKey = keypair.privateKey; // 64 bytes
      }
      
      // Use libsodium's secure Ed25519 to Curve25519 secret key conversion
      return sodium.crypto_sign_ed25519_sk_to_curve25519(fullSecretKey);
    } catch (error) {
      throw ErrorFactory.keyDerivationFailed(
        'Failed to convert Ed25519 secret key to Curve25519',
        error as Error
      );
    }
  }
}

// ============================================================================
// Encryption Utilities
// ============================================================================

export class EncryptionUtils {
  /**
   * Generate a secure random string for IDs, nonces, etc.
   */
  static generateId(length: number = 16): string {
    const bytes = sodium.randombytes_buf(length);
    return sodium.to_base64(bytes).replace(/[+/]/g, '').substring(0, length);
  }

  /**
   * Derive a deterministic key from a seed
   */
  static deriveKey(seed: string, salt: string = 'mainframe-sdk'): Uint8Array {
    const seedBytes = new TextEncoder().encode(seed + salt);
    // Simple key derivation - in production use proper PBKDF2 or similar
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      hash[i] = (seedBytes[i % seedBytes.length] || 0) ^ (i * 17);
    }
    return hash;
  }

  /**
   * Securely compare two byte arrays
   */
  static constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= (a[i] || 0) ^ (b[i] || 0);
    }
    
    return result === 0;
  }

  /**
   * Validate encryption format version
   */
  static validateVersion(version: number): boolean {
    return version === 1; // Currently only support version 1
  }
}

// Add missing error factory methods
declare module '../utils/errors' {
  namespace ErrorFactory {
    function keyDerivationFailed(message: string, cause?: Error): MainframeSDKError;
  }
}

// Extend ErrorFactory with missing methods
Object.assign(ErrorFactory, {
  keyDerivationFailed(message: string, cause?: Error): MainframeSDKError {
    return new MainframeSDKError(
      message,
      'KEY_DERIVATION_FAILED', 
      cause
    );
  }
});
