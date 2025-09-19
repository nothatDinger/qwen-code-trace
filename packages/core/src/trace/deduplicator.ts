/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TraceRequest, GanttChartData } from './types.js';

export class TraceDeduplicator {
  /**
   * Deduplicate trace requests by removing overlapping content
   * This handles cases where subsequent requests contain all previous request data
   */
  deduplicateRequests(requests: TraceRequest[]): TraceRequest[] {
    if (requests.length <= 1) return requests;

    // Sort requests by start time
    const sortedRequests = [...requests].sort((a, b) => a.startTime - b.startTime);
    const deduplicated: TraceRequest[] = [];
    const contentHashes = new Set<string>();

    for (const request of sortedRequests) {
      const contentHash = this.generateContentHash(request);
      
      // Check if this content is a superset of any previous content
      const isDuplicate = this.isContentSuperset(request, deduplicated, contentHashes);
      
      if (!isDuplicate) {
        deduplicated.push(request);
        contentHashes.add(contentHash);
      }
    }

    return deduplicated;
  }

  /**
   * Generate a hash for request content to detect duplicates
   */
  private generateContentHash(request: TraceRequest): string {
    const contentStr = JSON.stringify({
      prompt: request.content.prompt,
      toolName: request.content.toolName,
      toolArgs: request.content.toolArgs,
      input: request.content.input,
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Check if a request's content is a superset of any previous request
   */
  private isContentSuperset(
    request: TraceRequest,
    previousRequests: TraceRequest[],
    contentHashes: Set<string>
  ): boolean {
    const currentContentHash = this.generateContentHash(request);
    
    // If we've seen this exact content before, it's a duplicate
    if (contentHashes.has(currentContentHash)) {
      return true;
    }

    // Check if this request contains all content from previous requests
    for (const prevRequest of previousRequests) {
      if (this.isContentSupersetOf(request, prevRequest)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if request A's content is a superset of request B's content
   */
  private isContentSupersetOf(requestA: TraceRequest, requestB: TraceRequest): boolean {
    // For LLM requests, check if prompt contains previous prompt
    if (requestA.type === 'llm' && requestB.type === 'llm') {
      const promptA = requestA.content.prompt || '';
      const promptB = requestB.content.prompt || '';
      
      if (promptA.length > promptB.length && promptA.includes(promptB)) {
        return true;
      }
    }

    // For tool calls, check if args are supersets
    if (requestA.type === 'tool_call' && requestB.type === 'tool_call') {
      if (requestA.content.toolName === requestB.content.toolName) {
        const argsA = requestA.content.toolArgs || {};
        const argsB = requestB.content.toolArgs || {};
        
        // Check if argsA contains all keys from argsB with same values
        const isSuperset = Object.keys(argsB).every(key => 
          argsA[key] === argsB[key]
        );
        
        if (isSuperset && Object.keys(argsA).length > Object.keys(argsB).length) {
          return true;
        }
      }
    }

    // For embedding requests, check if input is a superset
    if (requestA.type === 'embedding' && requestB.type === 'embedding') {
      const inputA = requestA.content.input || '';
      const inputB = requestB.content.input || '';
      
      if (inputA.length > inputB.length && inputA.includes(inputB)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Prepare data for Gantt chart visualization
   */
  prepareGanttData(requests: TraceRequest[]): GanttChartData {
    const deduplicatedRequests = this.deduplicateRequests(requests);
    
    if (deduplicatedRequests.length === 0) {
      return {
        requests: [],
        timeline: {
          start: 0,
          end: 0,
          totalDuration: 0,
        },
      };
    }

    const startTime = Math.min(...deduplicatedRequests.map(r => r.startTime));
    const endTime = Math.max(...deduplicatedRequests.map(r => r.endTime || r.startTime));
    const totalDuration = endTime - startTime;

    const ganttRequests = deduplicatedRequests.map((request, index) => {
      const relativeStart = request.startTime - startTime;
      const relativeEnd = (request.endTime || request.startTime) - startTime;
      const duration = relativeEnd - relativeStart;

      return {
        id: request.id,
        name: this.generateRequestName(request),
        start: relativeStart,
        end: relativeEnd,
        duration,
        type: request.type,
        status: request.status,
        color: this.getRequestColor(request.type, request.status),
        originalRequest: request, // 包含原始请求数据用于详细信息
      };
    });

    return {
      requests: ganttRequests,
      timeline: {
        start: startTime,
        end: endTime,
        totalDuration,
      },
    };
  }

  /**
   * Generate a human-readable name for a request
   */
  private generateRequestName(request: TraceRequest): string {
    switch (request.type) {
      case 'llm':
        const prompt = request.content.prompt || '';
        const model = request.content.model || 'unknown';
        const truncatedPrompt = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
        return `LLM (${model}): ${truncatedPrompt}`;
      
      case 'tool_call':
        const toolName = request.content.toolName || 'unknown';
        const args = request.content.toolArgs || {};
        const argKeys = Object.keys(args);
        const argSummary = argKeys.length > 0 ? `(${argKeys.join(', ')})` : '';
        return `Tool: ${toolName}${argSummary}`;
      
      case 'embedding':
        const input = request.content.input || '';
        const embeddingModel = request.content.embeddingModel || 'unknown';
        const truncatedInput = input.length > 30 ? input.substring(0, 30) + '...' : input;
        return `Embedding (${embeddingModel}): ${truncatedInput}`;
      
      default:
        return `Unknown: ${request.id}`;
    }
  }

  /**
   * Get color for request type and status
   */
  private getRequestColor(type: string, status: string): string {
    const colorMap: Record<string, Record<string, string>> = {
      llm: {
        completed: '#4CAF50',
        failed: '#F44336',
        running: '#2196F3',
        pending: '#FF9800',
      },
      tool_call: {
        completed: '#8BC34A',
        failed: '#E91E63',
        running: '#00BCD4',
        pending: '#FFC107',
      },
      embedding: {
        completed: '#9C27B0',
        failed: '#795548',
        running: '#607D8B',
        pending: '#FF5722',
      },
    };

    return colorMap[type]?.[status] || '#9E9E9E';
  }

  /**
   * Merge overlapping requests that represent the same logical operation
   */
  mergeOverlappingRequests(requests: TraceRequest[]): TraceRequest[] {
    const sortedRequests = [...requests].sort((a, b) => a.startTime - b.startTime);
    const merged: TraceRequest[] = [];

    for (const request of sortedRequests) {
      const lastMerged = merged[merged.length - 1];
      
      if (lastMerged && this.shouldMerge(lastMerged, request)) {
        // Merge with the last request
        lastMerged.endTime = Math.max(lastMerged.endTime || lastMerged.startTime, request.endTime || request.startTime);
        lastMerged.duration = lastMerged.endTime - lastMerged.startTime;
        
        // Combine content
        lastMerged.content = this.mergeContent(lastMerged.content, request.content);
      } else {
        merged.push({ ...request });
      }
    }

    return merged;
  }

  /**
   * Check if two requests should be merged
   */
  private shouldMerge(requestA: TraceRequest, requestB: TraceRequest): boolean {
    // Only merge requests of the same type
    if (requestA.type !== requestB.type) return false;

    // Check if requests overlap in time
    const endA = requestA.endTime || requestA.startTime;
    const startB = requestB.startTime;
    
    if (endA < startB) return false;

    // Check if they represent the same logical operation
    if (requestA.type === 'tool_call') {
      return requestA.content.toolName === requestB.content.toolName;
    }

    if (requestA.type === 'llm') {
      return requestA.content.model === requestB.content.model;
    }

    if (requestA.type === 'embedding') {
      return requestA.content.embeddingModel === requestB.content.embeddingModel;
    }

    return false;
  }

  /**
   * Merge content from two requests
   */
  private mergeContent(contentA: any, contentB: any): any {
    const merged = { ...contentA };

    // For LLM requests, combine prompts
    if (contentA.prompt && contentB.prompt) {
      merged.prompt = contentA.prompt + '\n' + contentB.prompt;
    }

    // For tool calls, merge args
    if (contentA.toolArgs && contentB.toolArgs) {
      merged.toolArgs = { ...contentA.toolArgs, ...contentB.toolArgs };
    }

    // For embeddings, combine inputs
    if (contentA.input && contentB.input) {
      merged.input = contentA.input + ' ' + contentB.input;
    }

    return merged;
  }
}
