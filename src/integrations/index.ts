/**
 * Integration Initialization
 *
 * Initialize and validate all configured integrations
 */

import { config } from '../config/index.js';
import { integrationLogger as logger } from '../utils/logger.js';

export async function initializeIntegrations(): Promise<void> {
  logger.info('Initializing integrations...');

  const integrations: string[] = [];

  if (config.cloudflare.enabled) {
    integrations.push('Cloudflare');
    logger.info('Cloudflare integration enabled');
  }

  if (config.salesforce.enabled) {
    integrations.push('Salesforce');
    logger.info('Salesforce integration enabled');
  }

  if (config.vercel.enabled) {
    integrations.push('Vercel');
    logger.info('Vercel integration enabled');
  }

  if (config.digitalocean.enabled) {
    integrations.push('Digital Ocean');
    logger.info('Digital Ocean integration enabled');
  }

  if (config.anthropic.enabled) {
    integrations.push('Anthropic/Claude');
    logger.info('Anthropic/Claude integration enabled');
  }

  if (config.github.enabled) {
    integrations.push('GitHub');
    logger.info('GitHub integration enabled');
  }

  if (config.termius.enabled) {
    integrations.push('Termius');
    logger.info('Termius integration enabled');
  }

  if (config.iosTools.enabled) {
    integrations.push('iOS Tools');
    logger.info('iOS Tools integration enabled');
  }

  logger.info(`Initialized ${integrations.length} integrations: ${integrations.join(', ')}`);
}

// Re-export all integration clients
export { CloudflareClient } from './cloudflare.js';
export { SalesforceClient } from './salesforce.js';
export { VercelClient } from './vercel.js';
export { DigitalOceanClient } from './digitalocean.js';
export { ClaudeClient } from './anthropic.js';
export { GitHubClient } from './github.js';
export { TermiusClient } from './termius.js';
export { iOSToolsClient } from './ios-tools.js';
