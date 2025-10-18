# Release Management

This document outlines the release process for the Mainframe SDK, including versioning, automation, and best practices.

## 📋 Overview

The Mainframe SDK uses **semantic versioning** with **conventional commits** to automate releases, changelog generation, and npm publishing through GitHub Actions.

## 🔄 Release Types

| Type | Description | Version Change | When to Use |
|------|-------------|----------------|-------------|
| **patch** | Bug fixes, security patches | `1.0.0 → 1.0.1` | Backward compatible fixes |
| **minor** | New features, enhancements | `1.0.0 → 1.1.0` | Backward compatible features |
| **major** | Breaking changes | `1.0.0 → 2.0.0` | API breaking changes |
| **prerelease** | Beta versions | `1.0.0 → 1.0.1-0` | Testing new features |

## 🚀 Quick Release

### Method 1: Interactive Script (Recommended)
```bash
# Check current version status
pnpm run check-version

# Create a patch release (bug fixes)
pnpm run release-patch

# Create a minor release (new features)  
pnpm run release-minor

# Create a major release (breaking changes)
pnpm run release-major

# Create a prerelease
pnpm run release-pre
```

### Method 2: Standard Version Commands
```bash
# Patch release
pnpm run release:patch

# Minor release
pnpm run release:minor

# Major release
pnpm run release:major

# Prerelease
pnpm run release:pre
```

### Method 3: GitHub Actions (Manual Trigger)
1. Go to **Actions** tab in GitHub
2. Select **Release & Publish** workflow
3. Click **Run workflow**
4. Choose release type
5. Click **Run workflow** button

## 📝 Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Release Impact |
|------|-------------|----------------|
| `feat` | New feature | minor |
| `fix` | Bug fix | patch |
| `security` | Security fix | patch |
| `perf` | Performance improvement | patch |
| `docs` | Documentation | none |
| `style` | Code style changes | none |
| `refactor` | Code refactoring | none |
| `test` | Adding tests | none |
| `build` | Build system changes | none |
| `ci` | CI configuration | none |
| `chore` | Maintenance tasks | none |

### Examples

```bash
# New feature (minor release)
git commit -m "feat: add agent pause/resume functionality"

# Bug fix (patch release)  
git commit -m "fix: resolve encryption key rotation issue"

# Breaking change (major release)
git commit -m "feat!: redesign agent configuration API

BREAKING CHANGE: AgentConfig interface has been restructured"

# Security fix (patch release)
git commit -m "security: implement rate limiting for API calls"

# Performance improvement (patch release)
git commit -m "perf: optimize metadata caching strategy"
```

## 🔧 Manual Release Process

### 1. Pre-Release Checklist

```bash
# Ensure working directory is clean
git status

# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Check version status
pnpm run check-version

# Run all tests
pnpm test

# Run security audit
pnpm run security-audit

# Run linting
pnpm run lint
```

### 2. Create Release

```bash
# Example: Create minor release
pnpm run release-minor
```

This will:
- ✅ Run all pre-release checks
- ✅ Bump version number in package.json
- ✅ Generate changelog entries
- ✅ Create git commit and tag
- ✅ Provide next steps

### 3. Push and Publish

```bash
# Push changes and tags
git push --follow-tags

# CI will automatically:
# - Build and test
# - Publish to npm 
# - Create GitHub release
# - Notify Discord
```

## 🤖 Automated CI/CD

### GitHub Actions Workflows

#### 1. **CI Pipeline** (`.github/workflows/ci.yml`)
Runs on every push and PR:
- Linting and type checking
- Unit, security, and performance tests
- Build verification
- Security scanning

#### 2. **Release & Publish** (`.github/workflows/release.yml`)
Triggered by:
- Manual workflow dispatch
- Version changes in package.json

Process:
1. **Version Check** - Detect version changes
2. **Build & Test** - Full test suite
3. **Publish npm** - Publish to registry
4. **GitHub Release** - Create release with changelog
5. **Notifications** - Discord alerts

### Environment Variables Required

Set these in GitHub repository secrets:

```bash
NPM_TOKEN=npm_xxxxxxxxxxxxx           # npm publishing
CODECOV_TOKEN=xxxxxxxxxxxxx           # Code coverage
DISCORD_WEBHOOK=https://discord.com/xxx # Release notifications
```

## 📊 Version Management

### Check Release Status
```bash
# Check if current version is published
pnpm run check-version

# View published versions
npm view @maikers/mainframe-sdk versions --json

# Check package info
npm info @maikers/mainframe-sdk
```

### Version Bump Only (No Release)
```bash
# Bump version without releasing
pnpm run version:patch
pnpm run version:minor  
pnpm run version:major
```

## 🔍 Release Validation

### After Publishing
```bash
# Verify npm package
npm info @maikers/mainframe-sdk@latest

# Install and test
npm install @maikers/mainframe-sdk@latest

# Check bundle size
npm info @maikers/mainframe-sdk dist.size

# Security audit
npm audit @maikers/mainframe-sdk
```

### GitHub Release Verification
- ✅ Release notes generated from CHANGELOG.md
- ✅ Assets include source code
- ✅ Tag matches package.json version
- ✅ Installation instructions provided

## 🚨 Troubleshooting

### Common Issues

#### "Version already published"
```bash
# Check what's published
npm view @maikers/mainframe-sdk versions

# Create new version
pnpm run release-patch
```

#### "Working directory not clean"
```bash
# Stash changes
git stash

# Or commit changes
git add . && git commit -m "chore: prepare for release"
```

#### "Tests failing"
```bash
# Run specific test suites
pnpm run test:security
pnpm run test:performance

# Fix issues and retry
pnpm run release-patch
```

#### "CI publishing failed"
```bash
# Check GitHub Actions logs
# Verify NPM_TOKEN is valid
# Re-run failed workflow
```

### Emergency Hotfix Process

For critical security or bug fixes:

```bash
# Create hotfix branch
git checkout -b hotfix/critical-security-fix

# Make minimal changes
# ... fix the issue ...

# Commit with proper message
git commit -m "security: fix critical vulnerability in encryption"

# Merge to main
git checkout main
git merge hotfix/critical-security-fix

# Create patch release
pnpm run release-patch

# Push immediately  
git push --follow-tags

# Monitor CI for automatic publishing
```

## 📈 Release Metrics

Track these metrics for each release:

- **Build Time** - CI/CD pipeline duration
- **Test Coverage** - Maintain 90%+ coverage
- **Bundle Size** - Monitor package size growth
- **Security Score** - Zero high/critical vulnerabilities
- **Download Count** - npm package adoption
- **GitHub Stars** - Community engagement

## 🔗 Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)

## 🤝 Release Team

| Role | Responsibility |
|------|----------------|
| **Maintainers** | Approve releases, manage versioning |
| **CI/CD** | Automated testing and publishing |
| **Security** | Vulnerability scanning and fixes |
| **Community** | Bug reports and feature requests |

---

**Need help?** Create an issue or ask in Discord for release-related questions.
