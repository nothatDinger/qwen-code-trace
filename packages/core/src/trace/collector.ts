/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import type { TraceRequest, TraceContent, TraceMetadata } from './types.js';

export class TraceCollector extends EventEmitter {
  private activeRequests: Map<string, TraceRequest> = new Map();
  private completedRequests: TraceRequest[] = [];
  private sessionId: string;
  private isEnabled: boolean = true;

  constructor(sessionId?: string) {
    super();
    this.sessionId = sessionId || uuidv4();
  }

  /**
   * Start tracking a new request
   */
  startRequest(
    type: 'llm' | 'tool_call' | 'embedding',
    content: Partial<TraceContent>,
    metadata: Partial<TraceMetadata> = {}
  ): string {
    if (!this.isEnabled) return '';

    const requestId = uuidv4();
    const now = Date.now();

    const request: TraceRequest = {
      id: requestId,
      type,
      startTime: now,
      status: 'running',
      content: content as TraceContent,
      metadata: {
        sessionId: this.sessionId,
        promptId: metadata.promptId || uuidv4(),
        requestId,
        parentRequestId: metadata.parentRequestId,
        tags: metadata.tags || [],
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        ...metadata,
      },
    };

    this.activeRequests.set(requestId, request);
    this.emit('requestStarted', request);
    
    return requestId;
  }

  /**
   * Update request content during execution
   */
  updateRequest(requestId: string, content: Partial<TraceContent>): void {
    if (!this.isEnabled) return;

    const request = this.activeRequests.get(requestId);
    if (request) {
      request.content = { ...request.content, ...content };
      this.emit('requestUpdated', request);
    }
  }

  /**
   * Complete a request
   */
  completeRequest(
    requestId: string,
    content: Partial<TraceContent>,
    status: 'completed' | 'failed' = 'completed'
  ): void {
    if (!this.isEnabled) return;

    const request = this.activeRequests.get(requestId);
    if (request) {
      const now = Date.now();
      request.endTime = now;
      request.duration = now - request.startTime;
      request.status = status;
      request.content = { ...request.content, ...content };

      this.activeRequests.delete(requestId);
      this.completedRequests.push(request);
      
      this.emit('requestCompleted', request);
    }
  }

  /**
   * Get all completed requests
   */
  getCompletedRequests(): TraceRequest[] {
    return [...this.completedRequests];
  }

  /**
   * Get active requests
   */
  getActiveRequests(): TraceRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Get all requests (active + completed)
   */
  getAllRequests(): TraceRequest[] {
    return [...this.completedRequests, ...this.getActiveRequests()];
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Enable/disable tracing
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if tracing is enabled
   */
  isTracingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Clear all trace data
   */
  clear(): void {
    this.activeRequests.clear();
    this.completedRequests = [];
    this.emit('cleared');
  }

  /**
   * Get trace statistics
   */
  getStats() {
    const allRequests = this.getAllRequests();
    const totalRequests = allRequests.length;
    const totalDuration = allRequests.reduce((sum, req) => sum + (req.duration || 0), 0);
    const averageDuration = totalRequests > 0 ? totalDuration / totalRequests : 0;

    const requestsByType = allRequests.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestsByStatus = allRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const failedRequests = allRequests.filter(req => req.status === 'failed').length;
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

    return {
      totalRequests,
      totalDuration,
      averageDuration,
      requestsByType,
      requestsByStatus,
      errorRate,
    };
  }
}
