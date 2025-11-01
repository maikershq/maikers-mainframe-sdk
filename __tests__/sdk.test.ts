/**
 * Tests for MainframeSDK core functionality
 */

import { MainframeSDK, createMockSDK } from '../src';
import { TestFixtures, TestHelpers } from '../src/testing';

describe('MainframeSDK', () => {
  let sdk: MainframeSDK;

  beforeEach(() => {
    sdk = createMockSDK();
  });

  afterEach(async () => {
    if (sdk) {
      await sdk.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await sdk.initialize('Mock Wallet');
      
      expect(result.connected).toBe(true);
      expect(result.walletName).toBe('Mock Wallet');
      expect(result.publicKey).toBeDefined();
      expect(sdk.isReady()).toBe(true);
    });

    it('should initialize in read-only mode', async () => {
      await sdk.initializeReadOnly();
      
      const status = await sdk.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.walletConnected).toBe(false);
    });

    it('should throw error if initialized twice', async () => {
      await sdk.initialize('Mock Wallet');
      
      await TestHelpers.expectError(
        sdk.initialize('Mock Wallet'),
        'already initialized'
      );
    });
  });

  describe('Agent Management', () => {
    beforeEach(async () => {
      await sdk.initialize('Mock Wallet');
    });

    it('should create agent successfully', async () => {
      const agentConfig = TestFixtures.createAgentConfig();
      const nftMint = TestFixtures.randomAddress();
      
      const result = await sdk.createAgent(nftMint, agentConfig);
      
      expect(result.signature).toBeDefined();
      expect(result.agentAccount).toBeDefined();
      expect(result.metadataUri).toMatch(/^ipfs:\/\//);
    });

    it('should validate agent config before creation', async () => {
      const invalidConfig = {
        ...TestFixtures.createAgentConfig(),
        name: '' // Invalid empty name
      };
      const nftMint = TestFixtures.randomAddress();

      await TestHelpers.expectError(
        sdk.createAgent(nftMint, invalidConfig),
        'validation failed'
      );
    });

    it('should update agent configuration', async () => {
      const agentConfig = TestFixtures.createAgentConfig();
      const nftMint = TestFixtures.randomAddress();
      
      // Create agent first
      const createResult = await sdk.createAgent(nftMint, agentConfig);
      
      // Update configuration
      const updateResult = await sdk.updateAgent(createResult.agentAccount, {
        name: 'Updated Agent Name'
      });
      
      expect(updateResult.signature).toBeDefined();
      expect(updateResult.syncTriggered).toBe(true);
    });

    it('should pause and resume agent', async () => {
      const agentConfig = TestFixtures.createAgentConfig();
      const nftMint = TestFixtures.randomAddress();
      
      const createResult = await sdk.createAgent(nftMint, agentConfig);
      
      // Pause agent
      const pauseSignature = await sdk.pauseAgent(createResult.agentAccount);
      expect(pauseSignature).toBeDefined();
      
      // Resume agent
      const resumeSignature = await sdk.resumeAgent(createResult.agentAccount);
      expect(resumeSignature).toBeDefined();
    });

    it('should transfer agent ownership', async () => {
      const agentConfig = TestFixtures.createAgentConfig();
      const nftMint = TestFixtures.randomAddress();
      const newOwner = TestFixtures.randomAddress();
      
      const createResult = await sdk.createAgent(nftMint, agentConfig);
      
      const transferResult = await sdk.transferAgent(
        createResult.agentAccount, 
        newOwner
      );
      
      expect(transferResult.signature).toBeDefined();
      expect(transferResult.newOwner).toBe(newOwner);
    });

    it('should close agent permanently', async () => {
      const agentConfig = TestFixtures.createAgentConfig();
      const nftMint = TestFixtures.randomAddress();
      
      const createResult = await sdk.createAgent(nftMint, agentConfig);
      
      const closeSignature = await sdk.closeAgent(createResult.agentAccount);
      expect(closeSignature).toBeDefined();
    });
  });

  describe('Agent Information', () => {
    beforeEach(async () => {
      await sdk.initialize('Mock Wallet');
    });

    it('should get user agents', async () => {
      const agents = await sdk.getMyAgents();
      
      expect(Array.isArray(agents)).toBe(true);
      // Mock service returns 2 agents
      expect(agents.length).toBe(2);
      
      agents.forEach(agent => {
        TestHelpers.validateStructure(agent, {
          account: 'string',
          name: 'string',
          status: 'string',
          nftMint: 'string'
        });
      });
    });

    it('should get agent account data', async () => {
      const agentAccount = TestFixtures.testAddress(1);
      
      const agentData = await sdk.getAgentAccount(agentAccount);
      
      TestHelpers.validateStructure(agentData, {
        nftMint: 'string',
        owner: 'string',
        metadataUri: 'string',
        status: 'string',
        activatedAt: 'number',
        updatedAt: 'number',
        version: 'number'
      });
    });
  });

  describe('Protocol Information', () => {
    beforeEach(async () => {
      await sdk.initialize('Mock Wallet');
    });

    it('should get protocol info', async () => {
      const protocolInfo = await sdk.getProtocolInfo();
      
      expect(protocolInfo).toBeDefined();
      expect(protocolInfo.sdk).toBeDefined();
      expect(protocolInfo.sdk.version).toBe('1.0.0');
    });

    it('should get wallet balance', async () => {
      const balance = await sdk.getWalletBalance();
      
      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid agent config', () => {
      const config = TestFixtures.createAgentConfig();
      
      const result = sdk.validateAgentConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid agent config', () => {
      const invalidConfig = {
        ...TestFixtures.createAgentConfig(),
        name: '', // Invalid
        capabilities: [] // Invalid - must have at least one
      };
      
      const result = sdk.validateAgentConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('SDK Status', () => {
    it('should report correct status when not initialized', async () => {
      const status = await sdk.getStatus();
      
      expect(status.initialized).toBe(false);
      expect(status.walletConnected).toBe(false);
      expect(status.walletAddress).toBeUndefined();
    });

    it('should report correct status when initialized', async () => {
      await sdk.initialize('Mock Wallet');
      
      const status = await sdk.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.walletConnected).toBe(true);
      expect(status.walletAddress).toBeDefined();
      expect(status.network).toBe('devnet');
      expect(status.version).toBe('1.0.0');
    });

    it('should check if SDK is ready', async () => {
      expect(sdk.isReady()).toBe(false);
      
      await sdk.initialize('Mock Wallet');
      
      expect(sdk.isReady()).toBe(true);
    });
  });

  describe('Wallet Integration', () => {
    it('should get supported wallets', () => {
      const wallets = sdk.getSupportedWallets();
      
      expect(Array.isArray(wallets)).toBe(true);
      expect(wallets.length).toBeGreaterThan(0);
      
      wallets.forEach(wallet => {
        TestHelpers.validateStructure(wallet, {
          name: 'string',
          icon: 'string',
          url: 'string'
        });
      });
    });

    it('should handle wallet connection errors', async () => {
      // Simulate wallet error by using invalid wallet name
      await TestHelpers.expectError(
        sdk.initialize('NonExistentWallet'),
        /wallet/i  // Case-insensitive match
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not initialized', async () => {
      const agentConfig = TestFixtures.createAgentConfig();
      const nftMint = TestFixtures.randomAddress();

      await TestHelpers.expectError(
        sdk.createAgent(nftMint, agentConfig),
        'not initialized'
      );
    });

    it('should throw error when wallet not connected', async () => {
      await sdk.initializeReadOnly();

      const agentConfig = TestFixtures.createAgentConfig();
      const nftMint = TestFixtures.randomAddress();

      await TestHelpers.expectError(
        sdk.createAgent(nftMint, agentConfig),
        'not connected'
      );
    });
  });

  describe('Cleanup', () => {
    it('should cleanup successfully', async () => {
      await sdk.initialize('Mock Wallet');
      expect(sdk.isReady()).toBe(true);
      
      await sdk.cleanup();
      
      const status = await sdk.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.walletConnected).toBe(false);
    });

    it('should handle cleanup when not initialized', async () => {
      // Should not throw error
      await expect(sdk.cleanup()).resolves.toBeUndefined();
    });
  });
});
