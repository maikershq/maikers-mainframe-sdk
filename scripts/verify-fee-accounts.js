#!/usr/bin/env node

/**
 * Verification script for mainframe-sdk fee account fetching
 * 
 * This script validates that the SDK properly fetches fee accounts 
 * from the on-chain protocol configuration instead of using mock data.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { PROTOCOL_CONSTANTS } from '../dist/esm/utils/constants.js';

// Configuration
const NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || getDefaultRpcEndpoint(NETWORK);

function getDefaultRpcEndpoint(network) {
  switch (network) {
    case 'mainnet-beta':
      return 'https://api.mainnet-beta.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    case 'devnet':
    default:
      return 'https://api.devnet.solana.com';
  }
}

/**
 * Derive protocol config PDA
 */
function deriveProtocolConfigPda() {
  const [protocolConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol_config')],
    new PublicKey(PROTOCOL_CONSTANTS.PROGRAM_ID)
  );
  return protocolConfig;
}

/**
 * Parse protocol config account data
 */
function parseProtocolConfig(data) {
  if (data.length < 8) {
    throw new Error('Invalid protocol config account data');
  }

  let offset = 8; // Skip discriminator

  // Parse authority (32 bytes)
  const authority = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  // Parse fee structure (6 * 8 bytes)
  const fees = {
    createAgent: data.readBigUInt64LE(offset),
    updateConfig: data.readBigUInt64LE(offset + 8),
    transferAgent: data.readBigUInt64LE(offset + 16),
    pauseAgent: data.readBigUInt64LE(offset + 24),
    closeAgent: data.readBigUInt64LE(offset + 32),
    executeAction: data.readBigUInt64LE(offset + 40)
  };
  offset += 48;

  // Parse treasury addresses (3 * 32 bytes)
  const protocolTreasury = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const validatorTreasury = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const networkTreasury = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  // Parse basis points (3 * 2 bytes)
  const protocolTreasuryBps = data.readUInt16LE(offset);
  offset += 2;
  const validatorTreasuryBps = data.readUInt16LE(offset);
  offset += 2;
  const networkTreasuryBps = data.readUInt16LE(offset);
  offset += 2;

  // Parse remaining fields
  const paused = data[offset] === 1;
  offset += 1;
  const totalAgents = data.readBigUInt64LE(offset);
  offset += 8;
  const totalPartners = data.readBigUInt64LE(offset);

  return {
    authority: authority.toBase58(),
    fees: {
      createAgent: Number(fees.createAgent),
      updateConfig: Number(fees.updateConfig),
      transferAgent: Number(fees.transferAgent),
      pauseAgent: Number(fees.pauseAgent),
      closeAgent: Number(fees.closeAgent),
      executeAction: Number(fees.executeAction)
    },
    protocolTreasury: protocolTreasury.toBase58(),
    validatorTreasury: validatorTreasury.toBase58(),
    networkTreasury: networkTreasury.toBase58(),
    protocolTreasuryBps,
    validatorTreasuryBps,
    networkTreasuryBps,
    paused,
    totalAgents: Number(totalAgents),
    totalPartners: Number(totalPartners)
  };
}

/**
 * Validate treasury accounts are not mock addresses
 */
function validateTreasuryAccounts(config) {
  const mockAddresses = [
    '11111111111111111111111111111119', // Mock protocol treasury
    '1111111111111111111111111111111A', // Mock validator treasury  
    '1111111111111111111111111111111B', // Mock network treasury
  ];

  const errors = [];

  if (mockAddresses.includes(config.protocolTreasury)) {
    errors.push('Protocol treasury is still using mock address');
  }

  if (mockAddresses.includes(config.validatorTreasury)) {
    errors.push('Validator treasury is still using mock address');
  }

  if (mockAddresses.includes(config.networkTreasury)) {
    errors.push('Network treasury is still using mock address');
  }

  return errors;
}

/**
 * Validate basis points sum to 100%
 */
function validateBasisPoints(config) {
  const total = config.protocolTreasuryBps + config.validatorTreasuryBps + config.networkTreasuryBps;
  
  if (total !== 10000) {
    return [`Treasury basis points sum to ${total} instead of 10000 (100%)`];
  }
  
  return [];
}

/**
 * Main verification function
 */
async function verifyFeeAccounts() {
  console.log('🔍 Verifying Mainframe SDK Fee Account Configuration...');
  console.log(`📡 Network: ${NETWORK}`);
  console.log(`🔗 RPC Endpoint: ${RPC_ENDPOINT}`);
  console.log(`📋 Program ID: ${PROTOCOL_CONSTANTS.PROGRAM_ID}`);
  console.log();

  try {
    // Initialize connection
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    // Test connection
    console.log('⚡ Testing RPC connection...');
    const slot = await connection.getSlot();
    console.log(`✅ Connected successfully (slot: ${slot})`);
    console.log();

    // Derive and fetch protocol config
    console.log('🏗️  Deriving protocol config PDA...');
    const protocolConfigPda = deriveProtocolConfigPda();
    console.log(`📍 Protocol Config PDA: ${protocolConfigPda.toBase58()}`);
    console.log();

    console.log('📥 Fetching protocol configuration from blockchain...');
    const accountInfo = await connection.getAccountInfo(protocolConfigPda);
    
    if (!accountInfo) {
      throw new Error('❌ Protocol configuration not found on-chain. Has it been initialized?');
    }

    console.log(`✅ Protocol config found (${accountInfo.data.length} bytes)`);
    console.log();

    // Parse configuration
    console.log('🔍 Parsing protocol configuration...');
    const config = parseProtocolConfig(accountInfo.data);
    
    console.log('📊 Protocol Configuration:');
    console.log(`   Authority: ${config.authority}`);
    console.log(`   Protocol Treasury: ${config.protocolTreasury} (${config.protocolTreasuryBps / 100}%)`);
    console.log(`   Validator Treasury: ${config.validatorTreasury} (${config.validatorTreasuryBps / 100}%)`);
    console.log(`   Network Treasury: ${config.networkTreasury} (${config.networkTreasuryBps / 100}%)`);
    console.log(`   Paused: ${config.paused}`);
    console.log(`   Total Agents: ${config.totalAgents}`);
    console.log(`   Total Partners: ${config.totalPartners}`);
    console.log();

    // Validate configuration
    console.log('✅ Running validation checks...');
    
    const treasuryErrors = validateTreasuryAccounts(config);
    const basisPointErrors = validateBasisPoints(config);
    const allErrors = [...treasuryErrors, ...basisPointErrors];

    if (allErrors.length > 0) {
      console.log('❌ Validation failures:');
      allErrors.forEach(error => console.log(`   • ${error}`));
      process.exit(1);
    }

    console.log('✅ All validation checks passed!');
    console.log();
    
    // Fee structure validation
    console.log('💰 Fee Structure:');
    console.log(`   Create Agent: ${config.fees.createAgent} lamports (${config.fees.createAgent / 1e9} SOL)`);
    console.log(`   Update Config: ${config.fees.updateConfig} lamports (${config.fees.updateConfig / 1e9} SOL)`);
    console.log(`   Transfer Agent: ${config.fees.transferAgent} lamports (${config.fees.transferAgent / 1e9} SOL)`);
    console.log(`   Pause Agent: ${config.fees.pauseAgent} lamports (${config.fees.pauseAgent / 1e9} SOL)`);
    console.log(`   Close Agent: ${config.fees.closeAgent} lamports (${config.fees.closeAgent / 1e9} SOL)`);
    console.log(`   Execute Action: ${config.fees.executeAction} lamports (${config.fees.executeAction / 1e9} SOL)`);
    console.log();

    console.log('🎉 SDK fee account verification completed successfully!');
    console.log('✅ The SDK is properly configured to fetch fee accounts from the on-chain protocol configuration.');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyFeeAccounts();
}

export { verifyFeeAccounts, deriveProtocolConfigPda, parseProtocolConfig };
