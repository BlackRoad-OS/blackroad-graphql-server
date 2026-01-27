/**
 * Salesforce Integration Client
 *
 * CRM operations, SOQL queries, and record management
 */

import jsforce from 'jsforce';
import { config } from '../config/index.js';
import { integrationLogger as logger } from '../utils/logger.js';

export class SalesforceClient {
  private connection: jsforce.Connection;
  private isConnected: boolean = false;

  constructor() {
    this.connection = new jsforce.Connection({
      loginUrl: config.salesforce.loginUrl,
      version: '59.0',
    });
  }

  private async ensureConnected(): Promise<void> {
    if (this.isConnected) return;

    logger.info('Connecting to Salesforce');

    const password = `${config.salesforce.password}${config.salesforce.securityToken}`;

    await this.connection.login(
      config.salesforce.username || '',
      password
    );

    this.isConnected = true;
    logger.info('Connected to Salesforce', {
      instanceUrl: this.connection.instanceUrl,
    });
  }

  async healthCheck(): Promise<void> {
    await this.ensureConnected();
    logger.debug('Salesforce health check passed');
  }

  // Record Operations
  async createRecord(
    objectType: string,
    data: Record<string, unknown>
  ): Promise<{ id: string; success: boolean }> {
    await this.ensureConnected();
    logger.info('Creating Salesforce record', { objectType });

    const result = await this.connection.sobject(objectType).create(data);

    if (Array.isArray(result)) {
      return { id: result[0].id || '', success: result[0].success };
    }

    return { id: result.id || '', success: result.success };
  }

  async updateRecord(
    objectType: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    await this.ensureConnected();
    logger.info('Updating Salesforce record', { objectType, id });

    const result = await this.connection.sobject(objectType).update({
      Id: id,
      ...data,
    });

    if (Array.isArray(result)) {
      return { success: result[0].success };
    }

    return { success: result.success };
  }

  async upsertRecord(
    objectType: string,
    data: Record<string, unknown>,
    externalIdField: string = 'External_Id__c'
  ): Promise<{ id: string; success: boolean; created: boolean }> {
    await this.ensureConnected();
    logger.info('Upserting Salesforce record', { objectType, externalIdField });

    const result = await this.connection
      .sobject(objectType)
      .upsert(data, externalIdField);

    if (Array.isArray(result)) {
      return {
        id: result[0].id || '',
        success: result[0].success,
        created: result[0].created || false,
      };
    }

    return {
      id: result.id || '',
      success: result.success,
      created: result.created || false,
    };
  }

  async deleteRecord(objectType: string, id: string): Promise<{ success: boolean }> {
    await this.ensureConnected();
    logger.info('Deleting Salesforce record', { objectType, id });

    const result = await this.connection.sobject(objectType).delete(id);

    if (Array.isArray(result)) {
      return { success: result[0].success };
    }

    return { success: result.success };
  }

  async getRecord(
    objectType: string,
    id: string,
    fields?: string[]
  ): Promise<Record<string, unknown> | null> {
    await this.ensureConnected();
    logger.debug('Getting Salesforce record', { objectType, id });

    try {
      const result = await this.connection
        .sobject(objectType)
        .retrieve(id, { fields: fields?.join(',') });
      return result as Record<string, unknown>;
    } catch (error) {
      logger.warn('Failed to get Salesforce record', { objectType, id, error });
      return null;
    }
  }

  // Query Operations
  async query<T = Record<string, unknown>>(soql: string): Promise<T[]> {
    await this.ensureConnected();
    logger.debug('Executing SOQL query', { soql: soql.substring(0, 100) });

    const result = await this.connection.query<T>(soql);
    return result.records;
  }

  async queryAll<T = Record<string, unknown>>(soql: string): Promise<T[]> {
    await this.ensureConnected();
    logger.debug('Executing queryAll', { soql: soql.substring(0, 100) });

    const records: T[] = [];
    let result = await this.connection.query<T>(soql);

    records.push(...result.records);

    while (!result.done && result.nextRecordsUrl) {
      result = await this.connection.queryMore<T>(result.nextRecordsUrl);
      records.push(...result.records);
    }

    return records;
  }

  // Describe Operations
  async describeObject(objectType: string): Promise<jsforce.DescribeSObjectResult> {
    await this.ensureConnected();
    logger.debug('Describing Salesforce object', { objectType });

    return this.connection.sobject(objectType).describe();
  }

  async describeGlobal(): Promise<jsforce.DescribeGlobalResult> {
    await this.ensureConnected();
    logger.debug('Getting global describe');

    return this.connection.describeGlobal();
  }

  // Bulk Operations
  async bulkCreate(
    objectType: string,
    records: Record<string, unknown>[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    await this.ensureConnected();
    logger.info('Bulk creating Salesforce records', {
      objectType,
      count: records.length,
    });

    const results = await this.connection.sobject(objectType).create(records);

    const resultArray = Array.isArray(results) ? results : [results];
    const success = resultArray.filter((r) => r.success).length;
    const failed = resultArray.filter((r) => !r.success).length;
    const errors = resultArray
      .filter((r) => !r.success)
      .flatMap((r) => r.errors?.map((e) => e.message) || []);

    return { success, failed, errors };
  }

  async bulkUpdate(
    objectType: string,
    records: Array<{ Id: string } & Record<string, unknown>>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    await this.ensureConnected();
    logger.info('Bulk updating Salesforce records', {
      objectType,
      count: records.length,
    });

    const results = await this.connection.sobject(objectType).update(records);

    const resultArray = Array.isArray(results) ? results : [results];
    const success = resultArray.filter((r) => r.success).length;
    const failed = resultArray.filter((r) => !r.success).length;
    const errors = resultArray
      .filter((r) => !r.success)
      .flatMap((r) => r.errors?.map((e) => e.message) || []);

    return { success, failed, errors };
  }

  // Search
  async search(sosl: string): Promise<Record<string, unknown>[]> {
    await this.ensureConnected();
    logger.debug('Executing SOSL search', { sosl: sosl.substring(0, 100) });

    const result = await this.connection.search(sosl);
    return result.searchRecords as Record<string, unknown>[];
  }
}
