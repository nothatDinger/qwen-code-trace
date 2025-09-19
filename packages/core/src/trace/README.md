# Qwen Code Trace Monitoring

This module provides comprehensive trace monitoring for Qwen Code, allowing you to track LLM requests, tool calls, and embedding requests with detailed timing and content information.

## Features

- **Request Tracking**: Monitor LLM requests, tool calls, and embedding requests
- **Data Persistence**: Store trace data in SQLite database
- **Data Deduplication**: Handle overlapping request data automatically
- **Visualization**: Generate Gantt charts in HTML, SVG, or PNG formats
- **CLI Commands**: Built-in commands for viewing and managing trace data
- **Export Options**: Export trace data in JSON or CSV formats

## Quick Start

### Basic Usage

```typescript
import { TraceManager } from '@qwen-code/qwen-code-core';

// Create a trace manager
const traceManager = new TraceManager();

// Start tracking a request
const requestId = traceManager.startRequest('llm', {
  prompt: 'Hello, world!',
  model: 'qwen-2.5-72b-instruct',
}, {
  promptId: 'session-123',
  requestId: 'req-456',
});

// Update request during execution
traceManager.updateRequest(requestId, {
  response: 'Hello! How can I help you today?',
});

// Complete the request
traceManager.completeRequest(requestId, {
  response: 'Hello! How can I help you today?',
  tokens: { prompt: 10, completion: 15, total: 25 },
}, 'completed');
```

### CLI Commands

The trace system provides several CLI commands:

```bash
# Show trace statistics
/trace stats

# List recent requests
/trace list 10

# Generate Gantt chart
/trace gantt html
/trace gantt svg trace-chart.svg
/trace gantt png trace-chart.png

# Export trace data
/trace export json
/trace export csv trace-data.csv

# Show available sessions
/trace sessions

# Enable/disable tracing
/trace enable
/trace disable

# Clear trace data
/trace clear --confirm

# Delete old data
/trace cleanup 30
```

## Architecture

### Core Components

1. **TraceManager**: Main coordinator that manages all trace operations
2. **TraceCollector**: Collects and manages trace data in memory
3. **TracePersistence**: Handles data persistence using SQLite
4. **TraceVisualization**: Generates Gantt charts and other visualizations
5. **TraceDeduplicator**: Removes duplicate and overlapping request data

### Data Flow

```
User Request → TraceManager → TraceCollector → TracePersistence
                    ↓
              TraceVisualization ← TraceDeduplicator
```

## Integration

### With Existing Client

```typescript
import { TracedGeminiClient } from '@qwen-code/qwen-code-core';

// Wrap your existing client
const tracedClient = new TracedGeminiClient(originalClient, config);

// Use as normal - tracing happens automatically
const stream = tracedClient.sendMessageStream(request, signal, promptId);

// Access trace manager
const traceManager = tracedClient.getTraceManager();
```

### With Tool Scheduler

```typescript
import { TracedCoreToolScheduler } from '@qwen-code/qwen-code-core';

// Wrap your tool scheduler
const tracedScheduler = new TracedCoreToolScheduler(originalScheduler, traceManager);

// Use as normal - tool calls are automatically traced
await tracedScheduler.schedule(toolRequests, signal);
```

## Data Structure

### TraceRequest

```typescript
interface TraceRequest {
  id: string;
  type: 'llm' | 'tool_call' | 'embedding';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  content: TraceContent;
  metadata: TraceMetadata;
}
```

### TraceContent

```typescript
interface TraceContent {
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
```

## Configuration

### Environment Variables

- `QWEN_TRACE_ENABLED`: Enable/disable tracing (default: true)
- `QWEN_TRACE_DATA_DIR`: Directory for trace data (default: .qwen/trace)
- `QWEN_TRACE_AUTO_SAVE_INTERVAL`: Auto-save interval in ms (default: 5000)

### Settings

```json
{
  "trace": {
    "enabled": true,
    "dataDir": ".qwen/trace",
    "autoSaveInterval": 5000,
    "retentionDays": 30
  }
}
```

## Visualization

### Gantt Chart

The Gantt chart shows request timelines with:
- Request duration and timing
- Request type and status
- Color coding for different types and statuses
- Interactive tooltips with detailed information

### Export Formats

- **JSON**: Complete trace data with all fields
- **CSV**: Tabular format for analysis
- **HTML**: Interactive Gantt chart
- **SVG**: Vector Gantt chart
- **PNG**: Raster Gantt chart (requires canvas library)

## Performance Considerations

- Trace data is collected in memory and periodically saved to disk
- SQLite database provides efficient querying and storage
- Data deduplication reduces storage requirements
- Auto-cleanup removes old data to prevent database bloat

## Troubleshooting

### Common Issues

1. **Canvas library not found**: Install with `npm install canvas`
2. **SQLite database locked**: Ensure only one instance is writing
3. **Memory usage**: Use data cleanup commands regularly
4. **Missing trace data**: Check if tracing is enabled

### Debug Mode

Enable debug logging to see trace operations:

```bash
qwen --debug
```

## Contributing

When adding new trace features:

1. Update the `TraceRequest` interface if needed
2. Add new CLI commands to `traceCommands.ts`
3. Update visualization logic for new request types
4. Add tests for new functionality
5. Update this documentation

## License

Apache 2.0 - See LICENSE file for details.

