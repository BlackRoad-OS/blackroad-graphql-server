/**
 * Digital Ocean Integration Client
 *
 * Droplets, Apps, Spaces, and database management
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { integrationLogger as logger } from '../utils/logger.js';

interface DODroplet {
  id: number;
  name: string;
  status: string;
  memory: number;
  vcpus: number;
  disk: number;
  region: { slug: string; name: string };
  image: { id: number; name: string };
  networks: {
    v4: Array<{ ip_address: string; type: string }>;
    v6: Array<{ ip_address: string; type: string }>;
  };
  created_at: string;
}

interface DOApp {
  id: string;
  owner_uuid: string;
  spec: {
    name: string;
    region: string;
    services?: Array<{
      name: string;
      instance_count: number;
      instance_size_slug: string;
    }>;
  };
  default_ingress: string;
  created_at: string;
  updated_at: string;
  active_deployment?: {
    id: string;
    phase: string;
  };
}

export class DigitalOceanClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.digitalocean.com/v2',
      headers: {
        Authorization: `Bearer ${config.digitalocean.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async healthCheck(): Promise<void> {
    logger.debug('Digital Ocean health check');
    await this.client.get('/account');
  }

  // Droplet Operations
  async listDroplets(): Promise<DODroplet[]> {
    logger.debug('Listing Digital Ocean droplets');

    const response = await this.client.get('/droplets');
    return response.data.droplets;
  }

  async getDroplet(dropletId: number): Promise<DODroplet> {
    logger.debug('Getting Digital Ocean droplet', { dropletId });

    const response = await this.client.get(`/droplets/${dropletId}`);
    return response.data.droplet;
  }

  async createDroplet(options: {
    name: string;
    region: string;
    size: string;
    image: string | number;
    ssh_keys?: number[];
    backups?: boolean;
    ipv6?: boolean;
    monitoring?: boolean;
    tags?: string[];
    user_data?: string;
  }): Promise<DODroplet> {
    logger.info('Creating Digital Ocean droplet', { name: options.name });

    const response = await this.client.post('/droplets', options);
    return response.data.droplet;
  }

  async deleteDroplet(dropletId: number): Promise<void> {
    logger.info('Deleting Digital Ocean droplet', { dropletId });

    await this.client.delete(`/droplets/${dropletId}`);
  }

  async rebootDroplet(dropletId: number): Promise<void> {
    logger.info('Rebooting Digital Ocean droplet', { dropletId });

    await this.client.post(`/droplets/${dropletId}/actions`, {
      type: 'reboot',
    });
  }

  async resizeDroplet(dropletId: number, size: string): Promise<void> {
    logger.info('Resizing Digital Ocean droplet', { dropletId, size });

    await this.client.post(`/droplets/${dropletId}/actions`, {
      type: 'resize',
      size,
      disk: true,
    });
  }

  // App Platform Operations
  async listApps(): Promise<DOApp[]> {
    logger.debug('Listing Digital Ocean apps');

    const response = await this.client.get('/apps');
    return response.data.apps || [];
  }

  async getApp(appId: string): Promise<DOApp> {
    logger.debug('Getting Digital Ocean app', { appId });

    const response = await this.client.get(`/apps/${appId}`);
    return response.data.app;
  }

  async createApp(options: {
    name: string;
    config?: Record<string, unknown>;
    region?: string;
  }): Promise<{ id: string; url: string }> {
    logger.info('Creating Digital Ocean app', { name: options.name });

    const spec = {
      name: options.name,
      region: options.region || 'nyc',
      ...options.config,
    };

    const response = await this.client.post('/apps', { spec });

    return {
      id: response.data.app.id,
      url: `https://${response.data.app.default_ingress}`,
    };
  }

  async updateApp(appId: string, spec: Record<string, unknown>): Promise<DOApp> {
    logger.info('Updating Digital Ocean app', { appId });

    const response = await this.client.put(`/apps/${appId}`, { spec });
    return response.data.app;
  }

  async deleteApp(appId: string): Promise<void> {
    logger.info('Deleting Digital Ocean app', { appId });

    await this.client.delete(`/apps/${appId}`);
  }

  async scaleApp(appId: string, replicas: number): Promise<void> {
    logger.info('Scaling Digital Ocean app', { appId, replicas });

    const app = await this.getApp(appId);

    if (app.spec.services && app.spec.services.length > 0) {
      app.spec.services[0].instance_count = replicas;
      await this.updateApp(appId, app.spec);
    }
  }

  async deployApp(appId: string): Promise<{ deploymentId: string }> {
    logger.info('Deploying Digital Ocean app', { appId });

    const response = await this.client.post(`/apps/${appId}/deployments`);
    return { deploymentId: response.data.deployment.id };
  }

  // Spaces (S3-compatible storage)
  async listSpacesBuckets(): Promise<Array<{ name: string; createdAt: string }>> {
    logger.debug('Listing Digital Ocean Spaces buckets');
    // Note: Spaces uses S3-compatible API, would need different client
    return [];
  }

  // Database Operations
  async listDatabases(): Promise<Array<{
    id: string;
    name: string;
    engine: string;
    status: string;
  }>> {
    logger.debug('Listing Digital Ocean databases');

    const response = await this.client.get('/databases');
    return response.data.databases || [];
  }

  async createDatabase(options: {
    name: string;
    engine: 'pg' | 'mysql' | 'redis' | 'mongodb';
    version: string;
    size: string;
    region: string;
    num_nodes: number;
  }): Promise<{ id: string }> {
    logger.info('Creating Digital Ocean database', { name: options.name });

    const response = await this.client.post('/databases', options);
    return { id: response.data.database.id };
  }

  async deleteDatabase(databaseId: string): Promise<void> {
    logger.info('Deleting Digital Ocean database', { databaseId });

    await this.client.delete(`/databases/${databaseId}`);
  }

  // Kubernetes
  async listKubernetesClusters(): Promise<Array<{
    id: string;
    name: string;
    region: string;
    status: { state: string };
  }>> {
    logger.debug('Listing Digital Ocean Kubernetes clusters');

    const response = await this.client.get('/kubernetes/clusters');
    return response.data.kubernetes_clusters || [];
  }

  // Load Balancers
  async listLoadBalancers(): Promise<Array<{
    id: string;
    name: string;
    ip: string;
    status: string;
  }>> {
    logger.debug('Listing Digital Ocean load balancers');

    const response = await this.client.get('/load_balancers');
    return response.data.load_balancers || [];
  }
}
