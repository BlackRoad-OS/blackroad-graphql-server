/**
 * GraphQL Resolvers
 *
 * Unified resolvers for Projects, CRM, and Multi-Cloud operations
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { projectResolvers } from './projects.js';
import { crmResolvers } from './crm.js';
import { cloudResolvers } from './cloud.js';
import { agentResolvers } from './agents.js';
import { hashResolvers } from './hash.js';
import { iosToolsResolvers } from './ios-tools.js';
import { integrationResolvers } from './integrations.js';

// Custom Scalars
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    throw new Error('Invalid DateTime value');
  },
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new Error('Invalid DateTime literal');
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast): unknown {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    if (ast.kind === Kind.OBJECT) {
      return ast.fields.reduce((obj, field) => {
        obj[field.name.value] = field.value;
        return obj;
      }, {} as Record<string, unknown>);
    }
    return null;
  },
});

const UUIDScalar = new GraphQLScalarType({
  name: 'UUID',
  description: 'UUID custom scalar type',
  serialize(value: unknown): string {
    return String(value);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(value)) {
        return value;
      }
    }
    throw new Error('Invalid UUID');
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      return ast.value;
    }
    throw new Error('Invalid UUID literal');
  },
});

export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  UUID: UUIDScalar,

  Query: {
    ...projectResolvers.Query,
    ...crmResolvers.Query,
    ...cloudResolvers.Query,
    ...agentResolvers.Query,
    ...hashResolvers.Query,
    ...integrationResolvers.Query,
  },

  Mutation: {
    ...projectResolvers.Mutation,
    ...crmResolvers.Mutation,
    ...cloudResolvers.Mutation,
    ...agentResolvers.Mutation,
    ...hashResolvers.Mutation,
    ...iosToolsResolvers.Mutation,
  },
};
