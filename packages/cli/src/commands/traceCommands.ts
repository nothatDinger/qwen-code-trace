/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { TraceManager } from '@qwen-code/qwen-code-core';
import { getTraceManager, getCurrentTraceSessionId } from '../services/traceService.js';
import type { Config } from '@qwen-code/qwen-code-core';

export class TraceCommands {
  private traceManager: TraceManager;
  private sessionId: string;

  constructor(config: Config) {
    this.traceManager = getTraceManager();
    this.sessionId = getCurrentTraceSessionId() || uuidv4();
  }

  /**
   * Show trace statistics
   */
  showStats(filter?: any) {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    const stats = this.traceManager.getStats(filter);
    
    console.log('\n📊 Trace Statistics (Current Session)');
    console.log('=====================================');
    console.log(`Session ID: ${this.sessionId.substring(0, 8)}...`);
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Total Duration: ${this.formatDuration(stats.totalDuration)}`);
    console.log(`Average Duration: ${this.formatDuration(stats.averageDuration)}`);
    console.log(`Error Rate: ${(stats.errorRate * 100).toFixed(1)}%`);
    
    console.log('\n📈 Requests by Type:');
    Object.entries(stats.requestsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\n📋 Requests by Status:');
    Object.entries(stats.requestsByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  }

  /**
   * List recent requests
   */
  listRequests(limit: number = 10, filter?: any) {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    const requests = this.traceManager.getRequests({
      ...filter,
      limit,
    });

    console.log(`\n📝 Recent Requests (${requests.length})`);
    console.log('=====================================');
    
    requests.forEach((request: any, index: number) => {
      const duration = request.duration ? this.formatDuration(request.duration) : 'N/A';
      const startTime = new Date(request.startTime).toLocaleString();
      
      console.log(`\n${index + 1}. ${request.type.toUpperCase()} - ${request.status}`);
      console.log(`   ID: ${request.id}`);
      console.log(`   Time: ${startTime}`);
      console.log(`   Duration: ${duration}`);
      
      if (request.content.prompt) {
        const prompt = request.content.prompt.length > 100 
          ? request.content.prompt.substring(0, 100) + '...'
          : request.content.prompt;
        console.log(`   Prompt: ${prompt}`);
      }
      
      if (request.content.toolName) {
        console.log(`   Tool: ${request.content.toolName}`);
      }
      
      if (request.content.model) {
        console.log(`   Model: ${request.content.model}`);
      }
    });
  }

  /**
   * Generate and save Gantt chart
   */
  generateGanttChart(format: 'html' | 'svg' | 'png' = 'html', outputPath?: string) {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    const requests = this.traceManager.getRequests();
    
    if (requests.length === 0) {
      console.log('❌ No trace data available for current session');
      return;
    }

    const defaultPath = join(process.cwd(), `trace-gantt-${this.sessionId.substring(0, 8)}.${format}`);
    const finalPath = outputPath || defaultPath;

    try {
      switch (format) {
        case 'html':
          this.traceManager.generateGanttChart('html', finalPath);
          break;
        case 'svg':
          this.traceManager.generateGanttChart('svg', finalPath);
          break;
        case 'png':
          // PNG generation is async, so we'll handle it differently
          console.log('PNG generation is not yet implemented in CLI');
          return;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      console.log(`✅ Gantt chart generated: ${finalPath}`);
      console.log(`📊 Chart shows ${requests.length} requests from current session`);
      console.log(`🆔 Session ID: ${this.sessionId.substring(0, 8)}...`);
      
    } catch (error) {
      console.error(`❌ Failed to generate Gantt chart: ${error}`);
    }
  }

  /**
   * Export trace data
   */
  exportTrace(format: 'json' | 'csv' = 'json', outputPath?: string, options?: any) {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    const requests = this.traceManager.getRequests();
    
    if (requests.length === 0) {
      console.log('❌ No trace data available to export');
      return;
    }

    const defaultPath = join(process.cwd(), `trace-export.${format}`);
    const finalPath = outputPath || defaultPath;

    try {
      const exportData = this.traceManager.exportTrace({
        format,
        includeContent: options?.includeContent !== false,
        includeMetadata: options?.includeMetadata !== false,
        filter: options?.filter,
      });

      writeFileSync(finalPath, exportData);
      console.log(`✅ Trace data exported: ${finalPath}`);
      console.log(`📊 Exported ${requests.length} requests`);
      
    } catch (error) {
      console.error(`❌ Failed to export trace data: ${error}`);
    }
  }

  /**
   * Clear trace data
   */
  clearTrace(confirm: boolean = false) {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    if (!confirm) {
      console.log('⚠️  This will clear all trace data for current session. Use --confirm to proceed.');
      return;
    }

    this.traceManager.clear();
    console.log(`✅ Trace data cleared for session: ${this.sessionId.substring(0, 8)}...`);
  }

  /**
   * Delete old trace data
   */
  deleteOldData(days: number = 30) {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    const deletedCount = this.traceManager.deleteOldData(days);
    console.log(`✅ Deleted ${deletedCount} old trace records (older than ${days} days)`);
  }

  /**
   * Show session information
   */
  showSessions() {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    const sessionIds = this.traceManager.getSessionIds();
    
    console.log('\n📋 Available Sessions');
    console.log('====================');
    
    if (sessionIds.length === 0) {
      console.log('No sessions found');
      return;
    }

    sessionIds.forEach((sessionId: any, index: number) => {
      const sessionStats = this.traceManager.getStats({ sessionId });
      console.log(`\n${index + 1}. Session: ${sessionId}`);
      console.log(`   Requests: ${sessionStats.totalRequests}`);
      console.log(`   Duration: ${this.formatDuration(sessionStats.totalDuration)}`);
      console.log(`   Error Rate: ${(sessionStats.errorRate * 100).toFixed(1)}%`);
    });
  }

  /**
   * Enable/disable tracing
   */
  setTracingEnabled(enabled: boolean) {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    this.traceManager.setEnabled(enabled);
    const status = enabled ? 'enabled' : 'disabled';
    console.log(`✅ Tracing ${status}`);
  }

  /**
   * Get trace manager for external access
   */
  getTraceManager(): any {
    return this.traceManager;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string {
    return this.sessionId;
  }

  /**
   * Show raw LLM data for current session
   */
  showRawData(limit: number = 10) {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    const rawData = this.traceManager.getRawLLMData();
    
    if (rawData.length === 0) {
      console.log('❌ No raw LLM data available for current session');
      return;
    }

    console.log(`\n📋 Raw LLM Data (${rawData.length} entries)`);
    console.log('=====================================');
    
    const limitedData = rawData.slice(-limit);
    limitedData.forEach((entry: any, index: number) => {
      const timestamp = new Date(entry.timestamp).toLocaleString();
      console.log(`\n${index + 1}. ${entry.type.toUpperCase()} - ${entry.requestId}`);
      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Model: ${entry.data.model || 'unknown'}`);
      
      if (entry.type === 'request' && entry.data.request) {
        console.log(`   Contents: ${JSON.stringify(entry.data.request.contents).substring(0, 100)}...`);
      } else if (entry.type === 'response' && entry.data.response) {
        console.log(`   Response: ${JSON.stringify(entry.data.response).substring(0, 100)}...`);
      } else if (entry.data.error) {
        console.log(`   Error: ${entry.data.error}`);
      }
    });
  }

  /**
   * Show current session information
   */
  showSessionInfo() {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    
    const stats = this.traceManager.getStats();
    
    console.log('\n🆔 Current Session Information');
    console.log('==============================');
    console.log(`Session ID: ${this.sessionId}`);
    console.log(`Short ID: ${this.sessionId.substring(0, 8)}...`);
    console.log(`Requests in this session: ${stats.totalRequests}`);
    console.log(`Total duration: ${this.formatDuration(stats.totalDuration)}`);
    console.log(`Data location: ${process.cwd()}/.trace/`);
  }

  /**
   * Show all available sessions
   */
  showAllSessions() {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    
    const sessionIds = this.traceManager.getAllSessionIds();
    
    console.log('\n📋 Available Sessions');
    console.log('====================');
    
    if (sessionIds.length === 0) {
      console.log('No sessions found');
      return;
    }

    sessionIds.forEach((sessionId, index) => {
      const isCurrentSession = sessionId === this.sessionId;
      const marker = isCurrentSession ? ' (current)' : '';
      console.log(`${index + 1}. ${sessionId.substring(0, 8)}...${marker}`);
      
      if (isCurrentSession) {
        const stats = this.traceManager.getStats();
        console.log(`   Requests: ${stats.totalRequests}`);
        console.log(`   Duration: ${this.formatDuration(stats.totalDuration)}`);
      }
    });
  }

  /**
   * Delete session data (admin function)
   */
  deleteSessionData(sessionIdPrefix: string, confirm: boolean = false) {
    if (!this.traceManager) {
      console.log('❌ Trace manager not available');
      return;
    }
    
    if (!confirm) {
      console.log('⚠️  This will permanently delete session data. Use --confirm to proceed.');
      return;
    }
    
    const sessionIds = this.traceManager.getAllSessionIds();
    const matchingSessions = sessionIds.filter(id => id.startsWith(sessionIdPrefix));
    
    if (matchingSessions.length === 0) {
      console.log(`❌ No sessions found matching: ${sessionIdPrefix}`);
      return;
    }
    
    if (matchingSessions.length > 1) {
      console.log(`⚠️  Multiple sessions match "${sessionIdPrefix}". Please provide a more specific prefix.`);
      matchingSessions.forEach(id => console.log(`  - ${id.substring(0, 8)}...`));
      return;
    }
    
    const sessionToDelete = matchingSessions[0];
    const deletedCount = this.traceManager.deleteSessionData(sessionToDelete);
    
    console.log(`✅ Deleted ${deletedCount} requests from session: ${sessionToDelete.substring(0, 8)}...`);
  }

  /**
   * Format duration in milliseconds to human readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}
