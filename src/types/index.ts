import { PublicKey, Transaction } from '@solana/web3.js';
import { z } from 'zod';

// ============================================================================
// Core Configuration Types
// ============================================================================

export interface MainframeConfig {
  // Solana Configuration
  solanaNetwork: 'devnet' | 'testnet' | 'mainnet-beta';
  rpcEndpoint: string;
  programId: string;
  
  // Storage Configuration  
  storage: StorageConfig;
  
  // Protocol Configuration
  protocolWallet: string;
  
  // Optional: Custom encryption settings
  encryption?: EncryptionConfig;
  
  // Development options
  development?: DevelopmentConfig;
}

export interface StorageConfig {
  primary: 'ipfs' | 'arweave';
  fallback?: ('ipfs' | 'arweave')[];
  ipfs?: {
    gateway: string;
    api?: string;
    apiKey?: string;
  };
  arweave?: {
    gateway: string;
    bundler?: string;
    wallet?: string;
  };
}

export interface EncryptionConfig {
  algorithm: 'xchacha20poly1305-ietf';
  keyDerivation: 'ed25519-to-x25519';
}

export interface DevelopmentConfig {
  mockWallet?: boolean;
  mockStorage?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  skipFees?: boolean;
  protocolWalletSecretKey?: string;
}

// ============================================================================
// Agent Configuration Types  
// ============================================================================

export interface AgentConfig {
  // Basic Information
  name: string;
  description: string;
  avatar?: string;
  
  // Agent Behavior
  purpose: string;
  personality: PersonalityTraits;
  capabilities: AgentCapability[];
  
  // Technical Configuration
  framework: 'elizaOS';
  plugins: PluginConfig[];
  runtime: RuntimeConfig;
  
  // Security & Access
  permissions: PermissionSet;
  apiKeys?: Record<string, string>;
  
  // User Preferences
  preferences: UserPreferences;
}

export interface PersonalityTraits {
  traits: string[];
  style: 'professional' | 'casual' | 'technical' | 'friendly' | 'custom';
  customPrompt?: string;
}

export interface AgentCapability {
  type: 'defi' | 'social' | 'analytics' | 'crosschain' | 'utility' | 'ai';
  plugins: string[];
  config: Record<string, any>;
}

export interface PluginConfig {
  id: string;
  version: string;
  enabled: boolean;
  config: Record<string, any>;
  permissions: string[];
}

export interface RuntimeConfig {
  memory: {
    type: 'redis' | 'memory' | 'file';
    ttl?: number;
    config?: Record<string, any>;
  };
  scheduling: {
    enabled: boolean;
    interval?: number;
  };
  monitoring: {
    enabled: boolean;
    alerts?: boolean;
  };
}

export interface PermissionSet {
  maxTradeSize?: string;
  allowedTokens?: string[];
  tradingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
  maxRequestsPerMinute?: number;
  allowedEndpoints?: string[];
}

export interface UserPreferences {
  notifications: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  autoRebalance?: boolean;
  language?: string;
  timezone?: string;
}

// ============================================================================
// Encryption & Storage Types (PoC Compatible)
// ============================================================================

/**
 * SecureBlock format matching mainframe-poc implementation
 */
export interface SecureBlock {
  ver: 1;
  aead: 'xchacha20poly1305-ietf';
  ad: string;               // "mint:<MINT_ADDRESS>"
  nonce: string;            // base64:...
  ciphertext: string;       // base64:...
  keyring: Record<string, string>; // base58 address -> base64:sealedBox(contentKey)
}

/**
 * Legacy encrypted metadata interface (for backward compatibility)
 */
export interface EncryptedMetadata {
  ver: number;
  aead: string;
  ad: string;
  nonce: string;
  ciphertext: string;
  keyring: Record<string, string>;
  timestamp?: number;
  version?: string;
}

/**
 * Public agent data stored in AppData plugin (on-chain)
 */
export interface PublicAgentData {
  name: string;
  type: string;
  framework: string;
  created: string;
}

/**
 * Complete agent NFT metadata with hybrid architecture
 */
export interface AgentNFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  external_url?: string;
  // Private configuration stored in secure block (off-chain)
  secure: SecureBlock;
  // Original NFT reference
  based_on: {
    mint: string;
    collection: string;
    original_name: string;
  };
  // Mainframe collection membership
  mainframe_collection: string;
}

/**
 * Verified NFT collection data
 */
export interface VerifiedNFT {
  name: string;
  symbol: string;
  description: string;
  image: string;
  collection: {
    name: string;
    family: string;
  };
  verified_collection: {
    key: string;
    verified: boolean;
    name: string;
  };
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

/**
 * Wallet information for PoC compatibility
 */
export interface WalletInfo {
  publicKey: string;
  secretKey: string; // base58 encoded
  keypair: any; // Solana Keypair
}

/**
 * Collection plugin configuration
 */
export interface CollectionPlugin {
  type: 'Royalties' | 'PermanentTransferDelegate' | 'PermanentFreezeDelegate' | 'PermanentBurnDelegate';
  config: Record<string, any>;
}

/**
 * Mainframe Agents Collection configuration
 */
export interface MainframeAgentsCollection {
  address: string;
  authority: string;
  plugins: CollectionPlugin[];
  created: string;
}

export interface StorageResult {
  primary: StorageUpload;
  backups: StorageUpload[];
  uri: string;
}

export interface StorageUpload {
  provider: 'ipfs' | 'arweave';
  hash?: string;
  txId?: string;
  url: string;
  timestamp: number;
}

export interface UploadOptions {
  pin?: boolean;
  timeout?: number;
  retries?: number;
}

// ============================================================================
// Program & Blockchain Types  
// ============================================================================

export interface AgentAccountData {
  nftMint: string;
  owner: string;
  collectionMint?: string;
  metadataUri: string;
  status: AgentStatus;
  activatedAt: number;
  updatedAt: number;
  version: number;
}

export type AgentStatus = 'Active' | 'Paused' | 'Closed';

export interface FeeStructure {
  createAgent: number;
  updateConfig: number;
  transferAgent: number;
  pauseAgent: number;
  closeAgent: number;
  executeAction: number;
}

export interface PartnerCollection {
  collectionMint: string;
  discountPercent: number;
  name: string;
  active: boolean;
  addedAt: number;
}

export interface ProtocolConfigData {
  authority: string;
  fees: FeeStructure;
  protocolTreasury: string;
  validatorTreasury: string;
  networkTreasury: string;
  protocolTreasuryBps: number;
  validatorTreasuryBps: number;
  networkTreasuryBps: number;
  paused: boolean;
  totalAgents: number;
  totalPartners: number;
}

// ============================================================================
// Transaction & Operation Result Types
// ============================================================================

export interface TransactionOptions {
  priorityFee?: number;
  computeUnits?: number;
  skipPreflight?: boolean;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface ActivateAgentResult {
  signature: string;
  agentAccount: string;
  metadataUri: string;
  confirmation: any;
}

export interface UpdateAgentResult {
  signature: string;
  agentAccount: string;
  newMetadataUri: string;
  version: number;
  syncTriggered: boolean;
}

export interface TransferAgentResult {
  signature: string;
  agentAccount: string;
  oldOwner: string;
  newOwner: string;
}

// ============================================================================
// Wallet Integration Types
// ============================================================================

export interface WalletConnectionResult {
  publicKey: string;
  connected: boolean;
  walletName: string;
}

export interface WalletAdapter {
  name: string;
  publicKey: PublicKey | null;
  connected: boolean;
  readyState: 'NotDetected' | 'Installed' | 'Loadable' | 'Unsupported';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
  secretKey?: Uint8Array;
}

// ============================================================================
// Event Types
// ============================================================================

export interface AgentCreatedEvent {
  agentAccount: string;
  nftMint: string;
  owner: string;
  collectionMint?: string;
  metadataUri: string;
  timestamp: number;
  version: number;
}

export interface AgentUpdatedEvent {
  agentAccount: string;
  owner: string;
  metadataUri: string;
  oldVersion: number;
  newVersion: number;
  timestamp: number;
}

export interface AgentTransferredEvent {
  agentAccount: string;
  nftMint: string;
  oldOwner: string;
  newOwner: string;
  timestamp: number;
}

export interface AgentPausedEvent {
  agentAccount: string;
  owner: string;
  timestamp: number;
}

export interface AgentResumedEvent {
  agentAccount: string;
  owner: string;
  timestamp: number;
}

export interface AgentClosedEvent {
  agentAccount: string;
  owner: string;
  timestamp: number;
}

export interface AgentDeployedEvent {
  agentAccount: string;
  nodeId: string;
  status: 'deployed' | 'failed';
  message?: string;
  timestamp: number;
}

export interface AgentErrorEvent {
  agentAccount: string;
  error: string;
  context?: Record<string, any>;
  timestamp: number;
}

export interface EventSubscription {
  unsubscribe(): void;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface AgentSummary {
  account: string;
  name: string;
  status: AgentStatus;
  lastUpdate: Date;
  nftMint: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CacheOptions {
  ttl?: number;
  namespace?: string;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const AgentConfigSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  avatar: z.string().url().optional(),
  purpose: z.string().min(1).max(200),
  personality: z.object({
    traits: z.array(z.string()).min(1),
    style: z.enum(['professional', 'casual', 'technical', 'friendly', 'custom']),
    customPrompt: z.string().optional()
  }),
  capabilities: z.array(z.object({
    type: z.enum(['defi', 'social', 'analytics', 'crosschain', 'utility', 'ai']),
    plugins: z.array(z.string()).min(1),
    config: z.record(z.any())
  })).min(1),
  framework: z.literal('elizaOS'),
  plugins: z.array(z.object({
    id: z.string(),
    version: z.string(),
    enabled: z.boolean(),
    config: z.record(z.any()),
    permissions: z.array(z.string())
  })),
  runtime: z.object({
    memory: z.object({
      type: z.enum(['redis', 'memory', 'file']),
      ttl: z.number().optional(),
      config: z.record(z.any()).optional()
    }),
    scheduling: z.object({
      enabled: z.boolean(),
      interval: z.number().optional()
    }),
    monitoring: z.object({
      enabled: z.boolean(),
      alerts: z.boolean().optional()
    })
  }),
  permissions: z.object({
    maxTradeSize: z.string().optional(),
    allowedTokens: z.array(z.string()).optional(),
    tradingHours: z.object({
      start: z.string(),
      end: z.string(),
      timezone: z.string()
    }).optional(),
    maxRequestsPerMinute: z.number().optional(),
    allowedEndpoints: z.array(z.string()).optional()
  }),
  apiKeys: z.record(z.string()).optional(),
  preferences: z.object({
    notifications: z.boolean(),
    riskLevel: z.enum(['low', 'medium', 'high']),
    autoRebalance: z.boolean().optional(),
    language: z.string().optional(),
    timezone: z.string().optional()
  })
});

export const MainframeConfigSchema = z.object({
  solanaNetwork: z.enum(['devnet', 'testnet', 'mainnet-beta']),
  rpcEndpoint: z.string().url(),
  programId: z.string(),
  storage: z.object({
    primary: z.enum(['ipfs', 'arweave']),
    fallback: z.array(z.enum(['ipfs', 'arweave'])).optional(),
    ipfs: z.object({
      gateway: z.string().url(),
      api: z.string().url().optional(),
      apiKey: z.string().optional()
    }).optional(),
    arweave: z.object({
      gateway: z.string().url(),
      bundler: z.string().url().optional(),
      wallet: z.string().optional()
    }).optional()
  }),
  protocolWallet: z.string(),
  encryption: z.object({
    algorithm: z.literal('xchacha20poly1305-ietf'),
    keyDerivation: z.literal('ed25519-to-x25519')
  }).optional(),
  development: z.object({
    mockWallet: z.boolean().optional(),
    mockStorage: z.boolean().optional(),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    skipFees: z.boolean().optional()
  }).optional()
});

// Type exports for validation
export type ValidatedAgentConfig = z.infer<typeof AgentConfigSchema>;
export type ValidatedMainframeConfig = z.infer<typeof MainframeConfigSchema>;
