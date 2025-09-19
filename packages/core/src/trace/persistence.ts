/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { join, basename } from 'node:path';
import { mkdirSync, existsSync, appendFileSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import type { TraceRequest, TraceFilter, TraceStats, RawLLMData } from './types.js';

export class TracePersistence {
  private dataDir: string;

  constructor(dataDir?: string) {
    const traceDir = dataDir || join(process.cwd(), '.trace');
    if (!existsSync(traceDir)) {
      mkdirSync(traceDir, { recursive: true });
    }
    this.dataDir = traceDir;
  }

  private getSessionFile(sessionId: string): string {
    return join(this.dataDir, `${sessionId}.jsonl`);
  }

  private getRawDataFile(sessionId: string): string {
    return join(this.dataDir, `${sessionId}.raw.json`);
  }

  private readSessionFile(sessionId: string): TraceRequest[] {
    const file = this.getSessionFile(sessionId);
    if (!existsSync(file)) return [];
    const content = readFileSync(file, 'utf-8');
    if (!content) return [];
    const lines = content.split(/\r?\n/).filter(Boolean);
    const requests: TraceRequest[] = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as TraceRequest;
        requests.push(obj);
      } catch {
        // ignore bad line
      }
    }
    return requests;
  }

  private writeSessionFile(sessionId: string, requests: TraceRequest[]): void {
    const file = this.getSessionFile(sessionId);
    const data = requests.map(r => JSON.stringify(r)).join('\n') + (requests.length ? '\n' : '');
    writeFileSync(file, data, 'utf-8');
  }

  /**
   * Save a trace request to the database
   */
  saveRequest(request: TraceRequest): void {
    const sid = request.metadata.sessionId;
    const existing = this.readSessionFile(sid);
    if (existing.find(r => r.id === request.id)) return; // avoid duplicate
    const file = this.getSessionFile(sid);
    appendFileSync(file, JSON.stringify(request) + '\n', 'utf-8');
  }

  /**
   * Save multiple requests in a batch
   */
  saveRequests(requests: TraceRequest[]): void {
    const bySession = new Map<string, TraceRequest[]>();
    for (const r of requests) {
      const sid = r.metadata.sessionId;
      if (!bySession.has(sid)) bySession.set(sid, []);
      bySession.get(sid)!.push(r);
    }
    for (const [sid, list] of bySession) {
      const existing = this.readSessionFile(sid);
      const existingIds = new Set(existing.map(r => r.id));
      const toWrite = list.filter(r => !existingIds.has(r.id));
      if (toWrite.length === 0) continue;
      const file = this.getSessionFile(sid);
      const data = toWrite.map(r => JSON.stringify(r)).join('\n') + '\n';
      appendFileSync(file, data, 'utf-8');
    }
  }

  /**
   * Get requests with optional filtering
   */
  getRequests(filter?: TraceFilter): TraceRequest[] {
    const sessions = filter?.sessionId ? [filter.sessionId] : this.getSessionIds();
    let all: TraceRequest[] = [];
    for (const sid of sessions) {
      all = all.concat(this.readSessionFile(sid));
    }
    let result = all
      .filter(r => (filter?.type ? r.type === filter.type : true))
      .filter(r => (filter?.status ? r.status === filter.status : true))
      .filter(r => (filter?.startTime ? r.startTime >= filter.startTime : true))
      .filter(r => (filter?.endTime ? r.startTime <= (filter.endTime as number) : true));
    result.sort((a, b) => a.startTime - b.startTime);
    if (filter?.offset) result = result.slice(filter.offset);
    if (filter?.limit) result = result.slice(0, filter.limit);
    return result;
  }

  /**
   * Get a specific request by ID
   */
  getRequest(id: string): TraceRequest | null {
    const sessions = this.getSessionIds();
    for (const sid of sessions) {
      const list = this.readSessionFile(sid);
      const found = list.find(r => r.id === id);
      if (found) return found;
    }
    return null;
  }

  /**
   * Get trace statistics
   */
  getStats(filter?: TraceFilter): TraceStats {
    const reqs = this.getRequests(filter);
    const totalRequests = reqs.length;
    const totalDuration = reqs.reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageDuration = totalRequests > 0 ? totalDuration / totalRequests : 0;

    const requestsByType = reqs.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestsByStatus = reqs.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const failedRequests = reqs.filter(r => r.status === 'failed').length;
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

  /**
   * Get all unique session IDs
   */
  getSessionIds(): string[] {
    const files = readdirSync(this.dataDir).filter(f => f.endsWith('.jsonl'));
    return files.map(f => basename(f, '.jsonl'));
  }

  /**
   * Delete old trace data
   */
  deleteOldData(olderThanDays: number = 30): number {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let deleted = 0;
    for (const sid of this.getSessionIds()) {
      const reqs = this.readSessionFile(sid);
      const kept = reqs.filter(r => (r.startTime ?? 0) >= cutoffTime);
      deleted += reqs.length - kept.length;
      this.writeSessionFile(sid, kept);
    }
    return deleted;
  }

  /**
   * Export trace data to JSON
   */
  exportToJson(filter?: TraceFilter): string {
    const requests = this.getRequests(filter);
    return JSON.stringify(requests, null, 2);
  }

  /**
   * Save raw LLM request/response data
   */
  saveRawLLMData(rawData: RawLLMData): void {
    // Filter out terminal STOP-only responses
    if (
      rawData.type === 'response' &&
      rawData.data &&
      (rawData.data as any).response &&
      (rawData.data as any).response.type === 'finished' &&
      (rawData.data as any).response.value === 'STOP'
    ) {
      return;
    }
    const file = this.getRawDataFile(rawData.sessionId);
    // Keep only the last request's raw data: overwrite file with a single line
    writeFileSync(file, JSON.stringify(rawData) + '\n', 'utf-8');
  }

  /**
   * Get raw LLM data for a session
   */
  getRawLLMData(sessionId: string): RawLLMData[] {
    const file = this.getRawDataFile(sessionId);
    if (!existsSync(file)) return [];
    const content = readFileSync(file, 'utf-8');
    if (!content) return [];
    const lines = content.split(/\r?\n/).filter(Boolean);
    const rawData: RawLLMData[] = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as RawLLMData;
        rawData.push(obj);
      } catch {
        // ignore bad line
      }
    }
    return rawData;
  }

  /**
   * Delete raw LLM data for a session
   */
  deleteRawLLMData(sessionId: string): number {
    const file = this.getRawDataFile(sessionId);
    if (!existsSync(file)) return 0;
    const count = this.getRawLLMData(sessionId).length;
    rmSync(file, { force: true });
    return count;
  }

  /**
   * Close the database connection
   */
  close(): void {}

  /**
   * Delete requests by session ID
   */
  deleteRequestsBySession(sessionId: string): number {
    const file = this.getSessionFile(sessionId);
    if (!existsSync(file)) return 0;
    const count = this.readSessionFile(sessionId).length;
    rmSync(file, { force: true });
    // Also delete raw data
    this.deleteRawLLMData(sessionId);
    return count;
  }

  /**
   * Get requests for specific session only
   */
  getRequestsBySession(sessionId: string, filter?: TraceFilter): TraceRequest[] {
    const sessionFilter: TraceFilter = { ...filter, sessionId };
    return this.getRequests(sessionFilter);
  }

  /**
   * Clear all trace data
   */
  clearAllData(): number {
    let deleted = 0;
    for (const sid of this.getSessionIds()) {
      deleted += this.deleteRequestsBySession(sid);
    }
    return deleted;
  }
}
