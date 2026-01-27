/**
 * Vercel Integration Client
 *
 * Deployment, project management, and environment variables
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { integrationLogger as logger } from '../utils/logger.js';

interface VercelDeployment {
  id: string;
  url: string;
  state: string;
  readyState: string;
  createdAt: number;
}

interface VercelProject {
  id: string;
  name: string;
  framework: string;
  latestDeployments: VercelDeployment[];
}

export class VercelClient {
  private client: AxiosInstance;
  private teamId?: string;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.vercel.com',
      headers: {
        Authorization: `Bearer ${config.vercel.token}`,
        'Content-Type': 'application/json',
      },
    });
    this.teamId = config.vercel.teamId;
  }

  private getTeamQuery(): string {
    return this.teamId ? `?teamId=${this.teamId}` : '';
  }

  async healthCheck(): Promise<void> {
    logger.debug('Vercel health check');
    await this.client.get('/v2/user');
  }

  // Project Operations
  async listProjects(): Promise<VercelProject[]> {
    logger.debug('Listing Vercel projects');

    const response = await this.client.get(`/v9/projects${this.getTeamQuery()}`);
    return response.data.projects;
  }

  async getProject(projectId: string): Promise<VercelProject> {
    logger.debug('Getting Vercel project', { projectId });

    const response = await this.client.get(
      `/v9/projects/${projectId}${this.getTeamQuery()}`
    );
    return response.data;
  }

  async createProject(options: {
    name: string;
    framework?: string;
    gitRepository?: {
      type: string;
      repo: string;
    };
  }): Promise<VercelProject> {
    logger.info('Creating Vercel project', { name: options.name });

    const response = await this.client.post(
      `/v9/projects${this.getTeamQuery()}`,
      options
    );
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    logger.info('Deleting Vercel project', { projectId });

    await this.client.delete(`/v9/projects/${projectId}${this.getTeamQuery()}`);
  }

  // Deployment Operations
  async deploy(options: {
    projectId: string;
    gitRef?: string;
    target?: 'production' | 'preview';
  }): Promise<{ id: string; url: string; state: string }> {
    logger.info('Creating Vercel deployment', { projectId: options.projectId });

    const response = await this.client.post(
      `/v13/deployments${this.getTeamQuery()}`,
      {
        name: options.projectId,
        target: options.target || 'production',
        gitSource: options.gitRef
          ? {
              ref: options.gitRef,
              type: 'github',
            }
          : undefined,
      }
    );

    return {
      id: response.data.id,
      url: `https://${response.data.url}`,
      state: response.data.readyState,
    };
  }

  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    logger.debug('Getting Vercel deployment', { deploymentId });

    const response = await this.client.get(
      `/v13/deployments/${deploymentId}${this.getTeamQuery()}`
    );
    return response.data;
  }

  async listDeployments(projectId?: string): Promise<VercelDeployment[]> {
    logger.debug('Listing Vercel deployments', { projectId });

    const query = this.teamId ? `teamId=${this.teamId}` : '';
    const projectQuery = projectId ? `&projectId=${projectId}` : '';

    const response = await this.client.get(
      `/v6/deployments?${query}${projectQuery}`
    );
    return response.data.deployments;
  }

  async cancelDeployment(deploymentId: string): Promise<void> {
    logger.info('Canceling Vercel deployment', { deploymentId });

    await this.client.patch(
      `/v12/deployments/${deploymentId}/cancel${this.getTeamQuery()}`
    );
  }

  // Environment Variables
  async listEnvVars(projectId: string): Promise<Array<{
    key: string;
    value: string;
    target: string[];
  }>> {
    logger.debug('Listing Vercel env vars', { projectId });

    const response = await this.client.get(
      `/v9/projects/${projectId}/env${this.getTeamQuery()}`
    );
    return response.data.envs;
  }

  async createEnvVar(
    projectId: string,
    options: {
      key: string;
      value: string;
      target: ('production' | 'preview' | 'development')[];
      type?: 'plain' | 'secret' | 'encrypted';
    }
  ): Promise<void> {
    logger.info('Creating Vercel env var', { projectId, key: options.key });

    await this.client.post(
      `/v10/projects/${projectId}/env${this.getTeamQuery()}`,
      {
        key: options.key,
        value: options.value,
        target: options.target,
        type: options.type || 'encrypted',
      }
    );
  }

  async deleteEnvVar(projectId: string, envId: string): Promise<void> {
    logger.info('Deleting Vercel env var', { projectId, envId });

    await this.client.delete(
      `/v9/projects/${projectId}/env/${envId}${this.getTeamQuery()}`
    );
  }

  // Domains
  async listDomains(projectId: string): Promise<Array<{
    name: string;
    verified: boolean;
  }>> {
    logger.debug('Listing Vercel domains', { projectId });

    const response = await this.client.get(
      `/v9/projects/${projectId}/domains${this.getTeamQuery()}`
    );
    return response.data.domains;
  }

  async addDomain(projectId: string, domain: string): Promise<void> {
    logger.info('Adding Vercel domain', { projectId, domain });

    await this.client.post(
      `/v9/projects/${projectId}/domains${this.getTeamQuery()}`,
      { name: domain }
    );
  }

  async removeDomain(projectId: string, domain: string): Promise<void> {
    logger.info('Removing Vercel domain', { projectId, domain });

    await this.client.delete(
      `/v9/projects/${projectId}/domains/${domain}${this.getTeamQuery()}`
    );
  }

  // Logs
  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    logger.debug('Getting Vercel deployment logs', { deploymentId });

    const response = await this.client.get(
      `/v2/deployments/${deploymentId}/events${this.getTeamQuery()}`
    );

    return response.data.map((event: { text?: string }) => event.text || '');
  }
}
