/**
 * Comprehensive Encryption Security Audit Tests
 * 
 * This test suite validates the encryption implementation against security best practices:
 * 1. XChaCha20-Poly1305 AEAD encryption
 * 2. Proper key generation and derivation
 * 3. Unique nonce generation
 * 4. NFT binding via associated data
 * 5. Dual-wallet access control
 * 6. Protection against tampering
 * 7. Key rotation capabilities
 */

import { EncryptionService } from '../src/services/encryption';
import type { AgentConfig, EncryptedMetadata, MainframeConfig, WalletInfo } from '../src/types';
import sodium from 'libsodium-wrappers-sumo';
import bs58 from 'bs58';
import { PublicKey, Keypair } from '@solana/web3.js';

describe('Encryption Security Audit', () => {
  let encryptionService: EncryptionService;
  let userWallet: WalletInfo;
  let protocolWallet: WalletInfo;
  let unauthorizedWallet: WalletInfo;
  let config: MainframeConfig;

  beforeAll(async () => {
    await sodium.ready;

    // Generate test wallets
    const userKp = Keypair.generate();
    const protocolKp = Keypair.generate();
    const unauthorizedKp = Keypair.generate();

    userWallet = {
      publicKey: userKp.publicKey.toBase58(),
      secretKey: bs58.encode(userKp.secretKey),
      keypair: userKp
    };

    protocolWallet = {
      publicKey: protocolKp.publicKey.toBase58(),
      secretKey: bs58.encode(protocolKp.secretKey),
      keypair: protocolKp
    };

    unauthorizedWallet = {
      publicKey: unauthorizedKp.publicKey.toBase58(),
      secretKey: bs58.encode(unauthorizedKp.secretKey),
      keypair: unauthorizedKp
    };

    config = {
      solanaNetwork: 'devnet',
      rpcEndpoint: 'https://api.devnet.solana.com',
      programId: '11111111111111111111111111111111',
      protocolWallet: protocolWallet.publicKey,
      storage: { primary: 'arweave' }
    };

    encryptionService = new EncryptionService(config);
    await encryptionService.initialize();
  });

  const createTestAgentConfig = (): AgentConfig => ({
    name: 'Test Agent',
    description: 'Security audit test agent',
    purpose: 'Testing encryption security',
    personality: {
      traits: ['analytical'],
      style: 'professional'
    },
    capabilities: [{
      type: 'defi',
      plugins: ['test-plugin'],
      config: {}
    }],
    framework: 'elizaOS',
    plugins: [{
      id: 'test-plugin',
      version: '1.0.0',
      enabled: true,
      config: { apiKey: 'sensitive-api-key-12345' },
      permissions: ['execute']
    }],
    runtime: {
      memory: { type: 'memory' },
      scheduling: { enabled: false },
      monitoring: { enabled: false }
    },
    permissions: {},
    preferences: {
      notifications: false,
      riskLevel: 'medium'
    }
  });

  describe('1. Encryption Algorithm Security', () => {
    it('should use XChaCha20-Poly1305 AEAD encryption', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const encrypted = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet.publicKey,
        nftMint
      );

      expect(encrypted.aead).toBe('xchacha20poly1305-ietf');
      expect(encrypted.ver).toBe(1);
    });

    it('should generate proper nonce size for XChaCha20', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const encrypted = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet.publicKey,
        nftMint
      );

      const nonceBytes = sodium.from_base64(encrypted.nonce);
      expect(nonceBytes.length).toBe(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
      expect(nonceBytes.length).toBe(24); // XChaCha20 nonce size
    });

    it('should generate unique nonces for each encryption', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const encrypted1 = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet.publicKey,
        nftMint
      );

      const encrypted2 = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet.publicKey,
        nftMint
      );

      expect(encrypted1.nonce).not.toBe(encrypted2.nonce);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });
  });

  describe('2. Data Confidentiality', () => {
    it('should ensure ciphertext does not contain plaintext', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const encrypted = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet.publicKey,
        nftMint
      );

      const ciphertext = encrypted.ciphertext;
      
      // Sensitive data should NOT be in ciphertext
      expect(ciphertext).not.toContain(agentConfig.name);
      expect(ciphertext).not.toContain(agentConfig.description);
      expect(ciphertext).not.toContain(agentConfig.plugins[0]?.config.apiKey);
      expect(ciphertext).not.toContain('sensitive-api-key');
    });

    it('should produce different ciphertext for same plaintext with different nonces', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const results = await Promise.all([
        encryptionService.encryptAgentConfig(agentConfig, userWallet.publicKey, nftMint),
        encryptionService.encryptAgentConfig(agentConfig, userWallet.publicKey, nftMint),
        encryptionService.encryptAgentConfig(agentConfig, userWallet.publicKey, nftMint)
      ]);

      expect(results[0].ciphertext).not.toBe(results[1].ciphertext);
      expect(results[1].ciphertext).not.toBe(results[2].ciphertext);
      expect(results[0].ciphertext).not.toBe(results[2].ciphertext);
    });
  });

  describe('3. NFT Binding via Associated Data', () => {
    it('should bind encryption to specific NFT mint', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const encrypted = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet.publicKey,
        nftMint
      );

      expect(encrypted.ad).toBe(`mint:${nftMint}`);
    });

    it('should fail decryption with tampered associated data', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const secureBlock = await encryptionService.buildSecure(
        nftMint,
        userWallet,
        protocolWallet,
        agentConfig
      );

      // Tamper with associated data
      const tamperedBlock = {
        ...secureBlock,
        ad: `mint:${Keypair.generate().publicKey.toBase58()}`
      };

      await expect(
        encryptionService.decryptSecure(tamperedBlock, userWallet, nftMint)
      ).rejects.toThrow();
    });
  });

  describe('4. Authentication and Integrity (AEAD)', () => {
    it('should detect tampering with ciphertext', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const secureBlock = await encryptionService.buildSecure(
        nftMint,
        userWallet,
        protocolWallet,
        agentConfig
      );

      // Tamper with ciphertext
      const ctBytes = sodium.from_base64(secureBlock.ciphertext.replace('base64:', ''));
      if (ctBytes[0] !== undefined) ctBytes[0] ^= 1; // Flip one bit
      const tamperedBlock = {
        ...secureBlock,
        ciphertext: `base64:${sodium.to_base64(ctBytes)}`
      };

      await expect(
        encryptionService.decryptSecure(tamperedBlock, userWallet)
      ).rejects.toThrow();
    });

    it('should detect tampering with nonce', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const secureBlock = await encryptionService.buildSecure(
        nftMint,
        userWallet,
        protocolWallet,
        agentConfig
      );

      // Tamper with nonce
      const nonceBytes = sodium.from_base64(secureBlock.nonce.replace('base64:', ''));
      if (nonceBytes[0] !== undefined) nonceBytes[0] ^= 1;
      const tamperedBlock = {
        ...secureBlock,
        nonce: `base64:${sodium.to_base64(nonceBytes)}`
      };

      await expect(
        encryptionService.decryptSecure(tamperedBlock, userWallet)
      ).rejects.toThrow();
    });
  });

  describe('5. Dual-Wallet Access Control', () => {
    it('should grant access to user wallet', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const secureBlock = await encryptionService.buildSecure(
        nftMint,
        userWallet,
        protocolWallet,
        agentConfig
      );

      const decrypted = await encryptionService.decryptSecure(
        secureBlock,
        userWallet,
        nftMint
      );

      expect(decrypted).toEqual(agentConfig);
    });

    it('should grant access to protocol wallet', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const secureBlock = await encryptionService.buildSecure(
        nftMint,
        userWallet,
        protocolWallet,
        agentConfig
      );

      const decrypted = await encryptionService.decryptSecure(
        secureBlock,
        protocolWallet,
        nftMint
      );

      expect(decrypted).toEqual(agentConfig);
    });

    it('should deny access to unauthorized wallet', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const secureBlock = await encryptionService.buildSecure(
        nftMint,
        userWallet,
        protocolWallet,
        agentConfig
      );

      await expect(
        encryptionService.decryptSecure(secureBlock, unauthorizedWallet, nftMint)
      ).rejects.toThrow(/not authorized|no sealed key/i);
    });

    it('should have keyring entries for both wallets', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const secureBlock = await encryptionService.buildSecure(
        nftMint,
        userWallet,
        protocolWallet,
        agentConfig
      );

      expect(secureBlock.keyring).toHaveProperty(userWallet.publicKey);
      expect(secureBlock.keyring).toHaveProperty(protocolWallet.publicKey);
      expect(Object.keys(secureBlock.keyring)).toHaveLength(2);
    });
  });

  describe('6. Key Generation and Derivation', () => {
    it('should use crypto-secure random for content keys', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const results = await Promise.all(
        Array(10).fill(null).map(() =>
          encryptionService.encryptAgentConfig(
            agentConfig,
            userWallet.publicKey,
            nftMint
          )
        )
      );

      // All ciphertexts should be different due to unique keys/nonces
      const ciphertexts = results.map(r => r.ciphertext);
      const uniqueCiphertexts = new Set(ciphertexts);
      expect(uniqueCiphertexts.size).toBe(10);
    });

    it('should properly convert Ed25519 to Curve25519 keys', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const secureBlock = await encryptionService.buildSecure(
        nftMint,
        userWallet,
        protocolWallet,
        agentConfig
      );

      // Should successfully decrypt (proves proper key conversion)
      const decrypted = await encryptionService.decryptSecure(
        secureBlock,
        userWallet
      );

      expect(decrypted.name).toBe(agentConfig.name);
    });
  });

  describe('7. Key Rotation', () => {
    it('should support key rotation', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();
      
      const newUserKp = Keypair.generate();
      const newUserWallet = newUserKp.publicKey.toBase58();

      // Encrypt with old key
      const encrypted = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet.publicKey,
        nftMint
      );

      // Rotate keys
      const userSecretKey = bs58.decode(userWallet.secretKey);
      const rotated = await encryptionService.rotateKeys(
        encrypted,
        userSecretKey,
        newUserWallet
      );

      // Old user should not have access
      expect(rotated.keyring).not.toHaveProperty(userWallet.publicKey);
      
      // New user should have access
      expect(rotated.keyring).toHaveProperty(newUserWallet);
      
      // Protocol should still have access
      expect(rotated.keyring).toHaveProperty(protocolWallet.publicKey);
    });
  });

  describe('8. Input Validation', () => {
    it('should validate wallet public key format', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      await expect(
        encryptionService.encryptAgentConfig(
          agentConfig,
          'invalid-wallet-address',
          nftMint
        )
      ).rejects.toThrow();
    });

    it('should validate NFT mint format', async () => {
      const agentConfig = createTestAgentConfig();

      await expect(
        encryptionService.encryptAgentConfig(
          agentConfig,
          userWallet.publicKey,
          'invalid-mint-address'
        )
      ).rejects.toThrow();
    });

    it('should reject empty agent configuration', async () => {
      const nftMint = Keypair.generate().publicKey.toBase58();

      await expect(
        encryptionService.encryptAgentConfig(
          null as any,
          userWallet.publicKey,
          nftMint
        )
      ).rejects.toThrow();
    });
  });

  describe('9. Backward Compatibility', () => {
    it('should maintain version compatibility', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const encrypted = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet.publicKey,
        nftMint
      );

      expect(encrypted.ver).toBe(1);
      expect(encrypted).toHaveProperty('timestamp');
      expect(encrypted).toHaveProperty('version');
    });

    it('should reject unsupported encryption versions', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      const encrypted = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet.publicKey,
        nftMint
      );

      // Tamper version
      const tamperedEncrypted = { ...encrypted, ver: 99 };
      const userSecretKey = bs58.decode(userWallet.secretKey);

      await expect(
        encryptionService.decryptAgentConfig(tamperedEncrypted, userSecretKey)
      ).rejects.toThrow(/version/i);
    });
  });

  describe('10. End-to-End Encryption Flow', () => {
    it('should successfully complete full encryption/decryption cycle', async () => {
      const agentConfig = createTestAgentConfig();
      const nftMint = Keypair.generate().publicKey.toBase58();

      // Encrypt
      const encrypted = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet.publicKey,
        nftMint
      );

      // Decrypt with user wallet
      const userSecretKey = bs58.decode(userWallet.secretKey);
      const decrypted = await encryptionService.decryptAgentConfig(
        encrypted,
        userSecretKey
      );

      // Verify all fields
      expect(decrypted.name).toBe(agentConfig.name);
      expect(decrypted.description).toBe(agentConfig.description);
      expect(decrypted.purpose).toBe(agentConfig.purpose);
      expect(decrypted.framework).toBe(agentConfig.framework);
      expect(decrypted.plugins[0]?.config.apiKey).toBe(agentConfig.plugins[0]?.config.apiKey);
      expect(decrypted).toEqual(agentConfig);
    });

    it('should handle complex agent configurations', async () => {
      const complexConfig: AgentConfig = {
        name: 'Complex DeFi Agent',
        description: 'Multi-capability trading and analytics agent',
        purpose: 'Advanced DeFi operations with multiple strategies',
        personality: {
          traits: ['analytical', 'risk-aware', 'adaptive', 'responsive'],
          style: 'professional'
        },
        capabilities: [
          {
            type: 'defi',
            plugins: ['jupiter', 'orca', 'raydium'],
            config: { maxSlippage: 0.5, minLiquidity: 100000 }
          },
          {
            type: 'analytics',
            plugins: ['charting', 'backtesting'],
            config: { dataSource: 'mainnet', refreshInterval: 60000 }
          }
        ],
        framework: 'elizaOS',
        plugins: [
          {
            id: 'jupiter-aggregator',
            version: '2.1.0',
            enabled: true,
            config: { 
              apiKey: 'super-secret-jupiter-key-xyz123',
              endpoint: 'https://api.jup.ag/v4'
            },
            permissions: ['swap', 'quote', 'routes']
          },
          {
            id: 'risk-management',
            version: '1.5.2',
            enabled: true,
            config: {
              maxExposure: 10000,
              stopLoss: 0.05,
              privateRiskKey: 'another-sensitive-key-abc789'
            },
            permissions: ['monitor', 'execute', 'alert']
          }
        ],
        runtime: {
          memory: { 
            type: 'redis',
            ttl: 7200,
            config: {
              host: 'localhost',
              port: 6379
            }
          },
          scheduling: {
            enabled: true,
            interval: 30000
          },
          monitoring: {
            enabled: true,
            alerts: true
          }
        },
        permissions: {
          maxTradeSize: '5000 USDC',
          allowedTokens: ['SOL', 'USDC', 'USDT', 'mSOL', 'stSOL'],
          tradingHours: { start: '00:00', end: '23:59', timezone: 'UTC' },
          maxRequestsPerMinute: 100
        },
        preferences: {
          notifications: true,
          riskLevel: 'medium',
          autoRebalance: true
        }
      };

      const nftMint = Keypair.generate().publicKey.toBase58();

      // Encrypt
      const encrypted = await encryptionService.encryptAgentConfig(
        complexConfig,
        userWallet.publicKey,
        nftMint
      );

      // Decrypt
      const userSecretKey = bs58.decode(userWallet.secretKey);
      const decrypted = await encryptionService.decryptAgentConfig(
        encrypted,
        userSecretKey
      );

      // Verify sensitive data is preserved
      expect(decrypted.plugins[0]?.config.apiKey).toBe('super-secret-jupiter-key-xyz123');
      expect(decrypted.plugins[1]?.config.privateRiskKey).toBe('another-sensitive-key-abc789');
      expect(decrypted).toEqual(complexConfig);
    });
  });
});

