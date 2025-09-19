/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

// import { writeFileSync } from 'node:fs';
// import { join } from 'node:path';
import type { SlashCommand, CommandContext } from './types.js';
import { CommandKind } from './types.js';
import { TraceCommands } from '../../commands/traceCommands.js';

// Create a singleton instance of trace commands
let traceCommandsInstance: TraceCommands | null = null;

function getTraceCommands(config: any): TraceCommands {
  if (!traceCommandsInstance) {
    traceCommandsInstance = new TraceCommands(config);
  }
  return traceCommandsInstance;
}

export const traceCommands: SlashCommand[] = [
  {
    name: 'trace',
    description: 'Trace monitoring and visualization commands',
    kind: CommandKind.BUILT_IN,
    subCommands: [
      {
        name: 'stats',
        description: 'Show trace statistics',
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          traceCommands.showStats();
          return { type: 'message', messageType: 'info', content: '' };
        },
      },
      {
        name: 'list',
        description: 'List recent trace requests',
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          const args = context.invocation?.args || '';
          const limit = parseInt(args) || 10;
          traceCommands.listRequests(limit);
          return { type: 'message', messageType: 'info', content: '' };
        },
      },
      {
        name: 'gantt',
        description: 'Generate Gantt chart visualization',
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          const args = context.invocation?.args || '';
          const [format = 'html', outputPath] = args.split(' ');
          
          if (!['html', 'svg', 'png'].includes(format)) {
            return {
              type: 'message',
              messageType: 'error',
              content: 'Invalid format. Use: html, svg, or png',
            };
          }

          try {
            traceCommands.generateGanttChart(format as 'html' | 'svg' | 'png', outputPath);
            return {
              type: 'message',
              messageType: 'info',
              content: `Gantt chart generated in ${format} format`,
            };
          } catch (error) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Failed to generate Gantt chart: ${error}`,
            };
          }
        },
      },
      {
        name: 'export',
        description: 'Export trace data',
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          const args = context.invocation?.args || '';
          const [format = 'json', outputPath] = args.split(' ');
          
          if (!['json', 'csv'].includes(format)) {
            return {
              type: 'message',
              messageType: 'error',
              content: 'Invalid format. Use: json or csv',
            };
          }

          try {
            traceCommands.exportTrace(format as 'json' | 'csv', outputPath);
            return {
              type: 'message',
              messageType: 'info',
              content: `Trace data exported in ${format} format`,
            };
          } catch (error) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Failed to export trace data: ${error}`,
            };
          }
        },
      },
      {
        name: 'clear',
        description: 'Clear trace data',
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          const args = context.invocation?.args || '';
          const confirm = args.includes('--confirm');
          
          if (!confirm) {
            return {
              type: 'message',
              messageType: 'info',
              content: 'Use /trace clear --confirm to clear all trace data',
            };
          }

          traceCommands.clearTrace(true);
          return {
            type: 'message',
            messageType: 'info',
            content: 'Trace data cleared',
          };
        },
      },
      {
        name: 'sessions',
        description: 'Show available trace sessions',
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          traceCommands.showSessions();
          return { type: 'message', messageType: 'info', content: '' };
        },
      },
      {
        name: 'enable',
        description: 'Enable trace monitoring',
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          traceCommands.setTracingEnabled(true);
          return {
            type: 'message',
            messageType: 'info',
            content: 'Trace monitoring enabled',
          };
        },
      },
      {
        name: 'disable',
        description: 'Disable trace monitoring',
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          traceCommands.setTracingEnabled(false);
          return {
            type: 'message',
            messageType: 'info',
            content: 'Trace monitoring disabled',
          };
        },
      },
      {
        name: 'cleanup',
        description: 'Delete old trace data',
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          const args = context.invocation?.args || '';
          const days = parseInt(args) || 30;
          
          traceCommands.deleteOldData(days);
          return {
            type: 'message',
            messageType: 'info',
            content: `Deleted trace data older than ${days} days`,
          };
        },
      },
      {
        name: "session",
        description: "Show current session information",
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          traceCommands.showSessionInfo();
          return { type: "message", messageType: "info", content: "" };
        },
      },
      {
        name: "sessions",
        description: "List all available sessions",
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          traceCommands.showAllSessions();
          return { type: "message", messageType: "info", content: "" };
        },
      },
      {
        name: "delete",
        description: "Delete session data by ID prefix",
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          const args = context.invocation?.args || "";
          const [sessionPrefix, confirmArg] = args.split(" ");
          
          if (!sessionPrefix) {
            return {
              type: "message",
              messageType: "error",
              content: "Please provide a session ID prefix",
            };
          }
          
          const confirm = confirmArg === "--confirm";
          traceCommands.deleteSessionData(sessionPrefix, confirm);
          return { type: "message", messageType: "info", content: "" };
        },
      },
      {
        name: "raw",
        description: "Show raw LLM request/response data",
        kind: CommandKind.BUILT_IN,
        action: (context: CommandContext) => {
          const traceCommands = getTraceCommands(context.services.config);
          const args = context.invocation?.args || "";
          const limit = parseInt(args) || 10;
          traceCommands.showRawData(limit);
          return { type: "message", messageType: "info", content: "" };
        },
      }
    ],
  },
];
