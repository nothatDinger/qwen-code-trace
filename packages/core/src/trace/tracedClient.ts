/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GeminiClient } from '../core/client.js';
import type { Config } from '../config/config.js';
import { TraceManager } from './manager.js';
import { v4 as uuidv4 } from 'uuid';
// import type { TraceRequest } from './types.js';

export class TracedGeminiClient {
  private traceManager: TraceManager;
  private client: GeminiClient;
  private config: Config;

  constructor(client: GeminiClient, config: Config, traceManager?: TraceManager) {
    this.client = client;
    this.config = config;
    this.traceManager = traceManager ?? new TraceManager();
  }

  /**
   * Initialize the client with tracing enabled
   */
  async initialize(contentGeneratorConfig: any) {
    await this.client.initialize(contentGeneratorConfig);
  }

  /**
   * Send message stream with tracing
   */
  async *sendMessageStream(
    request: any,
    signal: AbortSignal,
    prompt_id: string,
    turns?: number,
    originalModel?: string,
  ) {
    // Start tracing the LLM request
    const defaultModel = originalModel || this.config?.getModel?.() || 'unknown';
    const requestId = `llm-${Date.now()}`;
    const traceId = this.traceManager.startRequest('llm', {
      prompt: this.extractPromptFromRequest(request),
      model: defaultModel,
    }, {
      promptId: prompt_id,
      requestId,
    });

    // Save raw request data
    this.traceManager.saveRawLLMData({
      id: uuidv4(),
      sessionId: this.traceManager.getCurrentSessionId(),
      requestId,
      timestamp: Date.now(),
      type: 'request',
      data: {
        request: {
          contents: request,
          generationConfig: undefined,
          safetySettings: undefined,
          tools: undefined,
          systemInstruction: undefined,
        },
        model: defaultModel,
        promptId: prompt_id,
      },
    });

    try {
      // Update trace with request details
      this.traceManager.updateRequest(traceId, {
        prompt: this.extractPromptFromRequest(request),
        model: defaultModel,
      });

      // Call the original client method
      const resultStream = this.client.sendMessageStream(
        request,
        signal,
        prompt_id,
        turns,
        defaultModel,
      );

      let responseText = '';
      let tokens = { prompt: 0, completion: 0, total: 0 };
      let rawResponseData: any = null;

      for await (const event of resultStream) {
        // Collect response content
        if (event.type === 'content' && 'value' in event && event.value) {
          responseText += String(event.value);
        }

        // Store raw response data (collect all events for now)
        rawResponseData = event;

        // Update trace with response content
        this.traceManager.updateRequest(traceId, {
          response: responseText,
        });

        yield event;
      }

      // Save raw response data
      if (rawResponseData) {
        this.traceManager.saveRawLLMData({
          id: uuidv4(),
          sessionId: this.traceManager.getCurrentSessionId(),
          requestId,
          timestamp: Date.now(),
          type: 'response',
          data: {
            response: rawResponseData,
            model: defaultModel,
            promptId: prompt_id,
          },
        });
      }

      // Complete the trace
      this.traceManager.completeRequest(traceId, {
        response: responseText,
        tokens,
      }, 'completed');

    } catch (error) {
      // Save error response
      this.traceManager.saveRawLLMData({
        id: uuidv4(),
        sessionId: this.traceManager.getCurrentSessionId(),
        requestId,
        timestamp: Date.now(),
        type: 'response',
        data: {
          error: error instanceof Error ? error.message : String(error),
          model: defaultModel,
          promptId: prompt_id,
        },
      });

      // Complete the trace with error
      this.traceManager.completeRequest(traceId, {
        response: '',
        tokens: { prompt: 0, completion: 0, total: 0 },
      }, 'failed');
      throw error;
    }
  }

  /**
   * Generate JSON with tracing
   */
  async generateJson(
    contents: any[],
    schema: Record<string, unknown>,
    abortSignal: AbortSignal,
    model?: string,
    config: any = {},
  ) {
    const defaultModel = model || this.config?.getModel?.() || 'unknown';
    const traceId = this.traceManager.startRequest('llm', {
      prompt: this.extractPromptFromContents(contents),
      model: defaultModel,
    }, {
      promptId: `json-${Date.now()}`,
      requestId: `json-${Date.now()}`,
    });

    try {
      const result = await this.client.generateJson(
        contents,
        schema,
        abortSignal,
        defaultModel,
        config,
      );

      this.traceManager.completeRequest(traceId, {
        response: JSON.stringify(result),
        tokens: { prompt: 0, completion: 0, total: 0 },
      }, 'completed');

      return result;
    } catch (error) {
      this.traceManager.completeRequest(traceId, {
        response: '',
        tokens: { prompt: 0, completion: 0, total: 0 },
      }, 'failed');
      throw error;
    }
  }

  // Note: embedContent method removed as it doesn't exist in GeminiClient

  /**
   * Get trace manager for external access
   */
  getTraceManager(): TraceManager {
    return this.traceManager;
  }

  /**
   * Extract prompt text from request
   */
  private extractPromptFromRequest(request: any): string {
    if (Array.isArray(request)) {
      return request.map(part => {
        if (typeof part === 'string') return part;
        if (part.text) return part.text;
        if (part.inlineData) return '[Binary Data]';
        return JSON.stringify(part);
      }).join(' ');
    }
    return String(request);
  }

  /**
   * Extract prompt text from contents
   */
  private extractPromptFromContents(contents: any[]): string {
    return contents.map(content => {
      if (content.parts) {
        return content.parts.map((part: any) => {
          if (part.text) return part.text;
          if (part.inlineData) return '[Binary Data]';
          return JSON.stringify(part);
        }).join(' ');
      }
      return JSON.stringify(content);
    }).join('\n');
  }

  // Note: extractInputFromEmbedRequest method removed as it's not used

  /**
   * Delegate other methods to the original client
   */
  getContentGenerator() {
    return this.client.getContentGenerator();
  }

  getChat() {
    return this.client.getChat();
  }

  getHistory() {
    return this.client.getHistory();
  }

  // Note: reset and getSessionId methods removed as they don't exist in GeminiClient
}
