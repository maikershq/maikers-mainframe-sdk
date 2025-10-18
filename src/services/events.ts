/**
 * Event service for Mainframe SDK
 * 
 * Handles real-time monitoring of on-chain events and mainframe-node events.
 * Provides subscription-based event listening for agent lifecycle and operations.
 */

import { Connection, PublicKey, Logs } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import type {
  MainframeConfig,
  EventSubscription,
  AgentCreatedEvent,
  AgentUpdatedEvent,
  AgentTransferredEvent,
  AgentPausedEvent,
  AgentResumedEvent,
  AgentClosedEvent,
  AgentDeployedEvent,
  AgentErrorEvent
} from '../types';
import { ErrorFactory, MainframeSDKError } from '../utils/errors';

export type EventCallback<T = any> = (event: T) => void;
export type EventFilter = Record<string, any>;

interface Subscription {
  id: string;
  eventType: string;
  callback: EventCallback;
  filter?: EventFilter | undefined;
  active: boolean;
}

interface WebSocketConnection {
  ws: WebSocket;
  connected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export class EventService {
  private config: MainframeConfig;
  private connection: Connection;
  private program?: Program;
  private subscriptions: Map<string, Subscription> = new Map();
  private subscriptionCounter: number = 0;
  
  // WebSocket for mainframe-node events
  private nodeWsConnection?: WebSocketConnection | undefined;
  private nodeWsUrl?: string;
  
  // On-chain event monitoring
  private logSubscriptionId?: number | undefined;
  private isMonitoring: boolean = false;

  constructor(config: MainframeConfig, connection: Connection) {
    this.config = config;
    this.connection = connection;
  }

  /**
   * Initialize event service
   */
  async initialize(program?: Program, nodeWsUrl?: string): Promise<void> {
    if (program) {
      this.program = program;
    }
    if (nodeWsUrl) {
      this.nodeWsUrl = nodeWsUrl;
    }

    // Start monitoring on-chain events
    await this.startOnChainMonitoring();

    // Connect to mainframe-node WebSocket if URL provided
    if (nodeWsUrl) {
      await this.connectToNode();
    }

    console.log('✅ Event service initialized');
  }

  /**
   * Cleanup and stop all monitoring
   */
  async cleanup(): Promise<void> {
    // Stop on-chain monitoring
    await this.stopOnChainMonitoring();

    // Disconnect from node WebSocket
    if (this.nodeWsConnection) {
      this.disconnectFromNode();
    }

    // Clear all subscriptions
    this.subscriptions.clear();
    
    console.log('🧹 Event service cleaned up');
  }

  // ============================================================================
  // On-Chain Event Subscriptions
  // ============================================================================

  /**
   * Listen for agent created events
   */
  onAgentCreated(
    callback: EventCallback<AgentCreatedEvent>,
    filter?: EventFilter
  ): EventSubscription {
    return this.subscribe('AgentCreated', callback, filter);
  }

  /**
   * Listen for agent updated events
   */
  onAgentUpdated(
    callback: EventCallback<AgentUpdatedEvent>,
    filter?: EventFilter
  ): EventSubscription {
    return this.subscribe('AgentUpdated', callback, filter);
  }

  /**
   * Listen for agent transferred events
   */
  onAgentTransferred(
    callback: EventCallback<AgentTransferredEvent>,
    filter?: EventFilter
  ): EventSubscription {
    return this.subscribe('AgentTransferred', callback, filter);
  }

  /**
   * Listen for agent paused events
   */
  onAgentPaused(
    callback: EventCallback<AgentPausedEvent>,
    filter?: EventFilter
  ): EventSubscription {
    return this.subscribe('AgentPaused', callback, filter);
  }

  /**
   * Listen for agent resumed events
   */
  onAgentResumed(
    callback: EventCallback<AgentResumedEvent>,
    filter?: EventFilter
  ): EventSubscription {
    return this.subscribe('AgentResumed', callback, filter);
  }

  /**
   * Listen for agent closed events
   */
  onAgentClosed(
    callback: EventCallback<AgentClosedEvent>,
    filter?: EventFilter
  ): EventSubscription {
    return this.subscribe('AgentClosed', callback, filter);
  }

  // ============================================================================
  // Mainframe-Node Event Subscriptions
  // ============================================================================

  /**
   * Listen for agent deployed events (from mainframe-node)
   */
  onAgentDeployed(
    agentAccount: string,
    callback: EventCallback<AgentDeployedEvent>
  ): EventSubscription {
    return this.subscribeNodeEvent(`agent.deployed.${agentAccount}`, callback);
  }

  /**
   * Listen for agent error events (from mainframe-node)
   */
  onAgentError(
    agentAccount: string,
    callback: EventCallback<AgentErrorEvent>
  ): EventSubscription {
    return this.subscribeNodeEvent(`agent.error.${agentAccount}`, callback);
  }

  /**
   * Listen for general node events
   */
  onNodeEvent(
    eventType: string,
    callback: EventCallback,
    filter?: EventFilter
  ): EventSubscription {
    return this.subscribeNodeEvent(eventType, callback, filter);
  }

  // ============================================================================
  // Event History and Queries
  // ============================================================================

  /**
   * Get historical events for an agent
   */
  async getAgentHistory(
    agentAccount: string,
    eventTypes?: string[],
    limit: number = 100
  ): Promise<any[]> {
    try {
      if (!this.program) {
        throw ErrorFactory.internalError('Program not initialized');
      }

      // Query transaction signatures for this agent account
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(agentAccount),
        { limit: Math.min(limit, 1000) }
      );

      const events: any[] = [];

      // Parse transactions to extract events
      for (const sigInfo of signatures) {
        try {
          const tx = await this.connection.getTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0
          });

          if (!tx || !tx.meta) continue;

          // Extract events from transaction logs
          const logs = tx.meta.logMessages || [];
          
          for (const log of logs) {
            // Parse Anchor program events from logs
            if (log.includes('Program log:')) {
              const eventData = this.parseEventFromLog(log);
              if (eventData) {
                const event = {
                  type: eventData.type,
                  agentAccount,
                  timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
                  signature: sigInfo.signature,
                  data: eventData.data,
                  slot: tx.slot
                };

                // Filter by event types if specified
                if (!eventTypes || eventTypes.includes(event.type)) {
                  events.push(event);
                }

                if (events.length >= limit) break;
              }
            }
          }

          if (events.length >= limit) break;
        } catch (txError) {
          // Skip failed transaction fetches
          continue;
        }
      }

      return events;

    } catch (error) {
      throw ErrorFactory.internalError('Failed to get agent history', error as Error);
    }
  }

  /**
   * Get recent events across all agents
   */
  async getRecentEvents(
    eventTypes?: string[],
    limit: number = 50
  ): Promise<any[]> {
    try {
      if (!this.program) {
        throw ErrorFactory.internalError('Program not initialized');
      }

      // Query recent signatures for the program
      const programId = this.program.programId;
      const signatures = await this.connection.getSignaturesForAddress(
        programId,
        { limit: Math.min(limit * 2, 1000) } // Fetch more to filter
      );

      const events: any[] = [];

      // Parse transactions to extract events
      for (const sigInfo of signatures) {
        try {
          const tx = await this.connection.getTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0
          });

          if (!tx || !tx.meta) continue;

          // Extract events from transaction logs
          const logs = tx.meta.logMessages || [];
          
          for (const log of logs) {
            // Parse Anchor program events from logs
            if (log.includes('Program log:')) {
              const eventData = this.parseEventFromLog(log);
              if (eventData) {
                const event = {
                  type: eventData.type,
                  agentAccount: eventData.agentAccount || 'Unknown',
                  timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
                  signature: sigInfo.signature,
                  data: eventData.data,
                  slot: tx.slot
                };

                // Filter by event types if specified
                if (!eventTypes || eventTypes.includes(event.type)) {
                  events.push(event);
                }

                if (events.length >= limit) break;
              }
            }
          }

          if (events.length >= limit) break;
        } catch (txError) {
          // Skip failed transaction fetches
          continue;
        }
      }

      return events;

    } catch (error) {
      throw ErrorFactory.internalError('Failed to get recent events', error as Error);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Parse event data from transaction log
   */
  private parseEventFromLog(log: string): { type: string; data: any; agentAccount?: string } | null {
    try {
      // Extract program log data
      // Format: "Program log: EVENT_TYPE: {data}"
      const logMatch = log.match(/Program log: (\w+)(?:: (.+))?/);
      if (!logMatch) return null;

      const eventType = logMatch[1];
      const dataStr = logMatch[2];

      // Map known event types
      const eventTypeMap: Record<string, string> = {
        'AgentCreated': 'AgentCreated',
        'AgentUpdated': 'AgentUpdated',
        'AgentTransferred': 'AgentTransferred',
        'AgentPaused': 'AgentPaused',
        'AgentResumed': 'AgentResumed',
        'AgentClosed': 'AgentClosed',
        'AgentDeployed': 'AgentDeployed',
        'AgentError': 'AgentError'
      };

      if (!eventType) return null;
      
      const mappedType = eventTypeMap[eventType];
      if (!mappedType) return null;

      let data: any = {};
      let agentAccount: string | undefined;

      // Try to parse JSON data if present
      if (dataStr) {
        try {
          data = JSON.parse(dataStr);
          agentAccount = data.agentAccount || data.agent_account;
        } catch {
          // If not JSON, treat as plain text
          data = { message: dataStr };
        }
      }

      const result: { type: string; data: any; agentAccount?: string } = {
        type: mappedType,
        data
      };
      
      if (agentAccount) {
        result.agentAccount = agentAccount;
      }

      return result;
    } catch (error) {
      return null;
    }
  }

  private subscribe(
    eventType: string,
    callback: EventCallback,
    filter?: EventFilter
  ): EventSubscription {
    const subscriptionId = `sub_${++this.subscriptionCounter}`;
    
    const subscription: Subscription = {
      id: subscriptionId,
      eventType,
      callback,
      filter,
      active: true
    };

    this.subscriptions.set(subscriptionId, subscription);

    return {
      unsubscribe: () => {
        const sub = this.subscriptions.get(subscriptionId);
        if (sub) {
          sub.active = false;
          this.subscriptions.delete(subscriptionId);
        }
      }
    };
  }

  private subscribeNodeEvent(
    eventType: string,
    callback: EventCallback,
    filter?: EventFilter
  ): EventSubscription {
    // Subscribe to WebSocket events from mainframe-node
    const subscription = this.subscribe(`node.${eventType}`, callback, filter);

    // Send subscription message to node WebSocket
    if (this.nodeWsConnection?.connected) {
      this.sendNodeMessage({
        type: 'subscribe',
        event: eventType,
        filter
      });
    }

    return subscription;
  }

  private async startOnChainMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    try {
      // Subscribe to program logs
      const programId = new PublicKey(this.config.programId);
      
      this.logSubscriptionId = this.connection.onLogs(
        programId,
        this.handleProgramLogs.bind(this),
        'confirmed'
      );

      this.isMonitoring = true;
      console.log('📡 Started on-chain event monitoring');

    } catch (error) {
      throw ErrorFactory.internalError('Failed to start on-chain monitoring', error as Error);
    }
  }

  private async stopOnChainMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    try {
      if (this.logSubscriptionId !== undefined) {
        await this.connection.removeOnLogsListener(this.logSubscriptionId);
      }
      this.logSubscriptionId = undefined;

      this.isMonitoring = false;
      console.log('📡 Stopped on-chain event monitoring');

    } catch (error) {
      console.warn('Warning: Error stopping on-chain monitoring:', error);
    }
  }

  private handleProgramLogs(logs: Logs, context: any): void {
    try {
      // Parse program logs to extract events
      const events = this.parseProgramLogs(logs);
      
      for (const event of events) {
        this.notifySubscribers(event.type, event.data);
      }

    } catch (error) {
      console.error('Error handling program logs:', error);
    }
  }

  private parseProgramLogs(logs: Logs): Array<{ type: string; data: any }> {
    const events: Array<{ type: string; data: any }> = [];

    for (const log of logs.logs) {
      // Parse Anchor program events from logs
      // This is a simplified implementation - real parsing would be more complex
      
      if (log.includes('AgentCreated')) {
        events.push({
          type: 'AgentCreated',
          data: this.parseEventData(log, 'AgentCreated')
        });
      } else if (log.includes('AgentUpdated')) {
        events.push({
          type: 'AgentUpdated', 
          data: this.parseEventData(log, 'AgentUpdated')
        });
      } else if (log.includes('AgentTransferred')) {
        events.push({
          type: 'AgentTransferred',
          data: this.parseEventData(log, 'AgentTransferred')
        });
      } else if (log.includes('AgentPaused')) {
        events.push({
          type: 'AgentPaused',
          data: this.parseEventData(log, 'AgentPaused')
        });
      } else if (log.includes('AgentResumed')) {
        events.push({
          type: 'AgentResumed',
          data: this.parseEventData(log, 'AgentResumed')
        });
      } else if (log.includes('AgentClosed')) {
        events.push({
          type: 'AgentClosed',
          data: this.parseEventData(log, 'AgentClosed')
        });
      }
    }

    return events;
  }

  private parseEventData(log: string, eventType: string): any {
    // Simplified event data parsing
    // In real implementation, this would properly decode Anchor event data
    return {
      eventType,
      timestamp: Date.now(),
      rawLog: log
      // Additional fields would be parsed from the actual log data
    };
  }

  private notifySubscribers(eventType: string, eventData: any): void {
    for (const subscription of this.subscriptions.values()) {
      if (!subscription.active) {
        continue;
      }

      // Check if subscription matches event type
      if (subscription.eventType !== eventType) {
        continue;
      }

      // Apply filter if present
      if (subscription.filter && !this.matchesFilter(eventData, subscription.filter)) {
        continue;
      }

      try {
        subscription.callback(eventData);
      } catch (error) {
        console.error(`Error in event callback for ${eventType}:`, error);
      }
    }
  }

  private matchesFilter(eventData: any, filter: EventFilter): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (eventData[key] !== value) {
        return false;
      }
    }
    return true;
  }

  // ============================================================================
  // WebSocket Connection to Mainframe-Node
  // ============================================================================

  private async connectToNode(): Promise<void> {
    if (!this.nodeWsUrl) {
      return;
    }

    try {
      const ws = new WebSocket(this.nodeWsUrl);
      
      this.nodeWsConnection = {
        ws,
        connected: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5
      };

      ws.onopen = this.handleNodeWsOpen.bind(this);
      ws.onmessage = this.handleNodeWsMessage.bind(this);
      ws.onclose = this.handleNodeWsClose.bind(this);
      ws.onerror = this.handleNodeWsError.bind(this);

    } catch (error) {
      console.error('Failed to connect to mainframe-node WebSocket:', error);
    }
  }

  private disconnectFromNode(): void {
    if (this.nodeWsConnection) {
      this.nodeWsConnection.ws.close();
    }
    this.nodeWsConnection = undefined;
  }

  private handleNodeWsOpen(): void {
    if (this.nodeWsConnection) {
      this.nodeWsConnection.connected = true;
      this.nodeWsConnection.reconnectAttempts = 0;
      console.log('🔗 Connected to mainframe-node WebSocket');
    }
  }

  private handleNodeWsMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'event') {
        this.notifySubscribers(`node.${message.event}`, message.data);
      }

    } catch (error) {
      console.error('Error handling node WebSocket message:', error);
    }
  }

  private handleNodeWsClose(): void {
    if (this.nodeWsConnection) {
      this.nodeWsConnection.connected = false;
      console.log('🔗 Disconnected from mainframe-node WebSocket');
      
      // Attempt reconnection
      this.scheduleNodeReconnect();
    }
  }

  private handleNodeWsError(error: Event): void {
    console.error('mainframe-node WebSocket error:', error);
  }

  private scheduleNodeReconnect(): void {
    if (!this.nodeWsConnection || !this.nodeWsUrl) {
      return;
    }

    const { reconnectAttempts, maxReconnectAttempts } = this.nodeWsConnection;
    
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for mainframe-node WebSocket');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    
    setTimeout(() => {
      if (this.nodeWsConnection) {
        this.nodeWsConnection.reconnectAttempts++;
        this.connectToNode();
      }
    }, delay);
  }

  private sendNodeMessage(message: any): void {
    if (this.nodeWsConnection?.connected) {
      this.nodeWsConnection.ws.send(JSON.stringify(message));
    }
  }
}

// ============================================================================
// Event Utilities
// ============================================================================

export class EventUtils {
  /**
   * Create event filter for specific agent
   */
  static filterByAgent(agentAccount: string): EventFilter {
    return { agentAccount };
  }

  /**
   * Create event filter for specific owner
   */
  static filterByOwner(owner: string): EventFilter {
    return { owner };
  }

  /**
   * Create event filter for specific NFT collection
   */
  static filterByCollection(collectionMint: string): EventFilter {
    return { collectionMint };
  }

  /**
   * Combine multiple filters with AND logic
   */
  static combineFilters(...filters: EventFilter[]): EventFilter {
    return Object.assign({}, ...filters);
  }

  /**
   * Format event timestamp for display
   */
  static formatEventTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Get event type display name
   */
  static getEventDisplayName(eventType: string): string {
    const displayNames: Record<string, string> = {
      'AgentCreated': 'Agent Created',
      'AgentUpdated': 'Configuration Updated',
      'AgentTransferred': 'Ownership Transferred',
      'AgentPaused': 'Agent Paused',
      'AgentResumed': 'Agent Resumed',
      'AgentClosed': 'Agent Closed',
      'AgentDeployed': 'Agent Deployed',
      'AgentError': 'Agent Error'
    };
    
    return displayNames[eventType] || eventType;
  }
}

// ============================================================================
// Mock Event Service for Development
// ============================================================================

export class MockEventService extends EventService {
  private mockEvents: any[] = [];
  private eventTimer?: NodeJS.Timeout | undefined;

  constructor(config: MainframeConfig, connection: Connection) {
    // CRITICAL: Prevent instantiation in production AND development
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'SECURITY ERROR: MockEventService can ONLY be instantiated in testing environment (NODE_ENV=test). ' +
        'Mock services are not allowed in development or production.'
      );
    }
    super(config, connection);
  }

  async initialize(): Promise<void> {
    // Start generating mock events
    this.startMockEventGeneration();
    console.log('✅ Mock event service initialized');
  }

  async cleanup(): Promise<void> {
    if (this.eventTimer) {
      clearInterval(this.eventTimer);
    }
    this.eventTimer = undefined;
    console.log('🧹 Mock event service cleaned up');
  }

  private startMockEventGeneration(): void {
    // Generate mock events every 10 seconds
    this.eventTimer = setInterval(() => {
      this.generateMockEvent();
    }, 10000);
  }

  private generateMockEvent(): void {
    const eventTypes = ['AgentCreated', 'AgentUpdated', 'AgentPaused', 'AgentResumed'];
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    const mockEvent = {
      type: randomType,
      agentAccount: `MockAgent${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      data: { mock: true }
    };

    this.mockEvents.push(mockEvent);
    (this as any).notifySubscribers(randomType, mockEvent);
  }
}
