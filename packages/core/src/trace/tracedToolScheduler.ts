/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CoreToolScheduler } from '../core/coreToolScheduler.js';
// import type { ToolCallRequestInfo } from '../core/coreToolScheduler.js';
import { TraceManager } from './manager.js';

export class TracedCoreToolScheduler {
  private scheduler: CoreToolScheduler;
  private traceManager: TraceManager;

  constructor(scheduler: CoreToolScheduler, traceManager: TraceManager) {
    this.scheduler = scheduler;
    this.traceManager = traceManager;
  }

  /**
   * Schedule tool calls with tracing
   */
  async schedule(
    request: any | any[],
    signal: AbortSignal,
  ): Promise<void> {
    const requests = Array.isArray(request) ? request : [request];
    
    // Start tracing for each tool call
    const traceIds = requests.map(req => 
      this.traceManager.startRequest('tool_call', {
        toolName: req.name,
        toolArgs: req.args,
      }, {
        promptId: req.prompt_id,
        requestId: req.callId,
      })
    );

    try {
      // Call the original scheduler
      await this.scheduler.schedule(request, signal);

      // Complete traces for successful tool calls
      requests.forEach((req, index) => {
        this.traceManager.completeRequest(traceIds[index], {
          toolName: req.name,
          toolArgs: req.args,
          toolResult: 'completed',
        }, 'completed');
      });

    } catch (error) {
      // Complete traces for failed tool calls
      requests.forEach((req, index) => {
        this.traceManager.completeRequest(traceIds[index], {
          toolName: req.name,
          toolArgs: req.args,
          toolError: error instanceof Error ? error.message : String(error),
        }, 'failed');
      });
      throw error;
    }
  }

  // Note: Other methods removed as they are not accessible or don't exist
}
