/**
 * Agent Resolvers
 *
 * AI Agent management and task execution
 */

import { nanoid } from 'nanoid';
import { Context } from '../context.js';
import { resolverLogger as logger } from '../utils/logger.js';

// In-memory stores
const agentStore = new Map<string, Agent>();
const taskStore = new Map<string, AgentTask>();

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  capabilities: string[];
  configuration?: Record<string, unknown>;
  instructions?: string;
  currentTaskId?: string;
  taskHistory: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface AgentTask {
  id: string;
  agentId: string;
  task: string;
  status: string;
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

// Initialize default Claude agent
const defaultClaudeAgent: Agent = {
  id: 'claude-default',
  name: 'Claude Assistant',
  type: 'CLAUDE',
  status: 'IDLE',
  capabilities: [
    'code-generation',
    'code-review',
    'documentation',
    'debugging',
    'refactoring',
    'testing',
    'deployment-planning',
    'architecture-design',
  ],
  instructions: `You are a helpful AI assistant for the BlackRoad GraphQL Server project.

Your responsibilities include:
1. Helping with code development and review
2. Managing project tasks and todos
3. Coordinating deployments across cloud providers
4. Maintaining CRM state synchronization
5. Ensuring code quality and best practices

When executing tasks:
- Always verify changes before committing
- Run tests after code modifications
- Update documentation as needed
- Follow the project's coding standards
- Create clear, atomic commits with descriptive messages

For PR management:
- Ensure all checks pass before requesting review
- Provide clear descriptions of changes
- Link related issues
- Request appropriate reviewers`,
  taskHistory: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

agentStore.set(defaultClaudeAgent.id, defaultClaudeAgent);

export const agentResolvers = {
  Query: {
    agents: async (_parent: unknown, _args: unknown, _context: Context) => {
      logger.info('Fetching all agents');
      return Array.from(agentStore.values());
    },

    agent: async (_parent: unknown, args: { id: string }, _context: Context) => {
      logger.info('Fetching agent', { id: args.id });
      return agentStore.get(args.id) || null;
    },

    agentTasks: async (_parent: unknown, args: { agentId: string }, _context: Context) => {
      logger.info('Fetching agent tasks', { agentId: args.agentId });
      return Array.from(taskStore.values()).filter((t) => t.agentId === args.agentId);
    },
  },

  Mutation: {
    createAgent: async (
      _parent: unknown,
      args: { input: Record<string, unknown> },
      _context: Context
    ) => {
      logger.info('Creating agent', { input: args.input });

      const id = nanoid();
      const now = new Date();

      const agent: Agent = {
        id,
        name: args.input.name as string,
        type: args.input.type as string,
        status: 'IDLE',
        capabilities: args.input.capabilities as string[],
        configuration: args.input.configuration as Record<string, unknown> | undefined,
        instructions: args.input.instructions as string | undefined,
        taskHistory: [],
        createdAt: now,
        updatedAt: now,
      };

      agentStore.set(id, agent);
      logger.info('Agent created', { id, name: agent.name });

      return agent;
    },

    updateAgent: async (
      _parent: unknown,
      args: { id: string; input: Record<string, unknown> },
      _context: Context
    ) => {
      logger.info('Updating agent', { id: args.id, input: args.input });

      const agent = agentStore.get(args.id);
      if (!agent) {
        throw new Error(`Agent not found: ${args.id}`);
      }

      Object.assign(agent, {
        ...args.input,
        updatedAt: new Date(),
      });

      agentStore.set(args.id, agent);
      return agent;
    },

    executeAgentTask: async (
      _parent: unknown,
      args: { agentId: string; task: string },
      context: Context
    ) => {
      logger.info('Executing agent task', { agentId: args.agentId, task: args.task });

      const agent = agentStore.get(args.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${args.agentId}`);
      }

      const taskId = nanoid();
      const now = new Date();

      const task: AgentTask = {
        id: taskId,
        agentId: args.agentId,
        task: args.task,
        status: 'PENDING',
        createdAt: now,
      };

      taskStore.set(taskId, task);

      // Update agent status
      agent.status = 'RUNNING';
      agent.currentTaskId = taskId;
      agentStore.set(args.agentId, agent);

      try {
        task.status = 'IN_PROGRESS';
        task.startedAt = new Date();
        taskStore.set(taskId, task);

        let result: unknown;

        // Execute based on agent type
        if (agent.type === 'CLAUDE' && context.integrations.claude) {
          const systemPrompt = agent.instructions || 'You are a helpful assistant.';

          const response = await context.integrations.claude.complete({
            system: systemPrompt,
            messages: [{ role: 'user', content: args.task }],
          });

          result = {
            response: response.content,
            model: response.model,
            usage: response.usage,
          };
        } else if (agent.type === 'WEBHOOK' && agent.configuration?.webhookUrl) {
          // Execute webhook task
          const response = await fetch(agent.configuration.webhookUrl as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task: args.task }),
          });
          result = await response.json();
        } else {
          result = { message: 'Task queued for processing', task: args.task };
        }

        task.status = 'COMPLETED';
        task.result = result;
        task.completedAt = new Date();
        taskStore.set(taskId, task);

        // Update agent
        agent.status = 'IDLE';
        agent.currentTaskId = undefined;
        agent.taskHistory.push(taskId);
        agent.updatedAt = new Date();
        agentStore.set(args.agentId, agent);

        return {
          taskId,
          success: true,
          result,
        };
      } catch (error) {
        task.status = 'FAILED';
        task.error = String(error);
        task.completedAt = new Date();
        taskStore.set(taskId, task);

        agent.status = 'IDLE';
        agent.currentTaskId = undefined;
        agent.taskHistory.push(taskId);
        agent.updatedAt = new Date();
        agentStore.set(args.agentId, agent);

        return {
          taskId,
          success: false,
          error: String(error),
        };
      }
    },
  },
};
