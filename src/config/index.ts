/**
 * BlackRoad GraphQL Server Configuration
 *
 * Centralized configuration management with environment variable validation
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  API_KEY_SALT: z.string().default('dev-salt'),

  // Cloudflare
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CLOUDFLARE_KV_NAMESPACE_ID: z.string().optional(),

  // Salesforce
  SALESFORCE_LOGIN_URL: z.string().default('https://login.salesforce.com'),
  SALESFORCE_USERNAME: z.string().optional(),
  SALESFORCE_PASSWORD: z.string().optional(),
  SALESFORCE_SECURITY_TOKEN: z.string().optional(),
  SALESFORCE_CLIENT_ID: z.string().optional(),
  SALESFORCE_CLIENT_SECRET: z.string().optional(),

  // Vercel
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
  VERCEL_PROJECT_ID: z.string().optional(),

  // Digital Ocean
  DIGITALOCEAN_TOKEN: z.string().optional(),
  DIGITALOCEAN_SPACES_KEY: z.string().optional(),
  DIGITALOCEAN_SPACES_SECRET: z.string().optional(),
  DIGITALOCEAN_SPACES_ENDPOINT: z.string().optional(),
  DIGITALOCEAN_SPACES_BUCKET: z.string().optional(),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-20250514'),
  CLAUDE_MAX_TOKENS: z.string().default('4096').transform(Number),

  // GitHub
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_ORG: z.string().default('BlackRoad-OS'),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Termius
  TERMIUS_API_KEY: z.string().optional(),
  TERMIUS_TEAM_ID: z.string().optional(),

  // iOS Tools
  IOS_TOOLS_WEBHOOK_URL: z.string().optional(),
  IOS_TOOLS_API_KEY: z.string().optional(),
  WORKING_COPY_CALLBACK_URL: z.string().optional(),

  // BlackRoad Internal
  BLACKROAD_API_URL: z.string().default('https://api.blackroad.io'),
  BLACKROAD_API_KEY: z.string().optional(),
  BLACKROAD_CRM_ENDPOINT: z.string().optional(),

  // SHA-Infinity
  SHA_INFINITY_ITERATIONS: z.string().default('10000').transform(Number),
  SHA_INFINITY_KEY_LENGTH: z.string().default('64').transform(Number),
  SHA_INFINITY_ALGORITHM: z.string().default('sha512'),

  // Feature Flags
  ENABLE_PROJECTS: z.string().default('true').transform((v) => v === 'true'),
  ENABLE_CRM_SYNC: z.string().default('true').transform((v) => v === 'true'),
  ENABLE_MULTI_CLOUD: z.string().default('true').transform((v) => v === 'true'),
  ENABLE_AGENT_SYSTEM: z.string().default('true').transform((v) => v === 'true'),
  ENABLE_SHA_INFINITY: z.string().default('true').transform((v) => v === 'true'),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
  logLevel: env.LOG_LEVEL,

  database: {
    url: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
  },

  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    apiKeySalt: env.API_KEY_SALT,
  },

  cloudflare: {
    enabled: !!env.CLOUDFLARE_API_TOKEN,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: env.CLOUDFLARE_ZONE_ID,
    kvNamespaceId: env.CLOUDFLARE_KV_NAMESPACE_ID,
  },

  salesforce: {
    enabled: !!env.SALESFORCE_USERNAME,
    loginUrl: env.SALESFORCE_LOGIN_URL,
    username: env.SALESFORCE_USERNAME,
    password: env.SALESFORCE_PASSWORD,
    securityToken: env.SALESFORCE_SECURITY_TOKEN,
    clientId: env.SALESFORCE_CLIENT_ID,
    clientSecret: env.SALESFORCE_CLIENT_SECRET,
  },

  vercel: {
    enabled: !!env.VERCEL_TOKEN,
    token: env.VERCEL_TOKEN,
    teamId: env.VERCEL_TEAM_ID,
    projectId: env.VERCEL_PROJECT_ID,
  },

  digitalocean: {
    enabled: !!env.DIGITALOCEAN_TOKEN,
    token: env.DIGITALOCEAN_TOKEN,
    spaces: {
      key: env.DIGITALOCEAN_SPACES_KEY,
      secret: env.DIGITALOCEAN_SPACES_SECRET,
      endpoint: env.DIGITALOCEAN_SPACES_ENDPOINT,
      bucket: env.DIGITALOCEAN_SPACES_BUCKET,
    },
  },

  anthropic: {
    enabled: !!env.ANTHROPIC_API_KEY,
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.CLAUDE_MODEL,
    maxTokens: env.CLAUDE_MAX_TOKENS,
  },

  github: {
    enabled: !!env.GITHUB_TOKEN,
    token: env.GITHUB_TOKEN,
    org: env.GITHUB_ORG,
    webhookSecret: env.GITHUB_WEBHOOK_SECRET,
  },

  termius: {
    enabled: !!env.TERMIUS_API_KEY,
    apiKey: env.TERMIUS_API_KEY,
    teamId: env.TERMIUS_TEAM_ID,
  },

  iosTools: {
    enabled: !!env.IOS_TOOLS_API_KEY,
    webhookUrl: env.IOS_TOOLS_WEBHOOK_URL,
    apiKey: env.IOS_TOOLS_API_KEY,
    workingCopyCallback: env.WORKING_COPY_CALLBACK_URL,
  },

  blackroad: {
    apiUrl: env.BLACKROAD_API_URL,
    apiKey: env.BLACKROAD_API_KEY,
    crmEndpoint: env.BLACKROAD_CRM_ENDPOINT,
  },

  shaInfinity: {
    iterations: env.SHA_INFINITY_ITERATIONS,
    keyLength: env.SHA_INFINITY_KEY_LENGTH,
    algorithm: env.SHA_INFINITY_ALGORITHM,
  },

  features: {
    projects: env.ENABLE_PROJECTS,
    crmSync: env.ENABLE_CRM_SYNC,
    multiCloud: env.ENABLE_MULTI_CLOUD,
    agentSystem: env.ENABLE_AGENT_SYSTEM,
    shaInfinity: env.ENABLE_SHA_INFINITY,
  },
} as const;

export type Config = typeof config;
