#!/usr/bin/env node

/**
 * Release Management Script
 * 
 * Provides interactive release management with safety checks and validation.
 * Usage: node scripts/release.js [type]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
  } catch (error) {
    log(`❌ Command failed: ${command}`, 'red');
    process.exit(1);
  }
}

function getCurrentVersion() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return pkg.version;
}

function validateReleaseType(type) {
  const validTypes = ['patch', 'minor', 'major', 'prerelease'];
  if (!validTypes.includes(type)) {
    log(`❌ Invalid release type: ${type}`, 'red');
    log(`Valid types: ${validTypes.join(', ')}`, 'yellow');
    process.exit(1);
  }
}

function runPreReleaseChecks() {
  log('🔍 Running pre-release checks...', 'cyan');
  
  // Check git status
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('❌ Working directory not clean. Please commit or stash changes.', 'red');
      process.exit(1);
    }
  } catch (error) {
    log('❌ Failed to check git status', 'red');
    process.exit(1);
  }

  // Check current branch
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    if (branch !== 'main') {
      log(`⚠️  Current branch is '${branch}', not 'main'`, 'yellow');
      log('Releases should typically be made from the main branch.', 'yellow');
    }
  } catch (error) {
    log('⚠️  Could not determine current branch', 'yellow');
  }

  // Run tests
  log('🧪 Running tests...', 'cyan');
  exec('pnpm run test');

  // Run linting
  log('🔍 Running linter...', 'cyan');
  exec('pnpm run lint');

  // Run security audit
  log('🔒 Running security audit...', 'cyan');
  exec('pnpm run security-audit');

  log('✅ All pre-release checks passed!', 'green');
}

function performRelease(releaseType) {
  const currentVersion = getCurrentVersion();
  log(`📦 Current version: ${currentVersion}`, 'blue');
  log(`🚀 Preparing ${releaseType} release...`, 'cyan');

  try {
    // Run standard-version
    const releaseCommand = `pnpm run release:${releaseType}`;
    log(`Executing: ${releaseCommand}`, 'blue');
    exec(releaseCommand);

    const newVersion = getCurrentVersion();
    log(`🎉 Release ${newVersion} created successfully!`, 'green');
    
    log('\n📋 Next steps:', 'cyan');
    log('1. Review the generated CHANGELOG.md', 'yellow');
    log('2. Push the changes and tags: git push --follow-tags', 'yellow');
    log('3. The CI will automatically publish to npm', 'yellow');
    log(`4. Check the release at: https://github.com/maikershq/maikers-mainframe-sdk/releases/tag/v${newVersion}`, 'yellow');

  } catch (error) {
    log('❌ Release failed', 'red');
    log('You may need to manually clean up any partial changes.', 'red');
    process.exit(1);
  }
}

function showUsage() {
  log('📋 Release Management Script', 'cyan');
  log('');
  log('Usage: node scripts/release.js [type]', 'blue');
  log('');
  log('Release types:', 'yellow');
  log('  patch     - Bug fixes and small updates (1.0.0 → 1.0.1)', 'white');
  log('  minor     - New features, backwards compatible (1.0.0 → 1.1.0)', 'white');
  log('  major     - Breaking changes (1.0.0 → 2.0.0)', 'white');
  log('  prerelease - Pre-release version (1.0.0 → 1.0.1-0)', 'white');
  log('');
  log('Examples:', 'yellow');
  log('  node scripts/release.js patch', 'white');
  log('  node scripts/release.js minor', 'white');
  log('');
  log('The script will:', 'cyan');
  log('  ✓ Run all tests and checks', 'white');
  log('  ✓ Update version number', 'white');
  log('  ✓ Generate changelog', 'white');
  log('  ✓ Create git tag', 'white');
  log('  ✓ Provide next steps for publishing', 'white');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showUsage();
    return;
  }

  const releaseType = args[0];
  validateReleaseType(releaseType);

  log('🚀 Mainframe SDK Release Manager', 'magenta');
  log('================================', 'magenta');

  runPreReleaseChecks();
  performRelease(releaseType);
}

if (require.main === module) {
  main();
}

module.exports = {
  validateReleaseType,
  getCurrentVersion,
  runPreReleaseChecks,
  performRelease
};
