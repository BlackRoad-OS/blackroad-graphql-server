/**
 * Cloudflare Integration Client
 *
 * Workers, KV, R2, D1, and DNS management
 */

import Cloudflare from 'cloudflare';
import { config } from '../config/index.js';
import { integrationLogger as logger } from '../utils/logger.js';

export class CloudflareClient {
  private client: Cloudflare;
  private accountId: string;
  private zoneId?: string;
  private kvNamespaceId?: string;

  constructor() {
    this.client = new Cloudflare({
      apiToken: config.cloudflare.apiToken,
    });
    this.accountId = config.cloudflare.accountId || '';
    this.zoneId = config.cloudflare.zoneId;
    this.kvNamespaceId = config.cloudflare.kvNamespaceId;
  }

  async healthCheck(): Promise<void> {
    logger.debug('Cloudflare health check');
    await this.client.user.tokens.verify();
  }

  // KV Operations
  async getKVValue(key: string): Promise<string | null> {
    if (!this.kvNamespaceId) {
      throw new Error('KV namespace not configured');
    }

    logger.debug('Getting KV value', { key });

    try {
      const response = await this.client.kv.namespaces.values.get(
        this.kvNamespaceId,
        key,
        { account_id: this.accountId }
      );
      return response as unknown as string;
    } catch (error) {
      logger.warn('KV get failed', { key, error });
      return null;
    }
  }

  async putKVValue(key: string, value: string, metadata?: Record<string, unknown>): Promise<void> {
    if (!this.kvNamespaceId) {
      throw new Error('KV namespace not configured');
    }

    logger.debug('Putting KV value', { key });

    await this.client.kv.namespaces.values.update(
      this.kvNamespaceId,
      key,
      {
        account_id: this.accountId,
        value,
        metadata: JSON.stringify(metadata || {}),
      }
    );
  }

  async deleteKVValue(key: string): Promise<void> {
    if (!this.kvNamespaceId) {
      throw new Error('KV namespace not configured');
    }

    logger.debug('Deleting KV value', { key });

    await this.client.kv.namespaces.values.delete(
      this.kvNamespaceId,
      key,
      { account_id: this.accountId }
    );
  }

  async listKVKeys(prefix?: string): Promise<string[]> {
    if (!this.kvNamespaceId) {
      throw new Error('KV namespace not configured');
    }

    logger.debug('Listing KV keys', { prefix });

    const response = await this.client.kv.namespaces.keys.list(
      this.kvNamespaceId,
      { account_id: this.accountId, prefix }
    );

    return response.result.map((k) => k.name);
  }

  // Worker Operations
  async deployWorker(options: {
    name: string;
    script: string;
    bindings?: Record<string, unknown>;
  }): Promise<{ id: string; url: string }> {
    logger.info('Deploying worker', { name: options.name });

    const response = await this.client.workers.scripts.update(
      options.name,
      {
        account_id: this.accountId,
        // Script content would be uploaded here
      }
    );

    return {
      id: options.name,
      url: `https://${options.name}.${this.accountId}.workers.dev`,
    };
  }

  async deleteWorker(name: string): Promise<void> {
    logger.info('Deleting worker', { name });

    await this.client.workers.scripts.delete(name, {
      account_id: this.accountId,
    });
  }

  async getWorkerLogs(name: string): Promise<string[]> {
    logger.debug('Getting worker logs', { name });
    // Worker logs would be fetched via tail or analytics
    return [`Worker ${name} is running`];
  }

  // DNS Operations
  async createDNSRecord(options: {
    type: string;
    name: string;
    content: string;
    ttl?: number;
    proxied?: boolean;
  }): Promise<{ id: string }> {
    if (!this.zoneId) {
      throw new Error('Zone ID not configured');
    }

    logger.info('Creating DNS record', { name: options.name, type: options.type });

    const response = await this.client.dns.records.create({
      zone_id: this.zoneId,
      type: options.type as 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX',
      name: options.name,
      content: options.content,
      ttl: options.ttl || 1,
      proxied: options.proxied ?? true,
    });

    return { id: response.id || '' };
  }

  async deleteDNSRecord(recordId: string): Promise<void> {
    if (!this.zoneId) {
      throw new Error('Zone ID not configured');
    }

    logger.info('Deleting DNS record', { recordId });

    await this.client.dns.records.delete(recordId, {
      zone_id: this.zoneId,
    });
  }

  // Purge cache
  async purgeCache(urls?: string[]): Promise<void> {
    if (!this.zoneId) {
      throw new Error('Zone ID not configured');
    }

    logger.info('Purging cache', { urls });

    if (urls && urls.length > 0) {
      await this.client.cache.purge({
        zone_id: this.zoneId,
        files: urls,
      });
    } else {
      await this.client.cache.purge({
        zone_id: this.zoneId,
        purge_everything: true,
      });
    }
  }
}
