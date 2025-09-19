/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TraceManager } from './manager.js';
import { TraceCollector } from './collector.js';
import { TraceDeduplicator } from './deduplicator.js';
import type { TraceRequest } from './types.js';

describe('TraceManager', () => {
  let traceManager: TraceManager;

  beforeEach(() => {
    traceManager = new TraceManager();
  });

  it('should create a trace manager', () => {
    expect(traceManager).toBeDefined();
    expect(traceManager.isTracingEnabled()).toBe(true);
  });

  it('should start and complete a request', () => {
    const requestId = traceManager.startRequest('llm', {
      prompt: 'Test prompt',
      model: 'test-model',
    }, {
      promptId: 'test-session',
      requestId: 'test-request',
    });

    expect(requestId).toBeDefined();
    expect(requestId.length).toBeGreaterThan(0);

    traceManager.completeRequest(requestId, {
      response: 'Test response',
      tokens: { prompt: 5, completion: 10, total: 15 },
    }, 'completed');

    const requests = traceManager.getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].type).toBe('llm');
    expect(requests[0].status).toBe('completed');
  });

  it('should generate statistics', () => {
    const requestId = traceManager.startRequest('llm', {
      prompt: 'Test prompt',
    }, {
      promptId: 'test-session',
    });

    traceManager.completeRequest(requestId, {
      response: 'Test response',
    }, 'completed');

    const stats = traceManager.getStats();
    expect(stats.totalRequests).toBe(1);
    expect(stats.requestsByType['llm']).toBe(1);
    expect(stats.requestsByStatus['completed']).toBe(1);
    expect(stats.errorRate).toBe(0);
  });

  it('should enable and disable tracing', () => {
    expect(traceManager.isTracingEnabled()).toBe(true);
    
    traceManager.setEnabled(false);
    expect(traceManager.isTracingEnabled()).toBe(false);
    
    traceManager.setEnabled(true);
    expect(traceManager.isTracingEnabled()).toBe(true);
  });
});

describe('TraceCollector', () => {
  let collector: TraceCollector;

  beforeEach(() => {
    collector = new TraceCollector();
  });

  it('should create a collector', () => {
    expect(collector).toBeDefined();
    expect(collector.getSessionId()).toBeDefined();
  });

  it('should track active and completed requests', () => {
    const requestId = collector.startRequest('llm', {
      prompt: 'Test prompt',
    });

    expect(collector.getActiveRequests()).toHaveLength(1);
    expect(collector.getCompletedRequests()).toHaveLength(0);

    collector.completeRequest(requestId, {
      response: 'Test response',
    }, 'completed');

    expect(collector.getActiveRequests()).toHaveLength(0);
    expect(collector.getCompletedRequests()).toHaveLength(1);
  });

  it('should emit events', () => {
    return new Promise<void>((resolve) => {
      collector.on('requestStarted', (request) => {
        expect(request.type).toBe('llm');
        resolve();
      });

      collector.startRequest('llm', {
        prompt: 'Test prompt',
      });
    });
  });
});

describe('TraceDeduplicator', () => {
  let deduplicator: TraceDeduplicator;

  beforeEach(() => {
    deduplicator = new TraceDeduplicator();
  });

  it('should deduplicate requests', () => {
    const requests: TraceRequest[] = [
      {
        id: '1',
        type: 'llm',
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        status: 'completed',
        content: { prompt: 'Hello world' },
        metadata: { sessionId: 's1', promptId: 'p1', requestId: 'r1' },
      },
      {
        id: '2',
        type: 'llm',
        startTime: 1500,
        endTime: 2500,
        duration: 1000,
        status: 'completed',
        content: { prompt: 'Hello world, how are you?' },
        metadata: { sessionId: 's1', promptId: 'p1', requestId: 'r2' },
      },
    ];

    const deduplicated = deduplicator.deduplicateRequests(requests);
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].id).toBe('2'); // Should keep the superset
  });

  it('should prepare Gantt chart data', () => {
    const requests: TraceRequest[] = [
      {
        id: '1',
        type: 'llm',
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        status: 'completed',
        content: { prompt: 'Test prompt' },
        metadata: { sessionId: 's1', promptId: 'p1', requestId: 'r1' },
      },
    ];

    const ganttData = deduplicator.prepareGanttData(requests);
    expect(ganttData.requests).toHaveLength(1);
    expect(ganttData.timeline.start).toBe(1000);
    expect(ganttData.timeline.end).toBe(2000);
    expect(ganttData.timeline.totalDuration).toBe(1000);
  });
});
