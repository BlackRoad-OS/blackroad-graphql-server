/**
 * Project Resolvers
 *
 * Salesforce-like project management with Git and CRM integration
 */

import { nanoid } from 'nanoid';
import { Context } from '../context.js';
import { resolverLogger as logger } from '../utils/logger.js';
import { generateShaInfinityHash, sha256 } from '../utils/hash/index.js';

// In-memory store (replace with database in production)
const projectStore = new Map<string, Project>();

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  ownerId?: string;
  teamId?: string;
  organizationId?: string;
  tags: string[];
  customFields?: Record<string, unknown>;
  gitRepository?: GitRepository;
  salesforceId?: string;
  crmRecordId?: string;
  deployments: Deployment[];
  todos: Todo[];
  contentHash?: string;
  stateHash?: string;
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  dueDate?: Date;
}

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

interface Deployment {
  id: string;
  provider: string;
  environment: string;
  status: string;
  url?: string;
  gitRef?: string;
  config?: Record<string, unknown>;
  logs: string[];
  createdAt: Date;
  completedAt?: Date;
}

interface Todo {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  dueDate?: Date;
  tags: string[];
  hash: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function computeProjectHash(project: Project): Promise<string> {
  const content = JSON.stringify({
    name: project.name,
    status: project.status,
    priority: project.priority,
    tags: project.tags,
    updatedAt: project.updatedAt,
  });
  return sha256(content);
}

export const projectResolvers = {
  Query: {
    projects: async (
      _parent: unknown,
      args: { filter?: Record<string, unknown>; pagination?: Record<string, unknown> },
      _context: Context
    ) => {
      logger.info('Fetching projects', { filter: args.filter });

      let projects = Array.from(projectStore.values());

      // Apply filters
      if (args.filter) {
        const { status, priority, category, tags, search } = args.filter as {
          status?: string[];
          priority?: string[];
          category?: string;
          tags?: string[];
          search?: string;
        };

        if (status?.length) {
          projects = projects.filter((p) => status.includes(p.status));
        }
        if (priority?.length) {
          projects = projects.filter((p) => priority.includes(p.priority));
        }
        if (category) {
          projects = projects.filter((p) => p.category === category);
        }
        if (tags?.length) {
          projects = projects.filter((p) => tags.some((t) => p.tags.includes(t)));
        }
        if (search) {
          const searchLower = search.toLowerCase();
          projects = projects.filter(
            (p) =>
              p.name.toLowerCase().includes(searchLower) ||
              p.description?.toLowerCase().includes(searchLower)
          );
        }
      }

      // Sort by updatedAt descending
      projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      return {
        edges: projects.map((p) => ({ node: p, cursor: p.id })),
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: projects[0]?.id,
          endCursor: projects[projects.length - 1]?.id,
        },
        totalCount: projects.length,
      };
    },

    project: async (_parent: unknown, args: { id: string }, _context: Context) => {
      logger.info('Fetching project', { id: args.id });
      return projectStore.get(args.id) || null;
    },

    projectBySlug: async (_parent: unknown, args: { slug: string }, _context: Context) => {
      logger.info('Fetching project by slug', { slug: args.slug });
      return Array.from(projectStore.values()).find((p) => p.slug === args.slug) || null;
    },

    todos: async (_parent: unknown, args: { projectId?: string }, _context: Context) => {
      logger.info('Fetching todos', { projectId: args.projectId });
      const todos: Todo[] = [];
      for (const project of projectStore.values()) {
        if (!args.projectId || project.id === args.projectId) {
          todos.push(...project.todos);
        }
      }
      return todos;
    },
  },

  Mutation: {
    createProject: async (
      _parent: unknown,
      args: { input: Record<string, unknown> },
      context: Context
    ) => {
      logger.info('Creating project', { input: args.input });

      const id = nanoid();
      const now = new Date();

      const project: Project = {
        id,
        name: args.input.name as string,
        slug: (args.input.slug as string) || generateSlug(args.input.name as string),
        description: args.input.description as string | undefined,
        status: (args.input.status as string) || 'DRAFT',
        priority: (args.input.priority as string) || 'MEDIUM',
        category: args.input.category as string | undefined,
        ownerId: context.user?.id,
        tags: (args.input.tags as string[]) || [],
        customFields: args.input.customFields as Record<string, unknown> | undefined,
        deployments: [],
        todos: [],
        createdAt: now,
        updatedAt: now,
        startDate: args.input.startDate ? new Date(args.input.startDate as string) : undefined,
        dueDate: args.input.dueDate ? new Date(args.input.dueDate as string) : undefined,
      };

      // Generate content hash
      project.contentHash = await computeProjectHash(project);
      project.stateHash = await generateShaInfinityHash(JSON.stringify(project));

      // Sync to GitHub if repository URL provided
      if (args.input.gitRepositoryUrl && context.integrations.github) {
        try {
          const repoInfo = await context.integrations.github.getRepository(
            args.input.gitRepositoryUrl as string
          );
          project.gitRepository = repoInfo;
        } catch (error) {
          logger.warn('Failed to fetch Git repository info', { error });
        }
      }

      projectStore.set(id, project);
      logger.info('Project created', { id, slug: project.slug });

      return project;
    },

    updateProject: async (
      _parent: unknown,
      args: { id: string; input: Record<string, unknown> },
      _context: Context
    ) => {
      logger.info('Updating project', { id: args.id, input: args.input });

      const project = projectStore.get(args.id);
      if (!project) {
        throw new Error(`Project not found: ${args.id}`);
      }

      // Update fields
      Object.assign(project, {
        ...args.input,
        updatedAt: new Date(),
      });

      // Recompute hashes
      project.contentHash = await computeProjectHash(project);
      project.stateHash = await generateShaInfinityHash(JSON.stringify(project));

      projectStore.set(args.id, project);
      logger.info('Project updated', { id: args.id });

      return project;
    },

    deleteProject: async (_parent: unknown, args: { id: string }, _context: Context) => {
      logger.info('Deleting project', { id: args.id });
      const deleted = projectStore.delete(args.id);
      return deleted;
    },

    syncProjectToSalesforce: async (
      _parent: unknown,
      args: { id: string },
      context: Context
    ) => {
      logger.info('Syncing project to Salesforce', { id: args.id });

      const project = projectStore.get(args.id);
      if (!project) {
        return { success: false, message: 'Project not found', errors: ['Project not found'] };
      }

      if (!context.integrations.salesforce) {
        return { success: false, message: 'Salesforce integration not configured', errors: ['Integration not configured'] };
      }

      try {
        const result = await context.integrations.salesforce.upsertRecord('Project__c', {
          Name: project.name,
          Description__c: project.description,
          Status__c: project.status,
          Priority__c: project.priority,
          External_Id__c: project.id,
        });

        project.salesforceId = result.id;
        projectStore.set(args.id, project);

        return { success: true, salesforceId: result.id };
      } catch (error) {
        logger.error('Failed to sync to Salesforce', { error });
        return { success: false, message: 'Sync failed', errors: [String(error)] };
      }
    },

    syncProjectFromGitHub: async (
      _parent: unknown,
      args: { repoUrl: string },
      context: Context
    ) => {
      logger.info('Syncing project from GitHub', { repoUrl: args.repoUrl });

      if (!context.integrations.github) {
        throw new Error('GitHub integration not configured');
      }

      const repoInfo = await context.integrations.github.getRepository(args.repoUrl);

      // Check if project already exists
      const existingProject = Array.from(projectStore.values()).find(
        (p) => p.gitRepository?.fullName === repoInfo.fullName
      );

      if (existingProject) {
        existingProject.gitRepository = repoInfo;
        existingProject.updatedAt = new Date();
        projectStore.set(existingProject.id, existingProject);
        return existingProject;
      }

      // Create new project from repo
      const id = nanoid();
      const now = new Date();

      const project: Project = {
        id,
        name: repoInfo.name,
        slug: generateSlug(repoInfo.fullName),
        description: `Synced from GitHub: ${repoInfo.fullName}`,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        tags: ['github', 'synced'],
        gitRepository: repoInfo,
        deployments: [],
        todos: [],
        createdAt: now,
        updatedAt: now,
      };

      project.contentHash = await computeProjectHash(project);
      project.stateHash = await generateShaInfinityHash(JSON.stringify(project));

      projectStore.set(id, project);
      return project;
    },

    createTodo: async (
      _parent: unknown,
      args: { input: Record<string, unknown> },
      _context: Context
    ) => {
      logger.info('Creating todo', { input: args.input });

      const id = nanoid();
      const now = new Date();

      const todo: Todo = {
        id,
        projectId: args.input.projectId as string | undefined,
        title: args.input.title as string,
        description: args.input.description as string | undefined,
        status: 'PENDING',
        priority: (args.input.priority as string) || 'MEDIUM',
        assigneeId: args.input.assigneeId as string | undefined,
        dueDate: args.input.dueDate ? new Date(args.input.dueDate as string) : undefined,
        tags: (args.input.tags as string[]) || [],
        hash: '',
        createdAt: now,
        updatedAt: now,
      };

      todo.hash = sha256(JSON.stringify(todo));

      // Add to project if projectId specified
      if (todo.projectId) {
        const project = projectStore.get(todo.projectId);
        if (project) {
          project.todos.push(todo);
          projectStore.set(todo.projectId, project);
        }
      }

      return todo;
    },

    updateTodo: async (
      _parent: unknown,
      args: { id: string; input: Record<string, unknown> },
      _context: Context
    ) => {
      logger.info('Updating todo', { id: args.id, input: args.input });

      for (const project of projectStore.values()) {
        const todoIndex = project.todos.findIndex((t) => t.id === args.id);
        if (todoIndex !== -1) {
          const todo = project.todos[todoIndex];
          Object.assign(todo, {
            ...args.input,
            updatedAt: new Date(),
          });
          todo.hash = sha256(JSON.stringify(todo));
          project.todos[todoIndex] = todo;
          projectStore.set(project.id, project);
          return todo;
        }
      }

      throw new Error(`Todo not found: ${args.id}`);
    },

    completeTodo: async (_parent: unknown, args: { id: string }, _context: Context) => {
      logger.info('Completing todo', { id: args.id });

      for (const project of projectStore.values()) {
        const todoIndex = project.todos.findIndex((t) => t.id === args.id);
        if (todoIndex !== -1) {
          const todo = project.todos[todoIndex];
          todo.status = 'COMPLETED';
          todo.completedAt = new Date();
          todo.updatedAt = new Date();
          todo.hash = sha256(JSON.stringify(todo));
          project.todos[todoIndex] = todo;
          projectStore.set(project.id, project);
          return todo;
        }
      }

      throw new Error(`Todo not found: ${args.id}`);
    },

    deleteTodo: async (_parent: unknown, args: { id: string }, _context: Context) => {
      logger.info('Deleting todo', { id: args.id });

      for (const project of projectStore.values()) {
        const todoIndex = project.todos.findIndex((t) => t.id === args.id);
        if (todoIndex !== -1) {
          project.todos.splice(todoIndex, 1);
          projectStore.set(project.id, project);
          return true;
        }
      }

      return false;
    },
  },
};
