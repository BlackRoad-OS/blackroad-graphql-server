/**
 * GitHub Integration Client
 *
 * Repository, issues, PRs, and Actions management
 */

import { Octokit } from '@octokit/rest';
import { config } from '../config/index.js';
import { integrationLogger as logger } from '../utils/logger.js';

interface GitRepository {
  id: string;
  provider: string;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
}

interface GitBranch {
  name: string;
  sha: string;
  protected: boolean;
}

interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: Date;
}

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  url: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  state: string;
  url: string;
  author: string;
  labels: string[];
  createdAt: Date;
}

export class GitHubClient {
  private octokit: Octokit;
  private org: string;

  constructor() {
    this.octokit = new Octokit({
      auth: config.github.token,
    });
    this.org = config.github.org;
  }

  async healthCheck(): Promise<void> {
    logger.debug('GitHub health check');
    await this.octokit.rest.users.getAuthenticated();
  }

  // Repository Operations
  async getRepository(repoUrl: string): Promise<GitRepository> {
    logger.debug('Getting GitHub repository', { repoUrl });

    // Parse URL to get owner/repo
    const match = repoUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${repoUrl}`);
    }

    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, '');

    const { data } = await this.octokit.rest.repos.get({
      owner,
      repo: repoName,
    });

    return {
      id: String(data.id),
      provider: 'GITHUB',
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      url: data.html_url,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
    };
  }

  async listRepositories(org?: string): Promise<GitRepository[]> {
    logger.debug('Listing GitHub repositories', { org: org || this.org });

    const targetOrg = org || this.org;

    const { data } = await this.octokit.rest.repos.listForOrg({
      org: targetOrg,
      per_page: 100,
    });

    return data.map((repo) => ({
      id: String(repo.id),
      provider: 'GITHUB',
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
    }));
  }

  async createRepository(options: {
    name: string;
    description?: string;
    private?: boolean;
    autoInit?: boolean;
  }): Promise<GitRepository> {
    logger.info('Creating GitHub repository', { name: options.name });

    const { data } = await this.octokit.rest.repos.createInOrg({
      org: this.org,
      name: options.name,
      description: options.description,
      private: options.private ?? true,
      auto_init: options.autoInit ?? true,
    });

    return {
      id: String(data.id),
      provider: 'GITHUB',
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      url: data.html_url,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
    };
  }

  // Branch Operations
  async listBranches(owner: string, repo: string): Promise<GitBranch[]> {
    logger.debug('Listing GitHub branches', { owner, repo });

    const { data } = await this.octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return data.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
    }));
  }

  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    fromSha: string
  ): Promise<GitBranch> {
    logger.info('Creating GitHub branch', { owner, repo, branchName });

    const { data } = await this.octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: fromSha,
    });

    return {
      name: branchName,
      sha: data.object.sha,
      protected: false,
    };
  }

  // Commit Operations
  async getLatestCommit(owner: string, repo: string, branch?: string): Promise<GitCommit> {
    logger.debug('Getting latest commit', { owner, repo, branch });

    const { data } = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: 1,
    });

    const commit = data[0];

    return {
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: new Date(commit.commit.author?.date || Date.now()),
    };
  }

  async listCommits(
    owner: string,
    repo: string,
    options?: { branch?: string; since?: Date; until?: Date }
  ): Promise<GitCommit[]> {
    logger.debug('Listing commits', { owner, repo, options });

    const { data } = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: options?.branch,
      since: options?.since?.toISOString(),
      until: options?.until?.toISOString(),
      per_page: 100,
    });

    return data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: new Date(commit.commit.author?.date || Date.now()),
    }));
  }

  // Pull Request Operations
  async listPullRequests(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequest[]> {
    logger.debug('Listing pull requests', { owner, repo, state });

    const { data } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state,
      per_page: 100,
    });

    return data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      url: pr.html_url,
      author: pr.user?.login || 'Unknown',
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
    }));
  }

  async createPullRequest(options: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<PullRequest> {
    logger.info('Creating pull request', {
      owner: options.owner,
      repo: options.repo,
      title: options.title,
    });

    const { data } = await this.octokit.rest.pulls.create({
      owner: options.owner,
      repo: options.repo,
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base,
      draft: options.draft,
    });

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      state: data.state,
      url: data.html_url,
      author: data.user?.login || 'Unknown',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    method: 'merge' | 'squash' | 'rebase' = 'squash'
  ): Promise<{ merged: boolean; sha: string }> {
    logger.info('Merging pull request', { owner, repo, pullNumber, method });

    const { data } = await this.octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      merge_method: method,
    });

    return {
      merged: data.merged,
      sha: data.sha,
    };
  }

  // Issue Operations
  async listIssues(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<Issue[]> {
    logger.debug('Listing issues', { owner, repo, state });

    const { data } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
      per_page: 100,
    });

    return data
      .filter((issue) => !issue.pull_request) // Exclude PRs
      .map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        author: issue.user?.login || 'Unknown',
        labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name || '')),
        createdAt: new Date(issue.created_at),
      }));
  }

  async createIssue(options: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<Issue> {
    logger.info('Creating issue', { owner: options.owner, repo: options.repo });

    const { data } = await this.octokit.rest.issues.create({
      owner: options.owner,
      repo: options.repo,
      title: options.title,
      body: options.body,
      labels: options.labels,
      assignees: options.assignees,
    });

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      state: data.state,
      url: data.html_url,
      author: data.user?.login || 'Unknown',
      labels: data.labels.map((l) => (typeof l === 'string' ? l : l.name || '')),
      createdAt: new Date(data.created_at),
    };
  }

  // Actions/Workflows
  async listWorkflowRuns(
    owner: string,
    repo: string,
    workflowId?: string | number
  ): Promise<Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    url: string;
    createdAt: Date;
  }>> {
    logger.debug('Listing workflow runs', { owner, repo, workflowId });

    const params: Parameters<typeof this.octokit.rest.actions.listWorkflowRuns>[0] = {
      owner,
      repo,
      per_page: 20,
    };

    if (workflowId) {
      params.workflow_id = workflowId;
    }

    const { data } = await this.octokit.rest.actions.listWorkflowRunsForRepo(params);

    return data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name || 'Unknown',
      status: run.status || 'unknown',
      conclusion: run.conclusion,
      url: run.html_url,
      createdAt: new Date(run.created_at),
    }));
  }

  async triggerWorkflow(
    owner: string,
    repo: string,
    workflowId: string | number,
    ref: string,
    inputs?: Record<string, string>
  ): Promise<void> {
    logger.info('Triggering workflow', { owner, repo, workflowId, ref });

    await this.octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflowId,
      ref,
      inputs,
    });
  }

  // Webhooks
  async createWebhook(
    owner: string,
    repo: string,
    options: {
      url: string;
      events: string[];
      secret?: string;
    }
  ): Promise<{ id: number }> {
    logger.info('Creating webhook', { owner, repo, url: options.url });

    const { data } = await this.octokit.rest.repos.createWebhook({
      owner,
      repo,
      config: {
        url: options.url,
        content_type: 'json',
        secret: options.secret || config.github.webhookSecret,
      },
      events: options.events,
      active: true,
    });

    return { id: data.id };
  }
}
