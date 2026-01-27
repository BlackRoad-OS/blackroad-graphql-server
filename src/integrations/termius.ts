/**
 * Termius Integration Client
 *
 * SSH host management and terminal operations
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { integrationLogger as logger } from '../utils/logger.js';

interface TermiusHost {
  id: string;
  label: string;
  address: string;
  port: number;
  username: string;
  group?: string;
  tags?: string[];
  lastConnected?: Date;
}

interface TermiusGroup {
  id: string;
  label: string;
  parent_group?: string;
  hosts: string[];
}

interface TermiusSnippet {
  id: string;
  label: string;
  snippet: string;
  tags?: string[];
}

export class TermiusClient {
  private client: AxiosInstance;
  private teamId?: string;

  constructor() {
    // Note: Termius doesn't have a public API, this is a conceptual implementation
    // In practice, you might use their sync feature or alternative approaches
    this.client = axios.create({
      baseURL: 'https://api.termius.com/v1',
      headers: {
        Authorization: `Bearer ${config.termius.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    this.teamId = config.termius.teamId;
  }

  async healthCheck(): Promise<void> {
    logger.debug('Termius health check');
    // Verify connection
    await this.client.get('/me');
  }

  // Host Operations
  async listHosts(): Promise<TermiusHost[]> {
    logger.debug('Listing Termius hosts');

    try {
      const response = await this.client.get('/hosts', {
        params: { team_id: this.teamId },
      });
      return response.data.hosts || [];
    } catch (error) {
      logger.warn('Failed to list Termius hosts', { error });
      return [];
    }
  }

  async getHost(hostId: string): Promise<TermiusHost | null> {
    logger.debug('Getting Termius host', { hostId });

    try {
      const response = await this.client.get(`/hosts/${hostId}`);
      return response.data;
    } catch (error) {
      logger.warn('Failed to get Termius host', { hostId, error });
      return null;
    }
  }

  async createHost(options: {
    label: string;
    address: string;
    port?: number;
    username: string;
    password?: string;
    keyId?: string;
    group?: string;
    tags?: string[];
  }): Promise<TermiusHost> {
    logger.info('Creating Termius host', { label: options.label });

    const response = await this.client.post('/hosts', {
      ...options,
      port: options.port || 22,
      team_id: this.teamId,
    });

    return response.data;
  }

  async updateHost(
    hostId: string,
    updates: Partial<{
      label: string;
      address: string;
      port: number;
      username: string;
      group: string;
      tags: string[];
    }>
  ): Promise<TermiusHost> {
    logger.info('Updating Termius host', { hostId });

    const response = await this.client.patch(`/hosts/${hostId}`, updates);
    return response.data;
  }

  async deleteHost(hostId: string): Promise<void> {
    logger.info('Deleting Termius host', { hostId });

    await this.client.delete(`/hosts/${hostId}`);
  }

  // Group Operations
  async listGroups(): Promise<TermiusGroup[]> {
    logger.debug('Listing Termius groups');

    try {
      const response = await this.client.get('/groups', {
        params: { team_id: this.teamId },
      });
      return response.data.groups || [];
    } catch (error) {
      logger.warn('Failed to list Termius groups', { error });
      return [];
    }
  }

  async createGroup(options: {
    label: string;
    parentGroup?: string;
  }): Promise<TermiusGroup> {
    logger.info('Creating Termius group', { label: options.label });

    const response = await this.client.post('/groups', {
      ...options,
      team_id: this.teamId,
    });

    return response.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    logger.info('Deleting Termius group', { groupId });

    await this.client.delete(`/groups/${groupId}`);
  }

  // Snippet Operations
  async listSnippets(): Promise<TermiusSnippet[]> {
    logger.debug('Listing Termius snippets');

    try {
      const response = await this.client.get('/snippets', {
        params: { team_id: this.teamId },
      });
      return response.data.snippets || [];
    } catch (error) {
      logger.warn('Failed to list Termius snippets', { error });
      return [];
    }
  }

  async createSnippet(options: {
    label: string;
    snippet: string;
    tags?: string[];
  }): Promise<TermiusSnippet> {
    logger.info('Creating Termius snippet', { label: options.label });

    const response = await this.client.post('/snippets', {
      ...options,
      team_id: this.teamId,
    });

    return response.data;
  }

  async executeSnippet(hostId: string, snippetId: string): Promise<{
    output: string;
    exitCode: number;
  }> {
    logger.info('Executing Termius snippet', { hostId, snippetId });

    // This would typically open a connection and execute
    // For now, return a placeholder
    const response = await this.client.post(`/hosts/${hostId}/execute`, {
      snippet_id: snippetId,
    });

    return {
      output: response.data.output || '',
      exitCode: response.data.exit_code || 0,
    };
  }

  // SSH Key Operations
  async listKeys(): Promise<Array<{
    id: string;
    label: string;
    fingerprint: string;
  }>> {
    logger.debug('Listing Termius SSH keys');

    try {
      const response = await this.client.get('/keys', {
        params: { team_id: this.teamId },
      });
      return response.data.keys || [];
    } catch (error) {
      logger.warn('Failed to list Termius keys', { error });
      return [];
    }
  }

  async importKey(options: {
    label: string;
    privateKey: string;
    passphrase?: string;
  }): Promise<{ id: string }> {
    logger.info('Importing Termius SSH key', { label: options.label });

    const response = await this.client.post('/keys', {
      ...options,
      team_id: this.teamId,
    });

    return { id: response.data.id };
  }

  // Port Forwarding
  async createPortForward(options: {
    hostId: string;
    localPort: number;
    remoteHost: string;
    remotePort: number;
    type: 'local' | 'remote' | 'dynamic';
  }): Promise<{ id: string }> {
    logger.info('Creating Termius port forward', {
      hostId: options.hostId,
      type: options.type,
    });

    const response = await this.client.post(`/hosts/${options.hostId}/forwards`, {
      local_port: options.localPort,
      remote_host: options.remoteHost,
      remote_port: options.remotePort,
      type: options.type,
    });

    return { id: response.data.id };
  }

  // Vault (Secret Storage)
  async storeSecret(key: string, value: string): Promise<void> {
    logger.info('Storing Termius vault secret', { key });

    await this.client.post('/vault', {
      key,
      value,
      team_id: this.teamId,
    });
  }

  async getSecret(key: string): Promise<string | null> {
    logger.debug('Getting Termius vault secret', { key });

    try {
      const response = await this.client.get(`/vault/${key}`, {
        params: { team_id: this.teamId },
      });
      return response.data.value;
    } catch (error) {
      logger.warn('Failed to get Termius secret', { key, error });
      return null;
    }
  }
}
