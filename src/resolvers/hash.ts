/**
 * Hash Resolvers
 *
 * SHA256, SHA-Infinity, and extensible hashing operations
 */

import { Context } from '../context.js';
import { resolverLogger as logger } from '../utils/logger.js';
import {
  sha256,
  sha384,
  sha512,
  sha3_256,
  sha3_512,
  generateShaInfinityHash,
  verifyShaInfinityHash,
  verifyHash,
} from '../utils/hash/index.js';

export const hashResolvers = {
  Query: {
    verifyHash: async (
      _parent: unknown,
      args: { input: string; hash: string; algorithm: string },
      _context: Context
    ) => {
      logger.info('Verifying hash', { algorithm: args.algorithm });

      if (args.algorithm === 'SHA_INFINITY') {
        return verifyShaInfinityHash(args.input, args.hash);
      }

      return verifyHash(args.input, args.hash, args.algorithm);
    },
  },

  Mutation: {
    generateHash: async (
      _parent: unknown,
      args: { input: string; algorithm: string },
      _context: Context
    ) => {
      logger.info('Generating hash', { algorithm: args.algorithm });

      let hash: string;

      switch (args.algorithm) {
        case 'SHA256':
          hash = sha256(args.input);
          break;
        case 'SHA384':
          hash = sha384(args.input);
          break;
        case 'SHA512':
          hash = sha512(args.input);
          break;
        case 'SHA3_256':
          hash = sha3_256(args.input);
          break;
        case 'SHA3_512':
          hash = sha3_512(args.input);
          break;
        case 'SHA_INFINITY':
          hash = await generateShaInfinityHash(args.input);
          break;
        case 'BLAKE3':
          // BLAKE3 would require additional library
          hash = sha512(args.input); // Fallback
          logger.warn('BLAKE3 not implemented, using SHA512 fallback');
          break;
        default:
          throw new Error(`Unsupported algorithm: ${args.algorithm}`);
      }

      return {
        input: args.input,
        hash,
        algorithm: args.algorithm,
        timestamp: new Date(),
      };
    },

    generateShaInfinityHash: async (
      _parent: unknown,
      args: { input: string; iterations?: number },
      _context: Context
    ) => {
      logger.info('Generating SHA-Infinity hash', { iterations: args.iterations });

      const result = await generateShaInfinityHash(args.input, args.iterations);
      const verificationHash = sha256(result);

      return {
        input: args.input,
        hash: result,
        iterations: args.iterations || 10000,
        algorithm: 'sha512',
        keyLength: 64,
        timestamp: new Date(),
        verificationHash,
      };
    },
  },
};
