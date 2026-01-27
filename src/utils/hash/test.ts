/**
 * Hash Utility Tests
 *
 * Run with: npm run hash:test
 */

import {
  sha256,
  sha384,
  sha512,
  sha3_256,
  sha3_512,
  generateShaInfinityHash,
  verifyShaInfinityHash,
  verifyHash,
  generateContentHash,
  verifyContentIntegrity,
  createHashChainEntry,
  verifyHashChain,
  generateSecureRandom,
  generateApiKey,
  verifyApiKey,
  HashChainEntry,
} from './index.js';

async function runTests() {
  console.log('BlackRoad Hash Utility Tests\n');
  console.log('='.repeat(60) + '\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, condition: boolean) {
    if (condition) {
      console.log(`  PASS: ${name}`);
      passed++;
    } else {
      console.log(`  FAIL: ${name}`);
      failed++;
    }
  }

  // SHA256 Tests
  console.log('SHA256 Tests:');
  const sha256Hash = sha256('hello');
  test('SHA256 produces 64-char hex string', sha256Hash.length === 64);
  test('SHA256 is deterministic', sha256('hello') === sha256Hash);
  test('SHA256 different inputs produce different hashes', sha256('hello') !== sha256('world'));
  console.log(`  Hash: ${sha256Hash}\n`);

  // SHA384 Tests
  console.log('SHA384 Tests:');
  const sha384Hash = sha384('hello');
  test('SHA384 produces 96-char hex string', sha384Hash.length === 96);
  test('SHA384 is deterministic', sha384('hello') === sha384Hash);
  console.log(`  Hash: ${sha384Hash}\n`);

  // SHA512 Tests
  console.log('SHA512 Tests:');
  const sha512Hash = sha512('hello');
  test('SHA512 produces 128-char hex string', sha512Hash.length === 128);
  test('SHA512 is deterministic', sha512('hello') === sha512Hash);
  console.log(`  Hash: ${sha512Hash}\n`);

  // SHA3-256 Tests
  console.log('SHA3-256 Tests:');
  const sha3_256Hash = sha3_256('hello');
  test('SHA3-256 produces 64-char hex string', sha3_256Hash.length === 64);
  test('SHA3-256 differs from SHA256', sha3_256Hash !== sha256Hash);
  console.log(`  Hash: ${sha3_256Hash}\n`);

  // SHA3-512 Tests
  console.log('SHA3-512 Tests:');
  const sha3_512Hash = sha3_512('hello');
  test('SHA3-512 produces 128-char hex string', sha3_512Hash.length === 128);
  test('SHA3-512 differs from SHA512', sha3_512Hash !== sha512Hash);
  console.log(`  Hash: ${sha3_512Hash}\n`);

  // SHA-Infinity Tests
  console.log('SHA-Infinity Tests:');
  const shaInfHash = await generateShaInfinityHash('hello', 1000);
  test('SHA-Infinity produces formatted hash', shaInfHash.startsWith('$sha-inf$v1$'));
  test('SHA-Infinity contains iteration count', shaInfHash.includes('$1000$'));

  const verified = await verifyShaInfinityHash('hello', shaInfHash);
  test('SHA-Infinity verification succeeds for correct input', verified);

  const notVerified = await verifyShaInfinityHash('wrong', shaInfHash);
  test('SHA-Infinity verification fails for wrong input', !notVerified);
  console.log(`  Hash: ${shaInfHash.substring(0, 80)}...\n`);

  // High Iteration SHA-Infinity
  console.log('SHA-Infinity High Iteration Test (10000 iterations):');
  const startTime = Date.now();
  const highIterHash = await generateShaInfinityHash('test', 10000);
  const duration = Date.now() - startTime;
  test('High iteration completes', highIterHash.startsWith('$sha-inf$'));
  console.log(`  Duration: ${duration}ms\n`);

  // Hash Verification Tests
  console.log('Hash Verification Tests:');
  test('verifyHash works for SHA256', verifyHash('hello', sha256Hash, 'SHA256'));
  test('verifyHash works for SHA512', verifyHash('hello', sha512Hash, 'SHA512'));
  test('verifyHash fails for wrong input', !verifyHash('wrong', sha256Hash, 'SHA256'));
  console.log();

  // Content Hash Tests
  console.log('Content Hash Tests:');
  const content = { name: 'test', value: 123 };
  const contentHash = generateContentHash(content);
  test('Content hash is deterministic', generateContentHash(content) === contentHash);
  test('Content integrity verification passes', verifyContentIntegrity(content, contentHash));
  test('Content integrity verification fails on change', !verifyContentIntegrity({ ...content, value: 456 }, contentHash));
  console.log(`  Hash: ${contentHash}\n`);

  // Hash Chain Tests
  console.log('Hash Chain Tests:');
  const chain: HashChainEntry[] = [];
  chain.push(createHashChainEntry(0, 'genesis', '0'.repeat(64)));
  chain.push(createHashChainEntry(1, 'block 1', chain[0].hash));
  chain.push(createHashChainEntry(2, 'block 2', chain[1].hash));

  test('Hash chain creation works', chain.length === 3);
  test('Hash chain verification passes', verifyHashChain(chain));

  // Tamper with chain
  const tamperedChain = [...chain];
  tamperedChain[1] = { ...tamperedChain[1], data: 'tampered' };
  test('Tampered chain verification fails', !verifyHashChain(tamperedChain));
  console.log();

  // Secure Random Tests
  console.log('Secure Random Tests:');
  const random1 = generateSecureRandom(32);
  const random2 = generateSecureRandom(32);
  test('Secure random produces 64-char hex (32 bytes)', random1.length === 64);
  test('Secure randoms are unique', random1 !== random2);
  console.log(`  Random 1: ${random1}`);
  console.log(`  Random 2: ${random2}\n`);

  // API Key Tests
  console.log('API Key Tests:');
  const apiKey = generateApiKey('br');
  test('API key has correct format', apiKey.startsWith('br_'));
  test('API key verification passes', verifyApiKey(apiKey));
  test('Invalid API key verification fails', !verifyApiKey('invalid_key_format'));
  test('Tampered API key verification fails', !verifyApiKey(apiKey.slice(0, -1) + 'x'));
  console.log(`  API Key: ${apiKey}\n`);

  // Summary
  console.log('='.repeat(60));
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  console.log(`Total: ${passed + failed} tests\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
