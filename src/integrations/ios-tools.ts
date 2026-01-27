/**
 * iOS Tools Integration Client
 *
 * Integration with iSH, Shellfish, Working Copy, Pyto, and other iOS development tools
 * Uses x-callback-url scheme and webhook endpoints for communication
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { integrationLogger as logger } from '../utils/logger.js';

interface iOSToolResponse {
  success: boolean;
  output?: unknown;
  callbackUrl?: string;
  error?: string;
}

export class iOSToolsClient {
  private client: AxiosInstance;
  private webhookUrl?: string;
  private workingCopyCallback?: string;

  constructor() {
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.iosTools.apiKey || '',
      },
      timeout: 30000,
    });
    this.webhookUrl = config.iosTools.webhookUrl;
    this.workingCopyCallback = config.iosTools.workingCopyCallback;
  }

  async healthCheck(): Promise<void> {
    logger.debug('iOS Tools health check');
    if (this.webhookUrl) {
      await this.client.get(`${this.webhookUrl}/health`);
    }
  }

  // Working Copy Integration
  // https://workingcopy.app/url-schemes.html
  async triggerWorkingCopy(
    action: string,
    params?: Record<string, unknown>
  ): Promise<iOSToolResponse> {
    logger.info('Triggering Working Copy', { action, params });

    // Build x-callback-url
    const baseUrl = this.workingCopyCallback || 'working-copy://x-callback-url';

    const actionMap: Record<string, string> = {
      CLONE: 'clone',
      PULL: 'pull',
      PUSH: 'push',
      COMMIT: 'commit',
      CHECKOUT: 'checkout',
      STATUS: 'status',
    };

    const wcAction = actionMap[action] || action.toLowerCase();

    const urlParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlParams.append(key, String(value));
        }
      });
    }

    // Add callback URLs for async response
    if (this.webhookUrl) {
      urlParams.append('x-success', `${this.webhookUrl}/callback/working-copy/success`);
      urlParams.append('x-error', `${this.webhookUrl}/callback/working-copy/error`);
    }

    const callbackUrl = `${baseUrl}/${wcAction}?${urlParams.toString()}`;

    // If webhook is configured, send via webhook
    if (this.webhookUrl) {
      try {
        const response = await this.client.post(`${this.webhookUrl}/ios/working-copy`, {
          action: wcAction,
          params,
          callbackUrl,
        });

        return {
          success: true,
          output: response.data,
          callbackUrl,
        };
      } catch (error) {
        logger.error('Working Copy trigger failed', { error });
        return {
          success: false,
          error: String(error),
          callbackUrl,
        };
      }
    }

    // Return the callback URL for manual triggering
    return {
      success: true,
      callbackUrl,
      output: { message: 'Open this URL on iOS device', url: callbackUrl },
    };
  }

  // Pyto Integration
  // https://pyto.app/documentation/#x-callback-url
  async triggerPyto(
    script: string,
    args?: string[]
  ): Promise<iOSToolResponse> {
    logger.info('Triggering Pyto', { script });

    const urlParams = new URLSearchParams();
    urlParams.append('script', script);

    if (args && args.length > 0) {
      urlParams.append('arguments', args.join(' '));
    }

    if (this.webhookUrl) {
      urlParams.append('x-success', `${this.webhookUrl}/callback/pyto/success`);
      urlParams.append('x-error', `${this.webhookUrl}/callback/pyto/error`);
    }

    const callbackUrl = `pyto://x-callback-url/run?${urlParams.toString()}`;

    if (this.webhookUrl) {
      try {
        const response = await this.client.post(`${this.webhookUrl}/ios/pyto`, {
          script,
          args,
          callbackUrl,
        });

        return {
          success: true,
          output: response.data,
          callbackUrl,
        };
      } catch (error) {
        logger.error('Pyto trigger failed', { error });
        return {
          success: false,
          error: String(error),
          callbackUrl,
        };
      }
    }

    return {
      success: true,
      callbackUrl,
      output: { message: 'Open this URL on iOS device', url: callbackUrl },
    };
  }

  // Shellfish Integration
  // https://secureshellfish.app/
  async triggerShellfish(command: string): Promise<iOSToolResponse> {
    logger.info('Triggering Shellfish', { command: command.substring(0, 50) });

    const urlParams = new URLSearchParams();
    urlParams.append('cmd', command);

    if (this.webhookUrl) {
      urlParams.append('x-success', `${this.webhookUrl}/callback/shellfish/success`);
      urlParams.append('x-error', `${this.webhookUrl}/callback/shellfish/error`);
    }

    const callbackUrl = `shellfish://run?${urlParams.toString()}`;

    if (this.webhookUrl) {
      try {
        const response = await this.client.post(`${this.webhookUrl}/ios/shellfish`, {
          command,
          callbackUrl,
        });

        return {
          success: true,
          output: response.data,
          callbackUrl,
        };
      } catch (error) {
        logger.error('Shellfish trigger failed', { error });
        return {
          success: false,
          error: String(error),
          callbackUrl,
        };
      }
    }

    return {
      success: true,
      callbackUrl,
      output: { message: 'Open this URL on iOS device', url: callbackUrl },
    };
  }

  // iSH Integration
  // https://ish.app/
  async triggerISH(options: {
    command?: string;
    workingDirectory?: string;
    launchApp?: string;
  }): Promise<iOSToolResponse> {
    logger.info('Triggering iSH', { options });

    const urlParams = new URLSearchParams();

    if (options.command) {
      urlParams.append('cmd', options.command);
    }
    if (options.workingDirectory) {
      urlParams.append('cd', options.workingDirectory);
    }
    if (options.launchApp) {
      urlParams.append('launch', options.launchApp);
    }

    const callbackUrl = `ish://run?${urlParams.toString()}`;

    if (this.webhookUrl) {
      try {
        const response = await this.client.post(`${this.webhookUrl}/ios/ish`, {
          ...options,
          callbackUrl,
        });

        return {
          success: true,
          output: response.data,
          callbackUrl,
        };
      } catch (error) {
        logger.error('iSH trigger failed', { error });
        return {
          success: false,
          error: String(error),
          callbackUrl,
        };
      }
    }

    return {
      success: true,
      callbackUrl,
      output: { message: 'Open this URL on iOS device', url: callbackUrl },
    };
  }

  // a]a-Shell Integration
  // https://holzschu.github.io/a-Shell_iOS/
  async triggerAShell(command: string): Promise<iOSToolResponse> {
    logger.info('Triggering a-Shell', { command: command.substring(0, 50) });

    const urlParams = new URLSearchParams();
    urlParams.append('command', command);

    const callbackUrl = `a-shell://execute?${urlParams.toString()}`;

    if (this.webhookUrl) {
      try {
        const response = await this.client.post(`${this.webhookUrl}/ios/a-shell`, {
          command,
          callbackUrl,
        });

        return {
          success: true,
          output: response.data,
          callbackUrl,
        };
      } catch (error) {
        logger.error('a-Shell trigger failed', { error });
        return {
          success: false,
          error: String(error),
          callbackUrl,
        };
      }
    }

    return {
      success: true,
      callbackUrl,
      output: { message: 'Open this URL on iOS device', url: callbackUrl },
    };
  }

  // Shortcuts Integration
  async triggerShortcut(
    shortcutName: string,
    input?: unknown
  ): Promise<iOSToolResponse> {
    logger.info('Triggering Shortcuts', { shortcutName });

    const urlParams = new URLSearchParams();
    urlParams.append('name', shortcutName);

    if (input) {
      urlParams.append('input', JSON.stringify(input));
    }

    const callbackUrl = `shortcuts://run-shortcut?${urlParams.toString()}`;

    if (this.webhookUrl) {
      try {
        const response = await this.client.post(`${this.webhookUrl}/ios/shortcuts`, {
          shortcutName,
          input,
          callbackUrl,
        });

        return {
          success: true,
          output: response.data,
          callbackUrl,
        };
      } catch (error) {
        logger.error('Shortcuts trigger failed', { error });
        return {
          success: false,
          error: String(error),
          callbackUrl,
        };
      }
    }

    return {
      success: true,
      callbackUrl,
      output: { message: 'Open this URL on iOS device', url: callbackUrl },
    };
  }

  // Generic URL Scheme Trigger
  async triggerUrlScheme(
    scheme: string,
    path: string,
    params?: Record<string, string>
  ): Promise<iOSToolResponse> {
    logger.info('Triggering URL scheme', { scheme, path });

    const urlParams = new URLSearchParams(params || {});
    const callbackUrl = `${scheme}://${path}?${urlParams.toString()}`;

    if (this.webhookUrl) {
      try {
        const response = await this.client.post(`${this.webhookUrl}/ios/generic`, {
          scheme,
          path,
          params,
          callbackUrl,
        });

        return {
          success: true,
          output: response.data,
          callbackUrl,
        };
      } catch (error) {
        logger.error('URL scheme trigger failed', { error });
        return {
          success: false,
          error: String(error),
          callbackUrl,
        };
      }
    }

    return {
      success: true,
      callbackUrl,
      output: { message: 'Open this URL on iOS device', url: callbackUrl },
    };
  }

  // Batch Operations
  async executeBatch(
    operations: Array<{
      tool: 'working-copy' | 'pyto' | 'shellfish' | 'ish' | 'a-shell' | 'shortcuts';
      action: string;
      params?: Record<string, unknown>;
    }>
  ): Promise<iOSToolResponse[]> {
    logger.info('Executing batch iOS operations', { count: operations.length });

    const results: iOSToolResponse[] = [];

    for (const op of operations) {
      let result: iOSToolResponse;

      switch (op.tool) {
        case 'working-copy':
          result = await this.triggerWorkingCopy(op.action, op.params);
          break;
        case 'pyto':
          result = await this.triggerPyto(
            op.params?.script as string,
            op.params?.args as string[]
          );
          break;
        case 'shellfish':
          result = await this.triggerShellfish(op.params?.command as string);
          break;
        case 'ish':
          result = await this.triggerISH(op.params as {
            command?: string;
            workingDirectory?: string;
          });
          break;
        case 'a-shell':
          result = await this.triggerAShell(op.params?.command as string);
          break;
        case 'shortcuts':
          result = await this.triggerShortcut(
            op.params?.shortcutName as string,
            op.params?.input
          );
          break;
        default:
          result = { success: false, error: `Unknown tool: ${op.tool}` };
      }

      results.push(result);
    }

    return results;
  }
}
