/**
 * GraphQL Context
 *
 * Provides authenticated user context and integration clients to resolvers
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { CloudflareClient } from './integrations/cloudflare.js';
import { SalesforceClient } from './integrations/salesforce.js';
import { VercelClient } from './integrations/vercel.js';
import { DigitalOceanClient } from './integrations/digitalocean.js';
import { ClaudeClient } from './integrations/anthropic.js';
import { GitHubClient } from './integrations/github.js';
import { TermiusClient } from './integrations/termius.js';
import { iOSToolsClient } from './integrations/ios-tools.js';
import { config } from './config/index.js';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  organizationId?: string;
}

export interface Context {
  user: User | null;
  token: string | null;
  integrations: {
    cloudflare: CloudflareClient | null;
    salesforce: SalesforceClient | null;
    vercel: VercelClient | null;
    digitalocean: DigitalOceanClient | null;
    claude: ClaudeClient | null;
    github: GitHubClient | null;
    termius: TermiusClient | null;
    iosTools: iOSToolsClient | null;
  };
  request: FastifyRequest;
  reply: FastifyReply;
}

export async function createContext({
  request,
  reply,
}: {
  request: FastifyRequest;
  reply: FastifyReply;
}): Promise<Context> {
  // Extract token from Authorization header
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // TODO: Validate token and fetch user
  let user: User | null = null;
  if (token) {
    // In production, validate JWT and fetch user from database
    user = {
      id: 'system',
      email: 'system@blackroad.io',
      name: 'System User',
      roles: ['admin'],
    };
  }

  return {
    user,
    token,
    integrations: {
      cloudflare: config.cloudflare.enabled ? new CloudflareClient() : null,
      salesforce: config.salesforce.enabled ? new SalesforceClient() : null,
      vercel: config.vercel.enabled ? new VercelClient() : null,
      digitalocean: config.digitalocean.enabled ? new DigitalOceanClient() : null,
      claude: config.anthropic.enabled ? new ClaudeClient() : null,
      github: config.github.enabled ? new GitHubClient() : null,
      termius: config.termius.enabled ? new TermiusClient() : null,
      iosTools: config.iosTools.enabled ? new iOSToolsClient() : null,
    },
    request,
    reply,
  };
}
