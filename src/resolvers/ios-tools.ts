/**
 * iOS Tools Resolvers
 *
 * Integration with iSH, Shellfish, Working Copy, Pyto, and other iOS development tools
 */

import { Context } from '../context.js';
import { resolverLogger as logger } from '../utils/logger.js';

export const iosToolsResolvers = {
  Mutation: {
    triggerWorkingCopy: async (
      _parent: unknown,
      args: { action: string; params?: Record<string, unknown> },
      context: Context
    ) => {
      logger.info('Triggering Working Copy', { action: args.action, params: args.params });

      if (!context.integrations.iosTools) {
        return {
          success: false,
          tool: 'Working Copy',
          action: args.action,
          error: 'iOS Tools integration not configured',
        };
      }

      try {
        const result = await context.integrations.iosTools.triggerWorkingCopy(
          args.action,
          args.params
        );

        return {
          success: true,
          tool: 'Working Copy',
          action: args.action,
          output: result,
          callbackUrl: result.callbackUrl,
        };
      } catch (error) {
        logger.error('Working Copy trigger failed', { error });
        return {
          success: false,
          tool: 'Working Copy',
          action: args.action,
          error: String(error),
        };
      }
    },

    triggerPyto: async (
      _parent: unknown,
      args: { script: string; args?: string[] },
      context: Context
    ) => {
      logger.info('Triggering Pyto', { script: args.script });

      if (!context.integrations.iosTools) {
        return {
          success: false,
          tool: 'Pyto',
          action: 'execute',
          error: 'iOS Tools integration not configured',
        };
      }

      try {
        const result = await context.integrations.iosTools.triggerPyto(
          args.script,
          args.args
        );

        return {
          success: true,
          tool: 'Pyto',
          action: 'execute',
          output: result,
        };
      } catch (error) {
        logger.error('Pyto trigger failed', { error });
        return {
          success: false,
          tool: 'Pyto',
          action: 'execute',
          error: String(error),
        };
      }
    },

    triggerShellfish: async (
      _parent: unknown,
      args: { command: string },
      context: Context
    ) => {
      logger.info('Triggering Shellfish', { command: args.command });

      if (!context.integrations.iosTools) {
        return {
          success: false,
          tool: 'Shellfish',
          action: 'execute',
          error: 'iOS Tools integration not configured',
        };
      }

      try {
        const result = await context.integrations.iosTools.triggerShellfish(args.command);

        return {
          success: true,
          tool: 'Shellfish',
          action: 'execute',
          output: result,
        };
      } catch (error) {
        logger.error('Shellfish trigger failed', { error });
        return {
          success: false,
          tool: 'Shellfish',
          action: 'execute',
          error: String(error),
        };
      }
    },
  },
};
