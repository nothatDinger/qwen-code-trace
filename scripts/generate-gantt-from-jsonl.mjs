// generate-gantt-from-jsonl.mjs
import { TraceManager, TraceVisualization } from '@qwen-code/qwen-code-core';
import { resolve, dirname, basename } from 'node:path';
import { existsSync } from 'node:fs';

function printUsageAndExit() {
  console.log('Usage:');
  console.log('  node scripts/generate-gantt-from-jsonl.mjs <path/to/session.jsonl> [--format html|svg|png] [--out <outputPath>] [--start <epochMs>] [--end <epochMs>] [--type llm|tool_call|embedding] [--status completed|failed]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) printUsageAndExit();

const jsonlPath = args[0];
if (!jsonlPath) printUsageAndExit();

const options = {
  format: 'html',
  out: null,
  start: undefined,
  end: undefined,
  type: undefined,
  status: undefined,
};

for (let i = 1; i < args.length; i++) {
  const key = args[i];
  const val = args[i + 1];
  if (key === '--format' && val) { options.format = val; i++; }
  else if (key === '--out' && val) { options.out = val; i++; }
  else if (key === '--start' && val) { options.start = Number(val); i++; }
  else if (key === '--end' && val) { options.end = Number(val); i++; }
  else if (key === '--type' && val) { options.type = val; i++; }
  else if (key === '--status' && val) { options.status = val; i++; }
}

const abs = resolve(jsonlPath);
if (!existsSync(abs)) {
  console.error('File not found:', abs);
  process.exit(1);
}

const dataDir = dirname(abs);
const sessionId = basename(abs).replace(/\.jsonl$/, '');

const tm = new TraceManager(dataDir, sessionId);
const viz = new TraceVisualization();

const filter = {
  sessionId,
  startTime: options.start,
  endTime: options.end,
  type: options.type,
  status: options.status,
};

const requests = tm.getRequests(filter);
if (!requests || requests.length === 0) {
  console.log('No requests match the given filter.');
  process.exit(0);
}

const outPath = resolve(process.cwd(), options.out || `trace-gantt-${sessionId.slice(0,8)}.${options.format}`);

if (options.format === 'html') {
  viz.generateGanttChart(requests, outPath);
  console.log('Generated HTML:', outPath);
} else if (options.format === 'svg') {
  viz.generateGanttChartSVG(requests, outPath);
  console.log('Generated SVG:', outPath);
} else if (options.format === 'png') {
  const buf = await viz.generateGanttChartPNG(requests, outPath);
  console.log('Generated PNG:', outPath, buf ? `(size=${buf.length})` : '');
} else {
  console.error('Unsupported format:', options.format);
  process.exit(1);
}