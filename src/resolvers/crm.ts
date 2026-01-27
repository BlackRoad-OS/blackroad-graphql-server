/**
 * CRM Resolvers
 *
 * State management with Cloudflare KV and Salesforce sync
 */

import { nanoid } from 'nanoid';
import { Context } from '../context.js';
import { resolverLogger as logger } from '../utils/logger.js';
import { sha256 } from '../utils/hash/index.js';

// In-memory stores (replace with database/KV in production)
const crmRecordStore = new Map<string, CRMRecord>();
const crmStateStore = new Map<string, CRMState>();

interface CRMRecord {
  id: string;
  objectType: string;
  externalId?: string;
  salesforceId?: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  syncStatus: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CRMState {
  key: string;
  value: unknown;
  hash: string;
  version: number;
  cloudflareKVId?: string;
  updatedAt: Date;
}

export const crmResolvers = {
  Query: {
    crmRecords: async (
      _parent: unknown,
      args: { objectType: string; filter?: Record<string, unknown> },
      _context: Context
    ) => {
      logger.info('Fetching CRM records', { objectType: args.objectType, filter: args.filter });

      let records = Array.from(crmRecordStore.values()).filter(
        (r) => r.objectType === args.objectType
      );

      // Apply filters
      if (args.filter) {
        const { externalId, salesforceId, syncStatus, search } = args.filter as {
          externalId?: string;
          salesforceId?: string;
          syncStatus?: string;
          search?: string;
        };

        if (externalId) {
          records = records.filter((r) => r.externalId === externalId);
        }
        if (salesforceId) {
          records = records.filter((r) => r.salesforceId === salesforceId);
        }
        if (syncStatus) {
          records = records.filter((r) => r.syncStatus === syncStatus);
        }
        if (search) {
          const searchLower = search.toLowerCase();
          records = records.filter((r) =>
            JSON.stringify(r.data).toLowerCase().includes(searchLower)
          );
        }
      }

      return {
        edges: records.map((r) => ({ node: r, cursor: r.id })),
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: records[0]?.id,
          endCursor: records[records.length - 1]?.id,
        },
        totalCount: records.length,
      };
    },

    crmRecord: async (
      _parent: unknown,
      args: { objectType: string; id: string },
      _context: Context
    ) => {
      logger.info('Fetching CRM record', { objectType: args.objectType, id: args.id });
      const record = crmRecordStore.get(args.id);
      return record?.objectType === args.objectType ? record : null;
    },

    crmState: async (_parent: unknown, args: { key: string }, context: Context) => {
      logger.info('Fetching CRM state', { key: args.key });

      // Try Cloudflare KV first if available
      if (context.integrations.cloudflare) {
        try {
          const kvValue = await context.integrations.cloudflare.getKVValue(args.key);
          if (kvValue) {
            return {
              key: args.key,
              value: JSON.parse(kvValue),
              hash: sha256(kvValue),
              version: 1,
              cloudflareKVId: args.key,
              updatedAt: new Date(),
            };
          }
        } catch (error) {
          logger.warn('Failed to fetch from Cloudflare KV', { error });
        }
      }

      // Fall back to local store
      return crmStateStore.get(args.key) || null;
    },
  },

  Mutation: {
    createCRMRecord: async (
      _parent: unknown,
      args: { objectType: string; input: Record<string, unknown> },
      context: Context
    ) => {
      logger.info('Creating CRM record', { objectType: args.objectType });

      const id = nanoid();
      const now = new Date();

      const record: CRMRecord = {
        id,
        objectType: args.objectType,
        data: args.input,
        syncStatus: 'LOCAL_ONLY',
        createdAt: now,
        updatedAt: now,
      };

      crmRecordStore.set(id, record);

      // Sync to Salesforce if configured
      if (context.integrations.salesforce) {
        try {
          const result = await context.integrations.salesforce.createRecord(
            args.objectType,
            args.input
          );
          record.salesforceId = result.id;
          record.syncStatus = 'SYNCED';
          record.lastSyncedAt = new Date();
          crmRecordStore.set(id, record);
        } catch (error) {
          logger.warn('Failed to sync to Salesforce', { error });
          record.syncStatus = 'PENDING';
          crmRecordStore.set(id, record);
        }
      }

      logger.info('CRM record created', { id, objectType: args.objectType });
      return record;
    },

    updateCRMRecord: async (
      _parent: unknown,
      args: { objectType: string; id: string; input: Record<string, unknown> },
      context: Context
    ) => {
      logger.info('Updating CRM record', { objectType: args.objectType, id: args.id });

      const record = crmRecordStore.get(args.id);
      if (!record || record.objectType !== args.objectType) {
        throw new Error(`CRM record not found: ${args.id}`);
      }

      record.data = { ...record.data, ...args.input };
      record.updatedAt = new Date();
      record.syncStatus = 'PENDING';

      // Sync to Salesforce
      if (context.integrations.salesforce && record.salesforceId) {
        try {
          await context.integrations.salesforce.updateRecord(
            args.objectType,
            record.salesforceId,
            args.input
          );
          record.syncStatus = 'SYNCED';
          record.lastSyncedAt = new Date();
        } catch (error) {
          logger.warn('Failed to sync update to Salesforce', { error });
        }
      }

      crmRecordStore.set(args.id, record);
      return record;
    },

    deleteCRMRecord: async (
      _parent: unknown,
      args: { objectType: string; id: string },
      context: Context
    ) => {
      logger.info('Deleting CRM record', { objectType: args.objectType, id: args.id });

      const record = crmRecordStore.get(args.id);
      if (!record || record.objectType !== args.objectType) {
        return false;
      }

      // Delete from Salesforce
      if (context.integrations.salesforce && record.salesforceId) {
        try {
          await context.integrations.salesforce.deleteRecord(
            args.objectType,
            record.salesforceId
          );
        } catch (error) {
          logger.warn('Failed to delete from Salesforce', { error });
        }
      }

      return crmRecordStore.delete(args.id);
    },

    syncCRMState: async (
      _parent: unknown,
      args: { key: string; value: unknown },
      context: Context
    ) => {
      logger.info('Syncing CRM state', { key: args.key });

      const valueStr = JSON.stringify(args.value);
      const hash = sha256(valueStr);

      const existingState = crmStateStore.get(args.key);
      const version = existingState ? existingState.version + 1 : 1;

      const state: CRMState = {
        key: args.key,
        value: args.value,
        hash,
        version,
        updatedAt: new Date(),
      };

      // Sync to Cloudflare KV
      if (context.integrations.cloudflare) {
        try {
          await context.integrations.cloudflare.putKVValue(args.key, valueStr);
          state.cloudflareKVId = args.key;
          logger.info('State synced to Cloudflare KV', { key: args.key });
        } catch (error) {
          logger.warn('Failed to sync to Cloudflare KV', { error });
        }
      }

      crmStateStore.set(args.key, state);
      return state;
    },
  },
};
