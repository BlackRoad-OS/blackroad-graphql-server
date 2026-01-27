/**
 * Anthropic/Claude Integration Client
 *
 * Claude API for AI-powered operations
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';
import { integrationLogger as logger } from '../utils/logger.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CompletionResponse {
  content: string;
  model: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class ClaudeClient {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
    this.model = config.anthropic.model;
    this.maxTokens = config.anthropic.maxTokens;
  }

  async healthCheck(): Promise<void> {
    logger.debug('Claude health check');
    // Simple API check - list models or make a minimal request
    await this.client.messages.create({
      model: this.model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }],
    });
  }

  async complete(options: {
    system?: string;
    messages: Message[];
    maxTokens?: number;
    temperature?: number;
    stopSequences?: string[];
  }): Promise<CompletionResponse> {
    logger.info('Creating Claude completion', {
      model: this.model,
      messageCount: options.messages.length,
    });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens || this.maxTokens,
      system: options.system,
      messages: options.messages,
      temperature: options.temperature,
      stop_sequences: options.stopSequences,
    });

    const textContent = response.content.find((c) => c.type === 'text');

    return {
      content: textContent?.type === 'text' ? textContent.text : '',
      model: response.model,
      stopReason: response.stop_reason || 'end_turn',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  async stream(options: {
    system?: string;
    messages: Message[];
    maxTokens?: number;
    temperature?: number;
    onChunk?: (chunk: string) => void;
  }): Promise<CompletionResponse> {
    logger.info('Creating Claude streaming completion', {
      model: this.model,
    });

    let fullContent = '';
    let usage = { inputTokens: 0, outputTokens: 0 };

    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens || this.maxTokens,
      system: options.system,
      messages: options.messages,
      temperature: options.temperature,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          fullContent += delta.text;
          options.onChunk?.(delta.text);
        }
      } else if (event.type === 'message_delta') {
        usage = {
          inputTokens: 0, // Not available in delta
          outputTokens: event.usage?.output_tokens || 0,
        };
      }
    }

    return {
      content: fullContent,
      model: this.model,
      stopReason: 'end_turn',
      usage,
    };
  }

  // Specialized methods for common tasks
  async codeReview(code: string, language: string): Promise<string> {
    logger.info('Performing code review', { language });

    const response = await this.complete({
      system: `You are an expert code reviewer. Review the following ${language} code for:
1. Bugs and potential issues
2. Security vulnerabilities
3. Performance optimizations
4. Code style and best practices
5. Maintainability improvements

Provide specific, actionable feedback.`,
      messages: [{ role: 'user', content: code }],
    });

    return response.content;
  }

  async generateCode(
    prompt: string,
    language: string,
    context?: string
  ): Promise<string> {
    logger.info('Generating code', { language });

    const systemPrompt = `You are an expert ${language} developer. Generate clean, well-documented, production-ready code.
${context ? `Context:\n${context}` : ''}

Requirements:
- Follow best practices for ${language}
- Include error handling
- Add appropriate comments
- Use modern syntax and features`;

    const response = await this.complete({
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content;
  }

  async explainCode(code: string, language: string): Promise<string> {
    logger.info('Explaining code', { language });

    const response = await this.complete({
      system: `You are a patient teacher explaining ${language} code. Explain the code clearly, breaking down complex concepts for someone learning to code.`,
      messages: [
        {
          role: 'user',
          content: `Please explain this ${language} code:\n\n${code}`,
        },
      ],
    });

    return response.content;
  }

  async generateTests(code: string, language: string, framework?: string): Promise<string> {
    logger.info('Generating tests', { language, framework });

    const testFramework = framework || (language === 'typescript' ? 'vitest' : 'jest');

    const response = await this.complete({
      system: `You are an expert in writing ${language} tests using ${testFramework}. Generate comprehensive tests that cover:
1. Happy path scenarios
2. Edge cases
3. Error handling
4. Boundary conditions

Write clean, maintainable tests with descriptive names.`,
      messages: [
        {
          role: 'user',
          content: `Generate tests for this code:\n\n${code}`,
        },
      ],
    });

    return response.content;
  }

  async analyzeForDeployment(
    projectInfo: Record<string, unknown>
  ): Promise<string> {
    logger.info('Analyzing project for deployment');

    const response = await this.complete({
      system: `You are a DevOps expert. Analyze the project and provide deployment recommendations including:
1. Recommended cloud providers and services
2. Infrastructure requirements
3. CI/CD pipeline suggestions
4. Security considerations
5. Scaling strategies
6. Cost optimization tips`,
      messages: [
        {
          role: 'user',
          content: `Analyze this project for deployment:\n${JSON.stringify(projectInfo, null, 2)}`,
        },
      ],
    });

    return response.content;
  }

  async generateDocumentation(
    code: string,
    language: string,
    format: 'jsdoc' | 'markdown' | 'readme' = 'jsdoc'
  ): Promise<string> {
    logger.info('Generating documentation', { language, format });

    const response = await this.complete({
      system: `You are a technical writer specializing in ${language} documentation. Generate ${format} documentation that is:
1. Clear and concise
2. Includes examples where appropriate
3. Documents all public APIs
4. Follows ${language} documentation conventions`,
      messages: [
        {
          role: 'user',
          content: `Generate ${format} documentation for:\n\n${code}`,
        },
      ],
    });

    return response.content;
  }

  async chat(
    messages: Message[],
    systemPrompt?: string
  ): Promise<string> {
    logger.info('Chat completion', { messageCount: messages.length });

    const response = await this.complete({
      system: systemPrompt || 'You are a helpful assistant for the BlackRoad GraphQL Server project.',
      messages,
    });

    return response.content;
  }
}
