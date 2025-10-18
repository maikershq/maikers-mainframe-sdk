# Changelog

All notable changes to the Mainframe SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-20

### 💥 **Breaking Changes**
- **REMOVED**: IPFS support entirely to eliminate Electron dependencies
- **REMOVED**: `primary` and `fallback` storage configuration options  
- **REMOVED**: All IPFS-related configuration options (`ipfs` object)

### 🔄 **Changed**
- Storage configuration now only supports Arweave
- Simplified `StorageConfig` interface to only require `arweave` configuration
- Updated all SDK factory methods to use Arweave-only configuration
- Updated validation logic to only validate Arweave configuration

### 📖 **Migration Guide**
Replace storage configuration:
```typescript
// Before
storage: {
  primary: 'arweave',
  fallback: ['ipfs'],  
  arweave: { gateway: 'https://arweave.net' },
  ipfs: { gateway: 'https://ipfs.io/ipfs/' }
}

// After
storage: {
  arweave: { gateway: 'https://arweave.net' }
}
```

## [1.0.4] - 2025-01-20

### 🔧 **Fixed**
- **CRITICAL**: Fixed WalletAdapterMainframeSDK circular dependency issue that prevented proper initialization
- **CRITICAL**: Made ProgramService more flexible to support different provider scenarios
- Fixed "SDK not initialized" error when using QuickStartIntegrations.walletAdapter()

### ✨ **Added**
- **NEW**: Added unified QuickStartIntegrations.unified() method that tries multiple approaches with intelligent fallbacks
- **NEW**: Added comprehensive MainframeIntegrationDiagnostics module for debugging integration issues
- **NEW**: Enhanced QuickStartIntegrations with auto-initialization and better error handling
- Added automatic provider creation in WalletAdapterMainframeSDK for seamless wallet integration
- Added flexibility to ProgramService to handle AnchorProvider, Connection, or auto-creation scenarios

### 🔄 **Changed**
- Enhanced QuickStartIntegrations methods to be async with automatic initialization
- Improved error messages and debugging information across integration points
- Updated all QuickStartIntegrations to use consistent patterns and error handling

### 🏗️ **Technical Details**
- WalletAdapterMainframeSDK now creates AnchorProvider internally to resolve circular dependency
- ProgramService supports multiple initialization patterns: AnchorProvider, Connection, or auto-creation
- Enhanced QuickStartIntegrations with unified approach that tries Anchor first, falls back to WalletAdapter
- Added integration diagnostics with automatic issue detection and fix suggestions

### 🎯 **Impact**
This patch release resolves critical integration issues that prevented the SDK from working properly with wallet adapters. 
Users should now be able to use both Anchor and WalletAdapter approaches seamlessly, with automatic fallbacks 
and comprehensive error diagnostics to help with any remaining integration issues.

### 🔗 **Migration Guide**
This is a **patch release** with backward compatibility. Existing code using `QuickStartIntegrations.walletAdapter()` 
will now work correctly without any code changes required.

For enhanced reliability, consider switching to the new unified approach:

```typescript
// EXISTING (now works properly - no changes needed)
const sdk = await QuickStartIntegrations.walletAdapter(adapter, connection, config);

// NEW (recommended for maximum compatibility)
const sdk = await QuickStartIntegrations.unified(adapter, connection, config);
```

---

## [1.0.3] - Previous Release

### Features
- Basic SDK functionality
- Encryption services
- Storage integration
- Anchor and wallet adapter support (with known issues)