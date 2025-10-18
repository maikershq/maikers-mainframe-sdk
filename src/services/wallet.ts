/**
 * Wallet service for Mainframe SDK
 * 
 * Handles multi-wallet integration, transaction signing, and key management
 * for Solana wallet adapters (Phantom, Solflare, Backpack, etc.)
 */

import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { WalletAdapter } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { GlowWalletAdapter } from '@solana/wallet-adapter-glow';
import type { 
  WalletConnectionResult, 
  MainframeConfig,
  WalletInfo
} from '../types';
import { ErrorFactory, MainframeSDKError } from '../utils/errors';

export interface WalletAdapterInfo {
  name: string;
  icon: string;
  url: string;
  adapter: WalletAdapter;
  readyState: 'NotDetected' | 'Installed' | 'Loadable' | 'Unsupported';
}

export class WalletService {
  private config: MainframeConfig;
  private currentAdapter?: WalletAdapter;
  private availableWallets: Map<string, WalletAdapterInfo> = new Map();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  constructor(config: MainframeConfig) {
    this.config = config;
    this.initializeWallets();
  }

  /**
   * Get all available wallets
   */
  getAvailableWallets(): WalletAdapterInfo[] {
    return Array.from(this.availableWallets.values());
  }

  /**
   * Get installed wallets only
   */
  getInstalledWallets(): WalletAdapterInfo[] {
    return this.getAvailableWallets().filter(
      wallet => wallet.readyState === 'Installed'
    );
  }

  /**
   * Get current connected wallet info
   */
  getCurrentWallet(): WalletAdapterInfo | null {
    if (!this.currentAdapter) return null;
    
    for (const wallet of this.availableWallets.values()) {
      if (wallet.adapter === this.currentAdapter) {
        return wallet;
      }
    }
    return null;
  }

  /**
   * Get current wallet credentials (for SDK operations)
   * Note: Browser wallets don't expose secret keys
   */
  getWalletInfo(): WalletInfo | null {
    const publicKey = this.getPublicKey();
    if (!publicKey) return null;
    
    // Return WalletInfo with public key
    // Secret key and keypair are not available from browser wallets
    return {
      publicKey: publicKey.toBase58(),
      secretKey: '', // Not available from browser wallets
      keypair: null // Not available from browser wallets
    };
  }

  /**
   * Get current wallet adapter info
   */
  getCurrentWalletAdapter(): WalletAdapterInfo | null {
    return this.getCurrentWallet();
  }

  /**
   * Connect to a specific wallet
   */
  async connect(walletName?: string): Promise<WalletConnectionResult> {
    try {
        // Auto-select wallet if not specified
        if (!walletName) {
          const installed = this.getInstalledWallets();
          if (installed.length === 0) {
            throw ErrorFactory.walletNotFound();
          }
          const firstWallet = installed[0];
          if (!firstWallet) {
            throw ErrorFactory.walletNotFound();
          }
          walletName = firstWallet.name;
        }

      const walletInfo = this.availableWallets.get(walletName);
      if (!walletInfo) {
        throw ErrorFactory.walletNotFound();
      }

      if (walletInfo.readyState !== 'Installed') {
        throw ErrorFactory.walletNotFound();
      }

      // Disconnect current wallet if connected
      if (this.currentAdapter?.connected) {
        await this.disconnect();
      }

      // Set up event listeners
      this.setupWalletListeners(walletInfo.adapter);

      // Connect to wallet
      await walletInfo.adapter.connect();

      if (!walletInfo.adapter.publicKey) {
        throw ErrorFactory.walletConnectionFailed();
      }

      this.currentAdapter = walletInfo.adapter;

      const result: WalletConnectionResult = {
        publicKey: walletInfo.adapter.publicKey.toBase58(),
        connected: true,
        walletName: walletInfo.name
      };

      console.log(`✅ Connected to ${walletInfo.name}: ${result.publicKey}`);
      this.notifyConnectionListeners(true);

      return result;

    } catch (error) {
      if (MainframeSDKError.isMainframeError(error)) {
        throw error;
      }
      throw ErrorFactory.walletConnectionFailed(error as Error);
    }
  }

  /**
   * Disconnect current wallet
   */
  async disconnect(): Promise<void> {
    if (!this.currentAdapter) {
      return;
    }

    try {
      await this.currentAdapter.disconnect();
      this.cleanupWalletListeners(this.currentAdapter);
      this.currentAdapter = undefined as any;
      
      console.log('🔌 Wallet disconnected');
      this.notifyConnectionListeners(false);

    } catch (error) {
      console.warn('Warning: Error during wallet disconnect:', error);
      // Don't throw - disconnection should always succeed
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return !!(this.currentAdapter?.connected && this.currentAdapter?.publicKey);
  }

  /**
   * Get current wallet public key
   */
  getPublicKey(): PublicKey | null {
    return this.currentAdapter?.publicKey || null;
  }

  /**
   * Get current connected wallet's secret key
   * Note: Most browser wallet adapters don't expose secret keys for security reasons
   * This method is primarily for development/testing purposes
   */
  getSecretKey(): Uint8Array {
    if (!this.currentAdapter) {
      throw ErrorFactory.walletNotConnected();
    }

    // Check if adapter has secretKey property (for development/testing wallets)
    if ('secretKey' in this.currentAdapter && this.currentAdapter.secretKey) {
      return this.currentAdapter.secretKey as Uint8Array;
    }

    // For production wallets, secret keys are not exposed for security reasons
    throw ErrorFactory.internalError(
      'Wallet adapter does not expose secret key. This is normal for production wallets for security reasons.'
    );
  }

  /**
   * Sign transaction
   */
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    this.ensureConnected();

    try {
      // Most wallet adapters support signing, fallback to send if needed
      const adapter = this.currentAdapter!;
      if ('signTransaction' in adapter && typeof adapter.signTransaction === 'function') {
        return await adapter.signTransaction(transaction);
      }
      
      throw ErrorFactory.walletUnsupported('Transaction signing not supported');

    } catch (error) {
      if (error instanceof Error && error.message.includes('rejected')) {
        throw ErrorFactory.walletSignatureRejected();
      }
      throw ErrorFactory.internalError('Failed to sign transaction', error as Error);
    }
  }

  /**
   * Sign multiple transactions
   */
  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    this.ensureConnected();

    try {
      const adapter = this.currentAdapter!;
      if ('signAllTransactions' in adapter && typeof adapter.signAllTransactions === 'function') {
        return await adapter.signAllTransactions(transactions);
      }
      
      // Fallback to signing individually
      const signedTransactions: Transaction[] = [];
      for (const tx of transactions) {
        const signed = await this.signTransaction(tx);
        signedTransactions.push(signed);
      }
      return signedTransactions;

    } catch (error) {
      if (error instanceof Error && error.message.includes('rejected')) {
        throw ErrorFactory.walletSignatureRejected();
      }
      throw ErrorFactory.internalError('Failed to sign transactions', error as Error);
    }
  }

  /**
   * Sign message (for authentication)
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    this.ensureConnected();

    try {
      const adapter = this.currentAdapter!;
      if ('signMessage' in adapter && typeof adapter.signMessage === 'function') {
        return await adapter.signMessage(message);
      }
      
      throw ErrorFactory.walletUnsupported('Message signing not supported');

    } catch (error) {
      if (error instanceof Error && error.message.includes('rejected')) {
        throw ErrorFactory.walletSignatureRejected();
      }
      throw ErrorFactory.internalError('Failed to sign message', error as Error);
    }
  }

  /**
   * Send and confirm transaction
   */
  async sendTransaction(
    transaction: Transaction,
    connection: any, // Connection from @solana/web3.js
    options?: { skipPreflight?: boolean; preflightCommitment?: string }
  ): Promise<string> {
    this.ensureConnected();

    try {
      const signature = await this.currentAdapter!.sendTransaction(
        transaction, 
        connection, 
        options as any
      );
      return signature;

    } catch (error) {
      if (error instanceof Error && error.message.includes('rejected')) {
        throw ErrorFactory.walletSignatureRejected();
      }
      throw ErrorFactory.transactionFailed(error as Error);
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(connection: any): Promise<number> {
    this.ensureConnected();

    try {
      const balance = await connection.getBalance(this.currentAdapter!.publicKey!);
      return balance;

    } catch (error) {
      throw ErrorFactory.networkError('get balance', error as Error);
    }
  }

  /**
   * Add connection listener
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  /**
   * Auto-connect to previously connected wallet
   */
  async autoConnect(): Promise<WalletConnectionResult | null> {
    try {
      // Check for previously connected wallet in localStorage
      const lastWallet = this.getLastConnectedWallet();
      if (!lastWallet) {
        return null;
      }

      const walletInfo = this.availableWallets.get(lastWallet);
      if (!walletInfo || walletInfo.readyState !== 'Installed') {
        return null;
      }

      // Try to connect without user interaction
      if (walletInfo.adapter.connected) {
        this.currentAdapter = walletInfo.adapter;
        this.setupWalletListeners(walletInfo.adapter);
        
        return {
          publicKey: walletInfo.adapter.publicKey!.toBase58(),
          connected: true,
          walletName: walletInfo.name
        };
      }

      return null;

    } catch (error) {
      console.warn('Auto-connect failed:', error);
      return null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeWallets(): void {
    const wallets: Array<{ name: string; adapter: WalletAdapter; icon: string; url: string }> = [
      {
        name: 'Phantom',
        adapter: new PhantomWalletAdapter(),
        icon: 'https://phantom.app/img/logo.png',
        url: 'https://phantom.app'
      },
      {
        name: 'Solflare', 
        adapter: new SolflareWalletAdapter(),
        icon: 'https://solflare.com/assets/logo.svg',
        url: 'https://solflare.com'
      },
      {
        name: 'Backpack',
        adapter: new BackpackWalletAdapter(),
        icon: 'https://backpack.app/assets/logo.png',
        url: 'https://backpack.app'
      },
      {
        name: 'Glow',
        adapter: new GlowWalletAdapter(),
        icon: 'https://glow.app/assets/logo.png',
        url: 'https://glow.app'
      }
    ];

    for (const wallet of wallets) {
      const walletInfo: WalletAdapterInfo = {
        name: wallet.name,
        icon: wallet.icon,
        url: wallet.url,
        adapter: wallet.adapter,
        readyState: wallet.adapter.readyState
      };

      this.availableWallets.set(wallet.name, walletInfo);
    }
  }

  private setupWalletListeners(adapter: WalletAdapter): void {
    adapter.on('connect', this.handleConnect.bind(this));
    adapter.on('disconnect', this.handleDisconnect.bind(this));
    adapter.on('error', this.handleError.bind(this));
  }

  private cleanupWalletListeners(adapter: WalletAdapter): void {
    adapter.off('connect', this.handleConnect.bind(this));
    adapter.off('disconnect', this.handleDisconnect.bind(this));
    adapter.off('error', this.handleError.bind(this));
  }

  private handleConnect(): void {
    console.log('👛 Wallet connected');
    this.saveLastConnectedWallet();
    this.notifyConnectionListeners(true);
  }

  private handleDisconnect(): void {
    console.log('👛 Wallet disconnected');
    this.clearLastConnectedWallet();
    this.notifyConnectionListeners(false);
  }

  private handleError(error: Error): void {
    console.error('👛 Wallet error:', error);
    // Don't auto-disconnect on errors, let user handle it
  }

  private notifyConnectionListeners(connected: boolean): void {
    for (const listener of this.connectionListeners) {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    }
  }

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw ErrorFactory.walletNotConnected();
    }
  }

  private saveLastConnectedWallet(): void {
    if (typeof window !== 'undefined' && this.currentAdapter) {
      const currentWallet = this.getCurrentWallet();
      if (currentWallet) {
        localStorage.setItem('mainframe_last_wallet', currentWallet.name);
      }
    }
  }

  private clearLastConnectedWallet(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mainframe_last_wallet');
    }
  }

  private getLastConnectedWallet(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mainframe_last_wallet');
    }
    return null;
  }
}

// ============================================================================
// Wallet Utilities
// ============================================================================

export class WalletUtils {
  /**
   * Format wallet address for display
   */
  static formatAddress(address: string, chars: number = 4): string {
    if (address.length <= chars * 2) {
      return address;
    }
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  }

  /**
   * Validate Solana address format
   */
  static isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get wallet icon URL
   */
  static getWalletIcon(walletName: string): string {
    const icons: Record<string, string> = {
      'Phantom': 'https://phantom.app/img/logo.png',
      'Solflare': 'https://solflare.com/assets/logo.svg',
      'Backpack': 'https://backpack.app/assets/logo.png',
      'Glow': 'https://glow.app/assets/logo.png'
    };
    
    return icons[walletName] || '';
  }

  /**
   * Check if running in mobile environment
   */
  static isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Get deep link for mobile wallet
   */
  static getMobileWalletLink(walletName: string, dappUrl?: string): string {
    const links: Record<string, string> = {
      'Phantom': `phantom://browse/${encodeURIComponent(dappUrl || window.location.href)}`,
      'Solflare': `solflare://browse/${encodeURIComponent(dappUrl || window.location.href)}`
    };
    
    return links[walletName] || '';
  }
}

// ============================================================================
// Mock Wallet Service for Development
// ============================================================================

export class MockWalletService {
  private config: MainframeConfig;
  private mockConnected: boolean = false;
  private mockPublicKey: PublicKey = new PublicKey('11111111111111111111111111111112');
  private mockSecretKey: Uint8Array = new Uint8Array(64).fill(42);
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  constructor(config: MainframeConfig) {
    // CRITICAL: Prevent instantiation in production AND development
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'SECURITY ERROR: MockWalletService can ONLY be instantiated in testing environment (NODE_ENV=test). ' +
        'Mock services are not allowed in development or production.'
      );
    }
    this.config = config;
  }

  async connect(walletName?: string): Promise<WalletConnectionResult> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.mockConnected = true;
    this.notifyConnectionListeners(true);
    
    return {
      publicKey: this.mockPublicKey.toBase58(),
      connected: true,
      walletName: walletName || 'Mock Wallet'
    };
  }

  async disconnect(): Promise<void> {
    this.mockConnected = false;
    this.notifyConnectionListeners(false);
  }

  isConnected(): boolean {
    return this.mockConnected;
  }

  getPublicKey(): PublicKey | null {
    return this.mockConnected ? this.mockPublicKey : null;
  }

  getWalletInfo(): WalletInfo | null {
    const publicKey = this.getPublicKey();
    if (!publicKey) return null;
    
    return {
      publicKey: publicKey.toBase58(),
      secretKey: Buffer.from(this.mockSecretKey).toString('base64'),
      keypair: null
    };
  }

  getSecretKey(): Uint8Array {
    if (!this.mockConnected) {
      throw ErrorFactory.walletNotConnected();
    }
    
    // Return mock secret key for testing
    return this.mockSecretKey;
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.mockConnected) {
      throw ErrorFactory.walletNotConnected();
    }
    
    // Simulate signing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return transaction as-is (mock signing)
    return transaction;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.mockConnected) {
      throw ErrorFactory.walletNotConnected();
    }
    
    // Return mock signature
    return new Uint8Array(64).fill(1);
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  getAvailableWallets() {
    return [{ name: 'Mock Wallet', icon: '', url: '', adapter: {} as any, readyState: 'Installed' as const }];
  }

  async autoConnect() {
    return null;
  }

  async getBalance() {
    return 1000000000; // 1 SOL
  }

  private notifyConnectionListeners(connected: boolean): void {
    for (const listener of this.connectionListeners) {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    }
  }
}

// Add missing error factory methods
declare module '../utils/errors' {
  namespace ErrorFactory {
    function walletUnsupported(message: string): MainframeSDKError;
    function transactionFailed(cause?: Error): MainframeSDKError;
  }
}

// Extend ErrorFactory
Object.assign(ErrorFactory, {
  walletUnsupported(message: string): MainframeSDKError {
    return new MainframeSDKError(
      message,
      'WALLET_UNSUPPORTED'
    );
  },

  transactionFailed(cause?: Error): MainframeSDKError {
    return new MainframeSDKError(
      'Transaction failed. Please try again.',
      'TRANSACTION_FAILED',
      cause
    );
  }
});
