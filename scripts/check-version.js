#!/usr/bin/env node

/**
 * Version Check Script
 * 
 * Checks if the current version is already published to npm
 * and provides information about the release status.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getCurrentVersion() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return pkg.version;
}

function getPublishedVersion() {
  try {
    const result = execSync('npm view @maikers/mainframe-sdk version', { encoding: 'utf8' });
    return result.trim();
  } catch (error) {
    return null;
  }
}

function getPublishedVersions() {
  try {
    const result = execSync('npm view @maikers/mainframe-sdk versions --json', { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    return [];
  }
}

function checkVersionStatus() {
  const currentVersion = getCurrentVersion();
  const publishedVersion = getPublishedVersion();
  const allVersions = getPublishedVersions();

  console.log('📦 Version Status Check');
  console.log('======================');
  console.log(`Current version: ${currentVersion}`);
  console.log(`Published version: ${publishedVersion || 'Not published'}`);
  console.log('');

  if (!publishedVersion) {
    console.log('🆕 This is the first release - package not yet published');
    return { shouldPublish: true, isNew: true };
  }

  if (currentVersion === publishedVersion) {
    console.log('✅ Current version matches published version');
    console.log('❌ No new version to publish');
    return { shouldPublish: false, isUpToDate: true };
  }

  if (allVersions.includes(currentVersion)) {
    console.log('⚠️  Current version was previously published');
    console.log('❌ Version already exists in npm registry');
    return { shouldPublish: false, alreadyExists: true };
  }

  // Compare versions
  const currentParts = currentVersion.split('.').map(Number);
  const publishedParts = publishedVersion.split('.').map(Number);
  
  let isNewer = false;
  for (let i = 0; i < Math.max(currentParts.length, publishedParts.length); i++) {
    const current = currentParts[i] || 0;
    const published = publishedParts[i] || 0;
    
    if (current > published) {
      isNewer = true;
      break;
    } else if (current < published) {
      break;
    }
  }

  if (isNewer) {
    console.log('🆙 Current version is newer than published version');
    console.log('✅ Ready to publish');
    return { shouldPublish: true, isNewer: true };
  } else {
    console.log('⬇️  Current version is older than published version');
    console.log('❌ Cannot publish older version');
    return { shouldPublish: false, isOlder: true };
  }
}

function main() {
  try {
    const status = checkVersionStatus();
    
    if (status.shouldPublish) {
      console.log('');
      console.log('🚀 Next steps:');
      if (status.isNew) {
        console.log('  1. Run release script: node scripts/release.js patch');
        console.log('  2. Push changes: git push --follow-tags');
        console.log('  3. CI will publish automatically');
      } else {
        console.log('  1. Push changes: git push --follow-tags');
        console.log('  2. CI will publish automatically');
      }
    } else {
      console.log('');
      console.log('💡 Suggestions:');
      if (status.isUpToDate) {
        console.log('  - Make changes and run: node scripts/release.js [patch|minor|major]');
      } else if (status.alreadyExists) {
        console.log('  - Run: node scripts/release.js [patch|minor|major] to create new version');
      } else if (status.isOlder) {
        console.log('  - Update version to be higher than current published version');
      }
    }
    
    process.exit(status.shouldPublish ? 0 : 1);
  } catch (error) {
    console.error('❌ Error checking version:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getCurrentVersion,
  getPublishedVersion,
  getPublishedVersions,
  checkVersionStatus
};
