/**
 * Integration Health Resolvers
 *
 * Health checks and status for all configured integrations
 */

import { Context } from '../context.js';
import { resolverLogger as logger } from '../utils/logger.js';
import { config } from '../config/index.js';

interface IntegrationStatus {
  enabled: boolean;
  connected: boolean;
  lastChecked: Date | null;
  latency: number | null;
  error: string | null;
}

async function checkIntegration(
  name: string,
  enabled: boolean,
  checkFn: () => Promise<void>
): Promise<IntegrationStatus> {
  if (!enabled) {
    return {
      enabled: false,
      connected: false,
      lastChecked: null,
      latency: null,
      error: null,
    };
  }

  const start = Date.now();

  try {
    await checkFn();
    return {
      enabled: true,
      connected: true,
      lastChecked: new Date(),
      latency: Date.now() - start,
      error: null,
    };
  } catch (error) {
    logger.warn(`Integration check failed: ${name}`, { error });
    return {
      enabled: true,
      connected: false,
      lastChecked: new Date(),
      latency: Date.now() - start,
      error: String(error),
    };
  }
}

export const integrationResolvers = {
  Query: {
    integrationHealth: async (_parent: unknown, _args: unknown, context: Context) => {
      logger.info('Checking integration health');

      const [
        cloudflare,
        salesforce,
        vercel,
        digitalocean,
        anthropic,
        github,
        termius,
        iosTools,
      ] = await Promise.all([
        checkIntegration(
          'cloudflare',
          config.cloudflare.enabled,
          async () => {
            if (context.integrations.cloudflare) {
              await context.integrations.cloudflare.healthCheck();
            }
          }
        ),
        checkIntegration(
          'salesforce',
          config.salesforce.enabled,
          async () => {
            if (context.integrations.salesforce) {
              await context.integrations.salesforce.healthCheck();
            }
          }
        ),
        checkIntegration(
          'vercel',
          config.vercel.enabled,
          async () => {
            if (context.integrations.vercel) {
              await context.integrations.vercel.healthCheck();
            }
          }
        ),
        checkIntegration(
          'digitalocean',
          config.digitalocean.enabled,
          async () => {
            if (context.integrations.digitalocean) {
              await context.integrations.digitalocean.healthCheck();
            }
          }
        ),
        checkIntegration(
          'anthropic',
          config.anthropic.enabled,
          async () => {
            if (context.integrations.claude) {
              await context.integrations.claude.healthCheck();
            }
          }
        ),
        checkIntegration(
          'github',
          config.github.enabled,
          async () => {
            if (context.integrations.github) {
              await context.integrations.github.healthCheck();
            }
          }
        ),
        checkIntegration(
          'termius',
          config.termius.enabled,
          async () => {
            if (context.integrations.termius) {
              await context.integrations.termius.healthCheck();
            }
          }
        ),
        checkIntegration(
          'iosTools',
          config.iosTools.enabled,
          async () => {
            if (context.integrations.iosTools) {
              await context.integrations.iosTools.healthCheck();
            }
          }
        ),
      ]);

      // Determine overall health
      const statuses = [
        cloudflare,
        salesforce,
        vercel,
        digitalocean,
        anthropic,
        github,
        termius,
        iosTools,
      ];

      const enabledCount = statuses.filter((s) => s.enabled).length;
      const connectedCount = statuses.filter((s) => s.enabled && s.connected).length;

      let overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
      if (connectedCount === enabledCount) {
        overall = 'HEALTHY';
      } else if (connectedCount > 0) {
        overall = 'DEGRADED';
      } else {
        overall = 'UNHEALTHY';
      }

      return {
        cloudflare,
        salesforce,
        vercel,
        digitalocean,
        anthropic,
        github,
        termius,
        iosTools,
        overall,
        timestamp: new Date(),
      };
    },
  },
};
