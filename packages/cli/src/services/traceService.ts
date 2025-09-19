/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { TraceManager } from '@qwen-code/qwen-code-core';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

let traceManagerInstance: TraceManager | null = null;
let currentSessionId: string | null = null;

export function getTraceManager(): TraceManager {
  if (!traceManagerInstance) {
    currentSessionId = uuidv4();
    const dataDir = join(process.cwd(), '.trace');
    traceManagerInstance = new TraceManager(dataDir, currentSessionId);
  }
  return traceManagerInstance;
}

export function getCurrentTraceSessionId(): string | null {
  return currentSessionId;
}


