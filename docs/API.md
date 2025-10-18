# API Reference

## Core Classes

### MainframeSDK
Main SDK class with production features

```typescript
import { MainframeSDK, createMainnetSDK } from "@maikers/mainframe-sdk";

const sdk = createMainnetSDK(config);
```

### EncryptionService
Client-side encryption/decryption

```typescript
import { EncryptionService } from "@maikers/mainframe-sdk";
```

### StorageService
IPFS/Arweave upload/download with caching

```typescript
import { StorageService } from "@maikers/mainframe-sdk";
```

### ProgramService
Solana Anchor program integration

```typescript
import { ProgramService } from "@maikers/mainframe-sdk";
```

### WalletService
Multi-wallet connection management

```typescript
import { WalletService } from "@maikers/mainframe-sdk";
```

### EventService
Real-time event monitoring

```typescript
import { EventService } from "@maikers/mainframe-sdk";
```

### CollectionService
Metaplex Core collection management

```typescript
import { CollectionService } from "@maikers/mainframe-sdk";
```

### DataAccessService
Hybrid public/private data architecture

```typescript
import { DataAccessService } from "@maikers/mainframe-sdk";
```

## Production Security

### RateLimiter
Per-user request throttling with sliding window

```typescript
import { RateLimiter, globalRateLimiter } from "@maikers/mainframe-sdk";
```

### CircuitBreaker
Automatic failure detection and recovery

```typescript
import { CircuitBreaker } from "@maikers/mainframe-sdk";
```

### SecurityMiddleware
Operation-level security validation

```typescript
import { SecurityMiddleware, globalSecurityMiddleware } from "@maikers/mainframe-sdk";
```

### AuditLogger
Complete security event logging

```typescript
import { AuditLogger, globalAuditLogger } from "@maikers/mainframe-sdk";
```

### TokenGenerator
Cryptographically secure token generation

```typescript
import { TokenGenerator } from "@maikers/mainframe-sdk";
```

### SecuritySanitizer
Input validation and sanitization

```typescript
import { SecuritySanitizer } from "@maikers/mainframe-sdk";
```

## Performance & Monitoring

### ConnectionPool
Intelligent RPC connection management

```typescript
import { ConnectionPool, globalConnectionPool } from "@maikers/mainframe-sdk";
```

### LRUCache
Multi-tier caching with TTL

```typescript
import { LRUCache, metadataCache, accountCache, configCache } from "@maikers/mainframe-sdk";
```

### BatchProcessor
Smart operation batching

```typescript
import { BatchProcessor } from "@maikers/mainframe-sdk";
```

### MetricsCollector
Real-time performance monitoring

```typescript
import { MetricsCollector, globalMetricsCollector } from "@maikers/mainframe-sdk";
```

### ResourceMonitor
System health checks and alerting

```typescript
import { ResourceMonitor, globalResourceMonitor } from "@maikers/mainframe-sdk";
```

### MemoryManager
Automatic resource optimization

```typescript
import { MemoryManager, globalMemoryManager } from "@maikers/mainframe-sdk";
```

## Logging & Observability

### Logger
Production-grade structured logging

```typescript
import { Logger } from "@maikers/mainframe-sdk";
```

### ChildLogger
Context-aware logging instances

```typescript
import { ChildLogger } from "@maikers/mainframe-sdk";
```

### StructuredLogger
Component-specific structured logging

```typescript
import { StructuredLogger } from "@maikers/mainframe-sdk";
```

### LogConfig
Environment-specific logging configuration

```typescript
import { LogConfig, configureLogger } from "@maikers/mainframe-sdk";
```

## Utilities

### ConfigValidator
Enhanced configuration validation

```typescript
import { ConfigValidator } from "@maikers/mainframe-sdk";
```

### ErrorFactory
Comprehensive error creation with context

```typescript
import { ErrorFactory, ErrorUtils } from "@maikers/mainframe-sdk";
```

### InputSanitizer
XSS/SQL injection protection

```typescript
import { InputSanitizer } from "@maikers/mainframe-sdk";
```

### RuntimeValidator
Runtime input validation

```typescript
import { RuntimeValidator } from "@maikers/mainframe-sdk";
```

### SecurityValidator
Security-focused validation

```typescript
import { SecurityValidator } from "@maikers/mainframe-sdk";
```

## Testing & Quality Assurance

### ProductionTestSuite
Comprehensive production readiness testing

```typescript
import { ProductionTestSuite } from "@maikers/mainframe-sdk";
```

### MockMainframeSDK
Full SDK with mocked services

```typescript
import { MockMainframeSDK, createTestSDK } from "@maikers/mainframe-sdk/testing";
```

### TestFixtures
Pre-built test data

```typescript
import { TestFixtures } from "@maikers/mainframe-sdk/testing";
```

### TestHelpers
Testing utilities and assertions

```typescript
import { TestHelpers } from "@maikers/mainframe-sdk/testing";
```

## Global Instances

Access pre-configured global instances:

```typescript
import {
  globalRateLimiter,
  globalMetricsCollector,
  globalResourceMonitor,
  globalAuditLogger,
  globalSecurityMiddleware,
  globalConnectionPool,
  globalMemoryManager,
  metadataCache,
  accountCache,
  configCache
} from "@maikers/mainframe-sdk";
```



