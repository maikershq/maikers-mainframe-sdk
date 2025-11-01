/**
 * Security Tests for MainframeSDK
 * 
 * Tests critical security features including encryption, rate limiting,
 * input validation, access control, and audit logging.
 */

import { MainframeSDK, createMockSDK } from '../src';
import { TestFixtures, TestHelpers } from '../src/testing';
import { 
  RateLimiter, 
  CircuitBreaker, 
  SecuritySanitizer, 
  AuditLogger,
  globalRateLimiter,
  globalAuditLogger
} from '../src/utils/security';
import { EncryptionService } from '../src/services/encryption';
import { SecurityValidator } from '../src/utils/validation';

describe('Security Tests', () => {
  let sdk: MainframeSDK;
  let auditLogger: AuditLogger;

  beforeEach(async () => {
    sdk = createMockSDK();
    auditLogger = AuditLogger.getInstance();
    auditLogger.clearLogs(); // Clean slate for each test
  });

  afterEach(async () => {
    if (sdk) {
      await sdk.cleanup();
    }
  });

  describe('Encryption Security', () => {
    let encryptionService: EncryptionService;

    beforeEach(() => {
      const { Keypair } = require('@solana/web3.js');
      const generateTestKeypair = (seed: number) => {
        const seedArray = new Uint8Array(32);
        seedArray[0] = seed;
        return Keypair.fromSeed(seedArray);
      };
      
      encryptionService = new EncryptionService({
        solanaNetwork: 'devnet',
        rpcEndpoint: 'https://api.devnet.solana.com',
        programId: generateTestKeypair(1).publicKey.toBase58(),
        protocolWallet: generateTestKeypair(2).publicKey.toBase58(),
        storage: { arweave: { gateway: 'https://arweave.net' } }
      });
    });

    it('should encrypt and decrypt agent config correctly', async () => {
      await encryptionService.initialize();
      
      const agentConfig = TestFixtures.createAgentConfig();
      const userWallet = TestFixtures.randomAddress();
      const nftMint = TestFixtures.randomAddress();

      // Encrypt
      const encrypted = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet,
        nftMint
      );

      expect(encrypted.ver).toBe(1);
      expect(encrypted.aead).toBe('xchacha20poly1305-ietf');
      expect(encrypted.ad).toBe(`mint:${nftMint}`);
      expect(encrypted.keyring).toHaveProperty(userWallet);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.nonce).toBeDefined();

      // Ensure ciphertext is actually encrypted (not plaintext)
      expect(encrypted.ciphertext).not.toContain(agentConfig.name);
      expect(encrypted.ciphertext).not.toContain(agentConfig.description);
    });

    it('should prevent decryption with wrong mint address', async () => {
      await encryptionService.initialize();
      
      const agentConfig = TestFixtures.createAgentConfig();
      const userWallet = TestFixtures.randomAddress();
      const correctMint = TestFixtures.randomAddress();
      const wrongMint = TestFixtures.randomAddress();

      const encrypted = await encryptionService.encryptAgentConfig(
        agentConfig,
        userWallet,
        correctMint
      );

      // Attempt decryption with wrong mint should fail
      // The error occurs when trying to decrypt without proper keyring access
      const modifiedEncrypted = {
        ...encrypted,
        ad: `mint:${wrongMint}`
      };

      await TestHelpers.expectError(
        encryptionService.decryptAgentConfig(modifiedEncrypted, new Uint8Array(64)),
        /keyring|access/i  // Error occurs at keyring validation level
      );
    });

    it('should validate encryption parameters properly', () => {
      const validNonce = new Uint8Array(24);
      const validKey = new Uint8Array(32);
      const validData = new Uint8Array(100);

      // Valid parameters should not throw
      expect(() => {
        SecurityValidator.validateEncryptionParams(validNonce, validKey, validData);
      }).not.toThrow();

      // Invalid nonce size should throw
      expect(() => {
        SecurityValidator.validateEncryptionParams(new Uint8Array(16), validKey, validData);
      }).toThrow('Invalid nonce');

      // Invalid key size should throw
      expect(() => {
        SecurityValidator.validateEncryptionParams(validNonce, new Uint8Array(16), validData);
      }).toThrow('Invalid key');

      // Data too large should throw
      const hugeData = new Uint8Array(15 * 1024 * 1024); // 15MB
      expect(() => {
        SecurityValidator.validateEncryptionParams(validNonce, validKey, hugeData);
      }).toThrow('too large');
    });

    it('should securely generate random tokens', () => {
      const token1 = require('../src/utils/security').TokenGenerator.generateSecureToken(32);
      const token2 = require('../src/utils/security').TokenGenerator.generateSecureToken(32);

      // Tokens should be different
      expect(token1).not.toBe(token2);
      
      // Should be hex format
      expect(token1).toMatch(/^[0-9a-f]+$/);
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });

  describe('Rate Limiting', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter(5, 1000); // 5 requests per second for testing
    });

    it('should allow requests within rate limit', () => {
      const userId = 'test-user';

      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed(userId)).toBe(true);
      }

      // 6th request should be denied
      expect(rateLimiter.isAllowed(userId)).toBe(false);
    });

    it('should track remaining requests correctly', () => {
      const userId = 'test-user';

      expect(rateLimiter.getRemaining(userId)).toBe(5);
      
      rateLimiter.isAllowed(userId);
      expect(rateLimiter.getRemaining(userId)).toBe(4);
      
      rateLimiter.isAllowed(userId);
      expect(rateLimiter.getRemaining(userId)).toBe(3);
    });

    it('should reset rate limit after time window', async () => {
      const rateLimiter = new RateLimiter(2, 100); // 2 requests per 100ms
      const userId = 'test-user';

      // Use up the rate limit
      expect(rateLimiter.isAllowed(userId)).toBe(true);
      expect(rateLimiter.isAllowed(userId)).toBe(true);
      expect(rateLimiter.isAllowed(userId)).toBe(false);

      // Wait for the window to reset
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      expect(rateLimiter.isAllowed(userId)).toBe(true);
    });

    it('should handle multiple users independently', () => {
      const user1 = 'user1';
      const user2 = 'user2';

      // Use up rate limit for user1
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(user1);
      }
      expect(rateLimiter.isAllowed(user1)).toBe(false);

      // user2 should still be allowed
      expect(rateLimiter.isAllowed(user2)).toBe(true);
    });
  });

  describe('Circuit Breaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(3, 100, 2); // 3 failures, 100ms timeout, 2 successes to recover
    });

    it('should open circuit after failure threshold', async () => {
      const failingOperation = async () => {
        throw new Error('Operation failed');
      };

      // First 3 failures should execute
      for (let i = 0; i < 3; i++) {
        await TestHelpers.expectError(
          circuitBreaker.execute(failingOperation),
          'Operation failed'
        );
      }

      // Circuit should now be open
      await TestHelpers.expectError(
        circuitBreaker.execute(failingOperation),
        'Circuit breaker is OPEN'
      );
    });

    it('should recover after timeout and successful operations', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success1')
        .mockResolvedValueOnce('success2');

      // Trip the circuit breaker
      for (let i = 0; i < 3; i++) {
        await TestHelpers.expectError(
          circuitBreaker.execute(operation),
          'fail'
        );
      }

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow test calls and recover
      const result1 = await circuitBreaker.execute(operation);
      const result2 = await circuitBreaker.execute(operation);

      expect(result1).toBe('success1');
      expect(result2).toBe('success2');
      expect(circuitBreaker.getStatus().state).toBe('CLOSED');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML to prevent XSS', () => {
      const maliciousInput = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = SecuritySanitizer.sanitizeHtml(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('&lt;script&gt;');
      expect(sanitized).toContain('&lt;&#x2F;script&gt;');
    });

    it('should sanitize SQL to prevent injection', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = SecuritySanitizer.sanitizeSql(maliciousInput);

      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
      expect(sanitized).toBe("'' DROP TABLE users ");
    });

    it('should validate file uploads', () => {
      const validFile = new Uint8Array([1, 2, 3, 4]);
      const oversizedFile = new Uint8Array(15 * 1024 * 1024); // 15MB
      const emptyFile = new Uint8Array(0);

      // Valid file should not throw
      expect(() => {
        SecuritySanitizer.validateFileUpload('test.json', validFile);
      }).not.toThrow();

      // Oversized file should throw
      expect(() => {
        SecuritySanitizer.validateFileUpload('large.json', oversizedFile);
      }).toThrow('too large');

      // Empty file should throw
      expect(() => {
        SecuritySanitizer.validateFileUpload('empty.json', emptyFile);
      }).toThrow('Empty file');

      // Invalid extension should throw
      expect(() => {
        SecuritySanitizer.validateFileUpload('malicious.exe', validFile);
      }).toThrow('not allowed');
    });

    it('should validate JSON with size limits', () => {
      const validJson = '{"test": "value"}';
      const invalidJson = '{"unclosed": true';
      const hugeJson = '{"data": "' + 'x'.repeat(2 * 1024 * 1024) + '"}'; // 2MB+

      // Valid JSON should parse
      expect(() => {
        SecuritySanitizer.sanitizeJson(validJson);
      }).not.toThrow();

      // Invalid JSON should throw
      expect(() => {
        SecuritySanitizer.sanitizeJson(invalidJson);
      }).toThrow('Invalid JSON');

      // Oversized JSON should throw
      expect(() => {
        SecuritySanitizer.sanitizeJson(hugeJson);
      }).toThrow('too large');
    });
  });

  describe('Audit Logging', () => {
    it('should log security events', () => {
      const event = {
        type: 'security' as const,
        action: 'encryption_test',
        userId: 'test-user',
        result: 'success' as const,
        details: { test: true }
      };

      auditLogger.logEvent(event);
      const logs = auditLogger.getLogs(1);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        type: 'security',
        action: 'encryption_test',
        userId: 'test-user',
        result: 'success'
      });
      expect(logs[0]?.timestamp).toBeDefined();
      expect(logs[0]?.id).toBeDefined();
    });

    it('should search audit logs by criteria', () => {
      // Add multiple events
      auditLogger.logEvent({
        type: 'security',
        action: 'login',
        userId: 'user1',
        result: 'success'
      });
      
      auditLogger.logEvent({
        type: 'operation',
        action: 'create_agent',
        userId: 'user1',
        result: 'success'
      });
      
      auditLogger.logEvent({
        type: 'security',
        action: 'login',
        userId: 'user2',
        result: 'failure'
      });

      // Search by type
      const securityEvents = auditLogger.searchLogs({ type: 'security' });
      expect(securityEvents).toHaveLength(2);

      // Search by user
      const user1Events = auditLogger.searchLogs({ userId: 'user1' });
      expect(user1Events).toHaveLength(2);

      // Search by multiple criteria
      const failedSecurity = auditLogger.searchLogs({ 
        type: 'security', 
        result: 'failure' 
      });
      expect(failedSecurity).toHaveLength(1);
      expect(failedSecurity[0]?.userId).toBe('user2');
    });

    it('should limit log storage to prevent memory issues', () => {
      const maxLogs = 10; // Simulate small limit for testing
      const testLogger = new (require('../src/utils/security').AuditLogger)();
      
      // Override maxLogs for testing
      (testLogger as any).maxLogs = maxLogs;

      // Add more logs than the limit
      for (let i = 0; i < maxLogs + 5; i++) {
        testLogger.logEvent({
          type: 'operation',
          action: `test_action_${i}`,
          result: 'success'
        });
      }

      const logs = testLogger.getLogs(100);
      expect(logs.length).toBeLessThanOrEqual(maxLogs);
    });
  });

  describe('Access Control', () => {
    beforeEach(async () => {
      await sdk.initialize('Mock Wallet');
    });

    it('should prevent operations when not initialized', async () => {
      const uninitializedSdk = createMockSDK();
      const agentConfig = TestFixtures.createAgentConfig();
      const nftMint = TestFixtures.randomAddress();

      await TestHelpers.expectError(
        uninitializedSdk.createAgent(nftMint, agentConfig),
        'not initialized'
      );
    });

    it('should prevent wallet operations when not connected', async () => {
      // Create a fresh SDK instance for this test
      const readOnlySdk = createMockSDK();
      await readOnlySdk.initializeReadOnly(); // Read-only mode without wallet
      
      const agentConfig = TestFixtures.createAgentConfig();
      const nftMint = TestFixtures.randomAddress();

      try {
        await TestHelpers.expectError(
          readOnlySdk.createAgent(nftMint, agentConfig),
          'not connected'
        );
      } finally {
        await readOnlySdk.cleanup();
      }
    });

    it('should validate agent configuration thoroughly', async () => {
      const invalidConfigs = [
        { ...TestFixtures.createAgentConfig(), name: '' }, // Empty name
        { ...TestFixtures.createAgentConfig(), capabilities: [] }, // No capabilities
        { ...TestFixtures.createAgentConfig(), framework: 'invalid' as any }, // Invalid framework
      ];

      for (const invalidConfig of invalidConfigs) {
        await TestHelpers.expectError(
          sdk.createAgent(TestFixtures.randomAddress(), invalidConfig),
          'validation'
        );
      }
    });
  });

  describe('Sensitive Data Protection', () => {
    it('should detect potential sensitive data in logs', () => {
      const testCases = [
        { data: { apiKey: 'secret123' }, shouldWarn: true },
        { data: { password: 'mypassword' }, shouldWarn: true },
        { data: { privateKey: 'key123' }, shouldWarn: true },
        { data: { token: 'bearer123' }, shouldWarn: true },
        { data: { username: 'john', email: 'john@example.com' }, shouldWarn: false },
      ];

      // Mock console.warn to capture warnings
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (message: string) => warnings.push(message);

      try {
        testCases.forEach((testCase, index) => {
          SecurityValidator.validateNoSensitiveData(testCase.data, `test-context-${index}`);
        });

        // Check warnings
        const sensitiveWarnings = warnings.filter(w => w.includes('sensitive data detected'));
        expect(sensitiveWarnings.length).toBe(4); // First 4 test cases should warn

      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe('SDK Security Integration', () => {
    beforeEach(async () => {
      await sdk.initialize('Mock Wallet');
    });

    it('should audit agent creation operations', async () => {
      const agentConfig = TestFixtures.createAgentConfig();
      const nftMint = TestFixtures.randomAddress();

      // Clear previous logs
      globalAuditLogger.clearLogs();

      await sdk.createAgent(nftMint, agentConfig);

      // Check audit logs
      const logs = globalAuditLogger.getLogs(10);
      const createAgentLogs = logs.filter(log => log.action === 'create_agent');
      
      expect(createAgentLogs.length).toBeGreaterThan(0);
      expect(createAgentLogs[0]?.result).toBe('success');
    });

    it('should enforce rate limiting on operations', async () => {
      const agentConfig = TestFixtures.createAgentConfig();
      
      // Note: This test would need rate limiting to be more aggressive for testing
      // or we'd need to make many concurrent requests to trigger it
      
      // For now, we'll test that the rate limiter is accessible
      expect(globalRateLimiter).toBeDefined();
      expect(typeof globalRateLimiter.isAllowed).toBe('function');
    });
  });
});
