/**
 * BlackRoad GraphQL Server
 *
 * Unified API Gateway for Projects, CRM, and Multi-Cloud Integrations
 * Part of the BlackRoad OS ecosystem - 350+ products across 46 categories
 *
 * @author BlackRoad OS, Inc.
 * @license Proprietary - See LICENSE file
 */

import { ApolloServer } from '@apollo/server';
import { fastifyApolloDrainPlugin, fastifyApolloHandler } from '@as-integrations/fastify';
import Fastify from 'fastify';
import { typeDefs } from './schemas/index.js';
import { resolvers } from './resolvers/index.js';
import { createContext, Context } from './context.js';
import { initializeIntegrations } from './integrations/index.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

async function bootstrap() {
  logger.info('Starting BlackRoad GraphQL Server...');
  logger.info(`Environment: ${config.nodeEnv}`);

  // Initialize Fastify
  const app = Fastify({
    logger: config.nodeEnv === 'development',
  });

  // Initialize Apollo Server
  const apollo = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    plugins: [fastifyApolloDrainPlugin(app)],
    introspection: config.nodeEnv !== 'production',
  });

  await apollo.start();
  logger.info('Apollo Server started');

  // Initialize all integrations
  await initializeIntegrations();
  logger.info('Integrations initialized');

  // Register GraphQL route
  app.route({
    url: '/graphql',
    method: ['GET', 'POST', 'OPTIONS'],
    handler: fastifyApolloHandler(apollo, {
      context: createContext,
    }),
  });

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    integrations: {
      cloudflare: config.cloudflare.enabled,
      salesforce: config.salesforce.enabled,
      vercel: config.vercel.enabled,
      digitalocean: config.digitalocean.enabled,
      anthropic: config.anthropic.enabled,
      github: config.github.enabled,
      termius: config.termius.enabled,
      iosTools: config.iosTools.enabled,
    },
  }));

  // Projects API endpoint (REST compatibility)
  app.get('/api/projects', async (request, reply) => {
    reply.redirect('/graphql?query={projects{id,name,status}}');
  });

  // Start server
  try {
    await app.listen({ port: config.port, host: config.host });
    logger.info(`Server running at http://${config.host}:${config.port}/graphql`);
    logger.info('BlackRoad GraphQL Server is ready!');
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
