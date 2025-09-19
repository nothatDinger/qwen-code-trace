/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TraceCollector } from './collector.js';
import { TracePersistence } from './persistence.js';
import { TraceVisualization } from './visualization.js';
import type { TraceRequest, TraceFilter, TraceStats, TraceExportOptions, RawLLMData } from './types.js';

export class TraceManager {
  private collector: TraceCollector;
  private persistence: TracePersistence;
  private visualization: TraceVisualization;
  private isEnabled: boolean = true;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private currentSessionId: string;

  constructor(dataDir?: string, sessionId?: string) {
    // Generate unique session ID
    this.currentSessionId = sessionId || uuidv4();
    
    // Use project root directory for data storage
    const projectRoot = process.cwd();
    const traceDataDir = dataDir || join(projectRoot, '.trace');
    
    this.collector = new TraceCollector(this.currentSessionId);
    this.persistence = new TracePersistence(traceDataDir);
    this.visualization = new TraceVisualization();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Auto-save disabled to prevent duplicate persistence; we persist on completion event
  }

  /**
   * Set up event listeners for automatic persistence
   */
  private setupEventListeners(): void {
    this.collector.on('requestCompleted', (request: TraceRequest) => {
      if (this.isEnabled) {
        this.persistence.saveRequest(request);
      }
    });

    this.collector.on('cleared', () => {
      // Optionally clear persistence data
    });
  }

  /**
   * Start automatic saving of completed requests
   */
  // Auto-save intentionally removed to avoid duplicate persistence

  /**
   * Stop automatic saving
   */
  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Start tracking a new request
   */
  startRequest(
    type: 'llm' | 'tool_call' | 'embedding',
    content: any,
    metadata: any = {}
  ): string {
    if (!this.isEnabled) return '';
    return this.collector.startRequest(type, content, metadata);
  }

  /**
   * Update request content during execution
   */
  updateRequest(requestId: string, content: any): void {
    if (!this.isEnabled) return;
    this.collector.updateRequest(requestId, content);
  }

  /**
   * Complete a request
   */
  completeRequest(
    requestId: string,
    content: any,
    status: 'completed' | 'failed' = 'completed'
  ): void {
    if (!this.isEnabled) return;
    this.collector.completeRequest(requestId, content, status);
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  /**
   * Get all requests with session filtering (current session only by default)
   */
  getRequests(filter?: TraceFilter): TraceRequest[] {
    // Automatically add current session ID to filter
    const sessionFilter: TraceFilter = {
      ...filter,
      sessionId: this.currentSessionId
    };
    
    // Combine in-memory requests with persisted requests
    const memoryRequests = this.collector.getAllRequests();
    const persistedRequests = this.persistence.getRequests(sessionFilter);
    
    // Merge and deduplicate
    const allRequests = [...memoryRequests, ...persistedRequests];
    const uniqueRequests = this.deduplicateRequests(allRequests);
    
    return uniqueRequests;
  }

  /**
   * Get all requests (without session filter) - for admin purposes
   */
  getAllRequests(filter?: TraceFilter): TraceRequest[] {
    // Combine in-memory requests with persisted requests
    const memoryRequests = this.collector.getAllRequests();
    const persistedRequests = this.persistence.getRequests(filter);
    
    // Merge and deduplicate
    const allRequests = [...memoryRequests, ...persistedRequests];
    const uniqueRequests = this.deduplicateRequests(allRequests);
    
    return uniqueRequests;
  }

  /**
   * Get trace statistics for current session
   */
  getStats(filter?: TraceFilter): TraceStats {
    const requests = this.getRequests(filter);
    
    if (requests.length === 0) {
      return {
        totalRequests: 0,
        totalDuration: 0,
        averageDuration: 0,
        requestsByType: {},
        requestsByStatus: {},
        errorRate: 0,
      };
    }

    const totalRequests = requests.length;
    const totalDuration = requests.reduce((sum, req) => sum + (req.duration || 0), 0);
    const averageDuration = totalDuration / totalRequests;

    const requestsByType = requests.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestsByStatus = requests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const failedRequests = requests.filter(req => req.status === 'failed').length;
    const errorRate = failedRequests / totalRequests;

    return {
      totalRequests,
      totalDuration,
      averageDuration,
      requestsByType,
      requestsByStatus,
      errorRate,
    };
  }

  /**
   * Generate Gantt chart for current session
   */
  generateGanttChart(
    format: 'html' | 'svg' | 'png' = 'html',
    outputPath?: string
  ): string | Buffer {
    const requests = this.getRequests();
    
    switch (format) {
      case 'html':
        return this.visualization.generateGanttChart(requests, outputPath);
      case 'svg':
        return this.visualization.generateGanttChartSVG(requests, outputPath);
      case 'png':
        // PNG generation is async, so we need to handle it differently
        throw new Error('PNG generation is async. Use generateGanttChartAsync instead.');
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate Gantt chart asynchronously (for PNG format)
   */
  async generateGanttChartAsync(
    format: 'png',
    outputPath?: string
  ): Promise<Buffer> {
    const requests = this.getRequests();
    return this.visualization.generateGanttChartPNG(requests, outputPath);
  }

  /**
   * Export trace data for current session
   */
  exportTrace(options: TraceExportOptions): string {
    const requests = this.getRequests(options.filter);
    
    switch (options.format) {
      case 'json':
        return JSON.stringify(requests, null, 2);
      case 'csv':
        return this.exportToCSV(requests, options);
      case 'gantt':
        return this.visualization.generateGanttChart(requests);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(requests: TraceRequest[], options: TraceExportOptions): string {
    const headers = [
      'id',
      'type',
      'startTime',
      'endTime',
      'duration',
      'status',
      'sessionId',
      'promptId',
      'requestId',
    ];

    if (options.includeContent) {
      headers.push('content');
    }

    if (options.includeMetadata) {
      headers.push('metadata');
    }

    const csvRows = [headers.join(',')];

    for (const request of requests) {
      const row = [
        request.id,
        request.type,
        request.startTime,
        request.endTime || '',
        request.duration || '',
        request.status,
        request.metadata.sessionId,
        request.metadata.promptId,
        request.metadata.requestId,
      ];

      if (options.includeContent) {
        row.push(JSON.stringify(request.content).replace(/"/g, '""'));
      }

      if (options.includeMetadata) {
        row.push(JSON.stringify(request.metadata).replace(/"/g, '""'));
      }

      csvRows.push(row.map(field => `"${field}"`).join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Deduplicate requests
   */
  private deduplicateRequests(requests: TraceRequest[]): TraceRequest[] {
    const seen = new Set<string>();
    return requests.filter(request => {
      if (seen.has(request.id)) {
        return false;
      }
      seen.add(request.id);
      return true;
    });
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.collector.getSessionId();
  }

  /**
   * Enable/disable tracing
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.collector.setEnabled(enabled);
    
    // Auto-save disabled; no timer management needed
  }

  /**
   * Check if tracing is enabled
   */
  isTracingEnabled(): boolean {
    return this.isEnabled && this.collector.isTracingEnabled();
  }

  /**
   * Clear trace data for current session only
   */
  clear(): void {
    this.collector.clear();
    // Only clear current session's data
    this.persistence.deleteRequestsBySession(this.currentSessionId);
  }

  /**
   * Clear persisted trace data
   */
  clearPersistedData(): void {
    // This would require adding a clear method to TracePersistence
    // For now, we'll just clear the in-memory data
    this.collector.clear();
  }

  /**
   * Get all unique session IDs
   */
  getSessionIds(): string[] {
    return this.persistence.getSessionIds();
  }

  /**
   * Get all session IDs (alias for compatibility)
   */
  getAllSessionIds(): string[] {
    return this.persistence.getSessionIds();
  }

  /**
   * Delete requests by session ID
   */
  deleteSessionData(sessionId: string): number {
    return this.persistence.deleteRequestsBySession(sessionId);
  }

  /**
   * Delete old trace data
   */
  deleteOldData(olderThanDays: number = 30): number {
    return this.persistence.deleteOldData(olderThanDays);
  }

  /**
   * Save raw LLM data
   */
  saveRawLLMData(rawData: RawLLMData): void {
    this.persistence.saveRawLLMData(rawData);
  }

  /**
   * Get raw LLM data for current session
   */
  getRawLLMData(): RawLLMData[] {
    return this.persistence.getRawLLMData(this.currentSessionId);
  }

  /**
   * Close the trace manager and cleanup resources
   */
  close(): void {
    this.stopAutoSave();
    
    // Save any remaining requests
    const completedRequests = this.collector.getCompletedRequests();
    if (completedRequests.length > 0) {
      this.persistence.saveRequests(completedRequests);
    }
    
    this.persistence.close();
  }
}
