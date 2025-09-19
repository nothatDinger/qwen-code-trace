/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TraceRequest {
  id: string;
  type: 'llm' | 'tool_call' | 'embedding';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  content: TraceContent;
  metadata: TraceMetadata;
}

export interface TraceContent {
  // For LLM requests
  prompt?: string;
  response?: string;
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  
  // For tool calls
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  toolError?: string;
  
  // For embedding requests
  input?: string;
  embedding?: number[];
  embeddingModel?: string;
}

export interface TraceMetadata {
  sessionId: string;
  promptId: string;
  userId?: string;
  requestId: string;
  parentRequestId?: string;
  tags?: string[];
  environment?: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

export interface TraceSession {
  id: string;
  startTime: number;
  endTime?: number;
  totalRequests: number;
  totalDuration: number;
  requests: TraceRequest[];
}

export interface TraceStats {
  totalRequests: number;
  totalDuration: number;
  averageDuration: number;
  requestsByType: Record<string, number>;
  requestsByStatus: Record<string, number>;
  errorRate: number;
}

export interface GanttChartData {
  requests: Array<{
    id: string;
    name: string;
    start: number;
    end: number;
    duration: number;
    type: string;
    status: string;
    color: string;
    originalRequest?: TraceRequest; // 包含原始请求数据用于详细信息
  }>;
  timeline: {
    start: number;
    end: number;
    totalDuration: number;
  };
}

export interface TraceFilter {
  sessionId?: string;
  type?: 'llm' | 'tool_call' | 'embedding';
  status?: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export interface TraceExportOptions {
  format: 'json' | 'csv' | 'gantt';
  includeContent: boolean;
  includeMetadata: boolean;
  filter?: TraceFilter;
}

export interface RawLLMData {
  id: string;
  sessionId: string;
  requestId: string;
  timestamp: number;
  type: 'request' | 'response';
  data: {
    // Raw request data
    request?: {
      contents: any[];
      generationConfig?: any;
      safetySettings?: any;
      tools?: any[];
      systemInstruction?: any;
    };
    // Raw response data
    response?: {
      candidates?: any[];
      usageMetadata?: any;
      model?: string;
      finishReason?: string;
    };
    // Additional metadata
    model?: string;
    promptId?: string;
    error?: string;
    history?: any[];
  };
}
