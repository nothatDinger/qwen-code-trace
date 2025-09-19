/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { TraceManager } from '@qwen-code/qwen-code-core';

async function demonstrateTraceMonitoring() {
  console.log('🚀 Qwen Code Trace Monitoring Demo\n');

  // Create trace manager
  const traceManager = new TraceManager();

  // Simulate some LLM requests
  console.log('📝 Simulating LLM requests...');
  
  const llmRequest1 = traceManager.startRequest('llm', {
    prompt: 'What is the capital of France?',
    model: 'qwen-2.5-72b-instruct',
  }, {
    promptId: 'demo-session-1',
    requestId: 'llm-req-1',
  });

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));

  traceManager.completeRequest(llmRequest1, {
    response: 'The capital of France is Paris.',
    tokens: { prompt: 8, completion: 12, total: 20 },
  }, 'completed');

  const llmRequest2 = traceManager.startRequest('llm', {
    prompt: 'Explain quantum computing in simple terms.',
    model: 'qwen-2.5-72b-instruct',
  }, {
    promptId: 'demo-session-1',
    requestId: 'llm-req-2',
  });

  await new Promise(resolve => setTimeout(resolve, 200));

  traceManager.completeRequest(llmRequest2, {
    response: 'Quantum computing uses quantum mechanical phenomena to process information...',
    tokens: { prompt: 12, completion: 45, total: 57 },
  }, 'completed');

  // Simulate tool calls
  console.log('🔧 Simulating tool calls...');
  
  const toolRequest1 = traceManager.startRequest('tool_call', {
    toolName: 'read_file',
    toolArgs: { path: '/path/to/file.txt' },
  }, {
    promptId: 'demo-session-1',
    requestId: 'tool-req-1',
  });

  await new Promise(resolve => setTimeout(resolve, 50));

  traceManager.completeRequest(toolRequest1, {
    toolName: 'read_file',
    toolArgs: { path: '/path/to/file.txt' },
    toolResult: 'File content here...',
  }, 'completed');

  const toolRequest2 = traceManager.startRequest('tool_call', {
    toolName: 'run_shell_command',
    toolArgs: { command: 'ls -la' },
  }, {
    promptId: 'demo-session-1',
    requestId: 'tool-req-2',
  });

  await new Promise(resolve => setTimeout(resolve, 30));

  traceManager.completeRequest(toolRequest2, {
    toolName: 'run_shell_command',
    toolArgs: { command: 'ls -la' },
    toolResult: 'total 8\ndrwxr-xr-x 2 user user 4096 Jan 1 12:00 .\ndrwxr-xr-x 3 user user 4096 Jan 1 12:00 ..',
  }, 'completed');

  // Simulate embedding request
  console.log('🧮 Simulating embedding request...');
  
  const embedRequest = traceManager.startRequest('embedding', {
    input: 'This is a sample text for embedding.',
    embeddingModel: 'text-embedding-ada-002',
  }, {
    promptId: 'demo-session-1',
    requestId: 'embed-req-1',
  });

  await new Promise(resolve => setTimeout(resolve, 80));

  traceManager.completeRequest(embedRequest, {
    input: 'This is a sample text for embedding.',
    embedding: Array(1536).fill(0).map(() => Math.random()),
    embeddingModel: 'text-embedding-ada-002',
  }, 'completed');

  // Show statistics
  console.log('\n📊 Trace Statistics:');
  const stats = traceManager.getStats();
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Total Duration: ${formatDuration(stats.totalDuration)}`);
  console.log(`Average Duration: ${formatDuration(stats.averageDuration)}`);
  console.log(`Error Rate: ${(stats.errorRate * 100).toFixed(1)}%`);
  
  console.log('\n📈 Requests by Type:');
  Object.entries(stats.requestsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Generate Gantt chart
  console.log('\n📊 Generating Gantt chart...');
  try {
    const html = traceManager.generateGanttChart('html');
    console.log('✅ Gantt chart generated (HTML format)');
    console.log(`📄 Chart size: ${html.length} characters`);
  } catch (error) {
    console.error('❌ Failed to generate Gantt chart:', error);
  }

  // Export trace data
  console.log('\n💾 Exporting trace data...');
  try {
    const jsonData = traceManager.exportTrace({
      format: 'json',
      includeContent: true,
      includeMetadata: true,
    });
    console.log('✅ Trace data exported (JSON format)');
    console.log(`📄 Data size: ${jsonData.length} characters`);
  } catch (error) {
    console.error('❌ Failed to export trace data:', error);
  }

  // Show session information
  console.log('\n📋 Session Information:');
  const sessionId = traceManager.getSessionId();
  console.log(`Session ID: ${sessionId}`);

  console.log('\n✅ Demo completed successfully!');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateTraceMonitoring().catch(console.error);
}

export { demonstrateTraceMonitoring };
