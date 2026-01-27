/**
 * BlackRoad Hashing Utilities
 *
 * SHA256, SHA384, SHA512, SHA3, and SHA-Infinity (extensible) hashing
 */

import { createHash, pbkdf2, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { config } from '../../config/index.js';
import { hashLogger as logger } from '../logger.js';

const pbkdf2Async = promisify(pbkdf2);

// =============================================================================
// Standard Hash Functions
// =============================================================================

/**
 * SHA256 hash
 */
export function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * SHA384 hash
 */
export function sha384(input: string | Buffer): string {
  return createHash('sha384').update(input).digest('hex');
}

/**
 * SHA512 hash
 */
export function sha512(input: string | Buffer): string {
  return createHash('sha512').update(input).digest('hex');
}

/**
 * SHA3-256 hash
 */
export function sha3_256(input: string | Buffer): string {
  return createHash('sha3-256').update(input).digest('hex');
}

/**
 * SHA3-512 hash
 */
export function sha3_512(input: string | Buffer): string {
  return createHash('sha3-512').update(input).digest('hex');
}

// =============================================================================
// SHA-Infinity: Extensible Iterative Hashing System
// =============================================================================

/**
 * SHA-Infinity Configuration
 *
 * Combines multiple hashing techniques for maximum security:
 * 1. PBKDF2 with configurable iterations
 * 2. Salted hashing
 * 3. Key stretching
 * 4. Multiple algorithm support
 */
export interface ShaInfinityOptions {
  iterations?: number;
  keyLength?: number;
  algorithm?: string;
  salt?: string;
  encoding?: 'hex' | 'base64';
}

const DEFAULT_SHA_INFINITY_OPTIONS: Required<ShaInfinityOptions> = {
  iterations: config.shaInfinity.iterations,
  keyLength: config.shaInfinity.keyLength,
  algorithm: config.shaInfinity.algorithm,
  salt: '',
  encoding: 'hex',
};

/**
 * Generate a SHA-Infinity hash
 *
 * SHA-Infinity is an extensible hashing system that:
 * - Uses PBKDF2 for key derivation
 * - Supports configurable iterations (10k, 100k, 1M, etc.)
 * - Combines multiple hash passes for added security
 * - Includes version information for future compatibility
 *
 * @param input - The string to hash
 * @param iterationsOrOptions - Number of iterations or full options
 * @returns Promise<string> - The hash in format: $sha-inf$v1$iterations$salt$hash
 */
export async function generateShaInfinityHash(
  input: string,
  iterationsOrOptions?: number | ShaInfinityOptions
): Promise<string> {
  const options: Required<ShaInfinityOptions> =
    typeof iterationsOrOptions === 'number'
      ? { ...DEFAULT_SHA_INFINITY_OPTIONS, iterations: iterationsOrOptions }
      : { ...DEFAULT_SHA_INFINITY_OPTIONS, ...iterationsOrOptions };

  logger.debug('Generating SHA-Infinity hash', {
    iterations: options.iterations,
    algorithm: options.algorithm,
    keyLength: options.keyLength,
  });

  // Generate salt if not provided
  const salt = options.salt || randomBytes(32).toString('hex');

  // Pre-hash the input with SHA512 for additional entropy
  const preHash = sha512(input + salt);

  // Apply PBKDF2 with configured iterations
  const derivedKey = await pbkdf2Async(
    preHash,
    salt,
    options.iterations,
    options.keyLength,
    options.algorithm
  );

  const hash = derivedKey.toString(options.encoding);

  // Format: $sha-inf$version$iterations$algorithm$keyLength$salt$hash
  const formatted = `$sha-inf$v1$${options.iterations}$${options.algorithm}$${options.keyLength}$${salt}$${hash}`;

  logger.debug('SHA-Infinity hash generated', {
    hashLength: formatted.length,
    iterations: options.iterations,
  });

  return formatted;
}

/**
 * Verify a SHA-Infinity hash
 *
 * @param input - The original string
 * @param hash - The SHA-Infinity formatted hash to verify against
 * @returns Promise<boolean> - True if the hash matches
 */
export async function verifyShaInfinityHash(
  input: string,
  hash: string
): Promise<boolean> {
  logger.debug('Verifying SHA-Infinity hash');

  try {
    // Parse the hash format
    const parts = hash.split('$');

    if (parts[1] !== 'sha-inf' || parts[2] !== 'v1') {
      logger.warn('Invalid SHA-Infinity hash format');
      return false;
    }

    const iterations = parseInt(parts[3], 10);
    const algorithm = parts[4];
    const keyLength = parseInt(parts[5], 10);
    const salt = parts[6];
    const storedHash = parts[7];

    // Regenerate with the same parameters
    const preHash = sha512(input + salt);

    const derivedKey = await pbkdf2Async(
      preHash,
      salt,
      iterations,
      keyLength,
      algorithm
    );

    const newHash = derivedKey.toString('hex');

    // Timing-safe comparison
    const storedBuffer = Buffer.from(storedHash, 'hex');
    const newBuffer = Buffer.from(newHash, 'hex');

    if (storedBuffer.length !== newBuffer.length) {
      return false;
    }

    return timingSafeEqual(storedBuffer, newBuffer);
  } catch (error) {
    logger.error('SHA-Infinity verification failed', { error });
    return false;
  }
}

// =============================================================================
// Generic Hash Verification
// =============================================================================

/**
 * Verify any standard hash
 */
export function verifyHash(
  input: string,
  expectedHash: string,
  algorithm: string
): boolean {
  logger.debug('Verifying hash', { algorithm });

  let computedHash: string;

  switch (algorithm.toUpperCase()) {
    case 'SHA256':
      computedHash = sha256(input);
      break;
    case 'SHA384':
      computedHash = sha384(input);
      break;
    case 'SHA512':
      computedHash = sha512(input);
      break;
    case 'SHA3_256':
    case 'SHA3-256':
      computedHash = sha3_256(input);
      break;
    case 'SHA3_512':
    case 'SHA3-512':
      computedHash = sha3_512(input);
      break;
    default:
      logger.warn('Unknown hash algorithm', { algorithm });
      return false;
  }

  // Timing-safe comparison
  try {
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');

    if (expectedBuffer.length !== computedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, computedBuffer);
  } catch {
    return computedHash === expectedHash;
  }
}

// =============================================================================
// HMAC Functions
// =============================================================================

/**
 * Generate HMAC-SHA256
 */
export function hmacSha256(input: string, secret: string): string {
  return createHash('sha256')
    .update(secret)
    .update(input)
    .digest('hex');
}

/**
 * Generate HMAC-SHA512
 */
export function hmacSha512(input: string, secret: string): string {
  return createHash('sha512')
    .update(secret)
    .update(input)
    .digest('hex');
}

// =============================================================================
// Content Integrity
// =============================================================================

/**
 * Generate a content hash for integrity verification
 */
export function generateContentHash(content: unknown): string {
  const normalized = JSON.stringify(content, Object.keys(content as object).sort());
  return sha256(normalized);
}

/**
 * Verify content integrity
 */
export function verifyContentIntegrity(content: unknown, hash: string): boolean {
  const computed = generateContentHash(content);
  return verifyHash(computed, hash, 'SHA256');
}

// =============================================================================
// Hash Chain (for audit trails)
// =============================================================================

export interface HashChainEntry {
  index: number;
  timestamp: Date;
  data: string;
  hash: string;
  previousHash: string;
}

/**
 * Create a hash chain entry
 */
export function createHashChainEntry(
  index: number,
  data: string,
  previousHash: string
): HashChainEntry {
  const timestamp = new Date();
  const content = `${index}:${timestamp.toISOString()}:${data}:${previousHash}`;
  const hash = sha256(content);

  return {
    index,
    timestamp,
    data,
    hash,
    previousHash,
  };
}

/**
 * Verify a hash chain
 */
export function verifyHashChain(chain: HashChainEntry[]): boolean {
  if (chain.length === 0) return true;

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];

    // Verify the hash
    const content = `${entry.index}:${entry.timestamp.toISOString()}:${entry.data}:${entry.previousHash}`;
    const computedHash = sha256(content);

    if (computedHash !== entry.hash) {
      logger.warn('Hash chain verification failed', { index: i });
      return false;
    }

    // Verify chain linkage (except first entry)
    if (i > 0 && entry.previousHash !== chain[i - 1].hash) {
      logger.warn('Hash chain linkage broken', { index: i });
      return false;
    }
  }

  return true;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate an API key with checksum
 */
export function generateApiKey(prefix: string = 'br'): string {
  const random = generateSecureRandom(24);
  const checksum = sha256(`${prefix}_${random}`).slice(0, 8);
  return `${prefix}_${random}_${checksum}`;
}

/**
 * Verify an API key checksum
 */
export function verifyApiKey(apiKey: string): boolean {
  const parts = apiKey.split('_');
  if (parts.length !== 3) return false;

  const [prefix, random, checksum] = parts;
  const expectedChecksum = sha256(`${prefix}_${random}`).slice(0, 8);

  return checksum === expectedChecksum;
}

// Export all functions
export const hash = {
  sha256,
  sha384,
  sha512,
  sha3_256,
  sha3_512,
  generateShaInfinityHash,
  verifyShaInfinityHash,
  verifyHash,
  hmacSha256,
  hmacSha512,
  generateContentHash,
  verifyContentIntegrity,
  createHashChainEntry,
  verifyHashChain,
  generateSecureRandom,
  generateApiKey,
  verifyApiKey,
};

export default hash;
