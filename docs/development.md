# Development Guide

Complete setup and development workflow for contributing to the Mainframe SDK.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | ≥18.0.0 | JavaScript runtime (LTS recommended) |
| **pnpm** | ≥8.0.0 | Package manager (preferred over npm/yarn) |
| **TypeScript** | ≥5.0.0 | Type checking and compilation |
| **Git** | Latest | Version control |

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/maikershq/maikers-mainframe-sdk
cd maikers-mainframe-sdk
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build Project

```bash
pnpm run build
```

This will:
- Sync the latest Anchor program IDL from `../maikers-mainframe`
- Clean previous build artifacts
- Generate TypeScript declarations
- Build CommonJS and ES module outputs

## Development Workflow

### Development Scripts

```bash
# Development build with file watching
pnpm run dev

# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run only security tests
pnpm run test:security

# Generate coverage report
pnpm run test:coverage

# Lint code
pnpm run lint

# Auto-fix linting issues
pnpm run lint:fix
```

### Build Targets

The SDK builds multiple output formats:

| Target | Directory | Purpose |
|--------|-----------|---------|
| **CommonJS** | `dist/cjs/` | Node.js compatibility |
| **ES Modules** | `dist/esm/` | Modern bundlers |
| **Type Declarations** | `dist/types/` | TypeScript IntelliSense |
| **Browser** | `dist/browser/` | Direct browser usage (future) |

### File Structure

```
src/
├── services/           # Core SDK services
│   ├── encryption.ts   # XChaCha20 encryption
│   ├── storage.ts      # IPFS/Arweave integration  
│   ├── wallet.ts       # Wallet management
│   ├── program.ts      # Solana program interface
│   └── events.ts       # Event monitoring
├── integrations/       # Framework integrations
│   ├── anchor.ts       # Anchor framework
│   ├── wallet-adapters.ts # Solana wallet adapters
│   └── index.ts        # QuickStart integrations
├── utils/              # Utility functions
│   ├── security.ts     # Security utilities
│   ├── validation.ts   # Input validation
│   ├── errors.ts       # Error definitions
│   └── logging.ts      # Logging system
├── types/              # TypeScript definitions
├── testing/            # Test utilities
└── idl/               # Anchor program IDL
```

## Testing

### Test Categories

**Unit Tests**
```bash
pnpm test
```
- Core functionality testing
- Service integration testing  
- Error handling verification

**Security Tests**
```bash
pnpm run test:security
```
- Encryption audit tests (23 test cases)
- Input validation testing
- Access control verification
- Rate limiting and circuit breaker testing

**Production Tests**
```bash
pnpm run test:production
```
- Performance benchmarking
- Memory usage validation
- Connection pooling efficiency
- Health check validation

### Coverage Requirements

- **Minimum**: 90% code coverage for new features
- **Security**: 100% coverage for encryption and security utilities
- **Critical Paths**: 100% coverage for agent creation and management

## Code Standards

### TypeScript Configuration

- **Strict Mode**: Enabled for maximum type safety
- **No Any**: Avoid `any` types, use proper generics
- **ESLint**: Enforced code style and quality rules
- **Prettier**: Consistent code formatting

### Commit Standards

Use [Conventional Commits](https://conventionalcommits.org/):

```bash
# Feature addition
git commit -m "feat: add batch agent creation support"

# Bug fix
git commit -m "fix: resolve wallet connection timeout"

# Documentation update  
git commit -m "docs: add affiliate program examples"

# Breaking change
git commit -m "feat!: update createAgent API signature"

# Performance improvement
git commit -m "perf: optimize encryption service initialization"
```

### Security Requirements

All changes must pass security validation:

```bash
# Security audit
pnpm run security-audit

# Vulnerability scanning
pnpm audit

# Security-specific tests
pnpm run test:security
```

## Release Process

### Version Management

Mainframe SDK follows [Semantic Versioning](https://semver.org/):

- **Patch** (1.0.1): Bug fixes, security patches
- **Minor** (1.1.0): New features, performance improvements  
- **Major** (2.0.0): Breaking changes, API modifications

### Release Checklist

1. **Code Quality**
   ```bash
   pnpm run lint
   pnpm run build  
   pnpm run test:coverage
   ```

2. **Security Validation**
   ```bash
   pnpm run test:security
   pnpm run security-audit
   ```

3. **Documentation**
   - Update README if API changes
   - Update CHANGELOG with version changes
   - Verify all doc links work

4. **Version & Publish**
   ```bash
   pnpm version patch|minor|major
   pnpm publish --access public
   ```

## Debugging

### Common Development Issues

**Build Failures**
```bash
# Clean and rebuild
pnpm run clean
pnpm run build
```

**Test Failures**
```bash
# Run specific test file
pnpm test __tests__/encryption-audit.test.ts

# Debug test with verbose output
pnpm test --verbose --no-cache
```

**ESLint Errors**
```bash
# Auto-fix most issues
pnpm run lint:fix

# Check specific file
pnpm run lint src/services/encryption.ts
```

### Development Tools

**Recommended VS Code Extensions:**
- TypeScript Importer
- ESLint
- Prettier
- Jest Runner
- GitLens

**Environment Variables for Development:**
```bash
# .env.development
NODE_ENV=development
DEBUG=mainframe:*
SOLANA_NETWORK=devnet
```

## Architecture Decisions

### Design Principles

1. **Security First**: All data encrypted client-side, zero-knowledge architecture
2. **Type Safety**: Comprehensive TypeScript coverage with strict mode
3. **Performance**: Connection pooling, caching, and batch operations
4. **Developer Experience**: Clear APIs, comprehensive error handling, extensive documentation
5. **Production Ready**: Enterprise monitoring, logging, and reliability features

### Key Architectural Choices

**Encryption**: XChaCha20-Poly1305 AEAD for authenticated encryption
**Storage**: Multi-provider support (Arweave primary, IPFS fallback)  
**Caching**: Multi-tier LRU with TTL for optimal performance
**Error Handling**: Typed error system with recovery strategies
**Event System**: Real-time monitoring with WebSocket fallback

## Contributing Workflow

### 1. Issue Creation
- Check existing issues before creating new ones
- Use issue templates for bug reports and feature requests
- Provide detailed reproduction steps for bugs

### 2. Development Process
- Create feature branch: `feature/your-feature-name`
- Make atomic commits with conventional commit messages  
- Add tests for new functionality
- Update documentation as needed

### 3. Pull Request Process
- Ensure all tests pass locally
- Include clear description of changes
- Reference related issues
- Add examples if introducing new APIs
- Request review from maintainers

### 4. Code Review Standards
- **Security**: All changes reviewed for security implications
- **Performance**: Benchmark impact of performance-critical changes
- **Compatibility**: Ensure backward compatibility unless major version
- **Documentation**: APIs must be documented before merge

## Need Help?

- **Discord**: [discord.gg/maikers](https://discord.gg/maikers) - Community support
- **GitHub Issues**: Technical questions and bug reports
- **Email**: [enterprise@maikers.com](mailto:enterprise@maikers.com) - Partnership inquiries

---

**Happy building!** 🚀
