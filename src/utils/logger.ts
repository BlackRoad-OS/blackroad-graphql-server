/**
 * BlackRoad Logger
 *
 * Structured logging with Pino for high-performance logging
 */

import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.logLevel,
  transport:
    config.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    service: 'blackroad-graphql-server',
    version: process.env.npm_package_version || '1.0.0',
  },
});

export type Logger = typeof logger;

// Create child loggers for different modules
export const createLogger = (module: string) => logger.child({ module });

// Specialized loggers
export const integrationLogger = createLogger('integrations');
export const resolverLogger = createLogger('resolvers');
export const hashLogger = createLogger('hash');
export const agentLogger = createLogger('agents');
