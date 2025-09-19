/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { TraceRequest, GanttChartData } from './types.js';
import { TraceDeduplicator } from './deduplicator.js';

export class TraceVisualization {
  private deduplicator: TraceDeduplicator;

  constructor() {
    this.deduplicator = new TraceDeduplicator();
  }

  /**
   * Generate Gantt chart as HTML
   */
  generateGanttChart(requests: TraceRequest[], outputPath?: string): string {
    const ganttData = this.deduplicator.prepareGanttData(requests);
    
    if (ganttData.requests.length === 0) {
      return this.generateEmptyChart();
    }

    const html = this.createGanttChartHTML(ganttData);
    
    if (outputPath) {
      const outputDir = join(outputPath, '..');
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      writeFileSync(outputPath, html);
    }

    return html;
  }

  /**
   * Generate Gantt chart as SVG
   */
  generateGanttChartSVG(requests: TraceRequest[], outputPath?: string): string {
    const ganttData = this.deduplicator.prepareGanttData(requests);
    
    if (ganttData.requests.length === 0) {
      return this.generateEmptySVG();
    }

    const svg = this.createGanttChartSVG(ganttData);
    
    if (outputPath) {
      const outputDir = join(outputPath, '..');
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      writeFileSync(outputPath, svg);
    }

    return svg;
  }

  /**
   * Generate Gantt chart as PNG using canvas (requires node-canvas)
   */
  async generateGanttChartPNG(requests: TraceRequest[], outputPath?: string): Promise<Buffer> {
    try {
      const { createCanvas } = await import('canvas');
      const ganttData = this.deduplicator.prepareGanttData(requests);
      
      if (ganttData.requests.length === 0) {
        return this.generateEmptyPNG();
      }

      const canvas = this.createGanttChartCanvas(ganttData, createCanvas);
      const buffer = canvas.toBuffer('image/png');
      
      if (outputPath) {
        const outputDir = join(outputPath, '..');
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        writeFileSync(outputPath, buffer);
      }

      return buffer;
    } catch (error) {
      throw new Error('Canvas library not available. Install with: npm install canvas');
    }
  }

  /**
   * Create HTML Gantt chart
   */
  private createGanttChartHTML(ganttData: GanttChartData): string {
    const totalDuration = Math.max(1, ganttData.timeline.totalDuration);
    const pxPerMs = Math.max(0.1, 1000 / totalDuration);
    const chartWidth = Math.max(800, Math.floor(totalDuration * pxPerMs));
    const barHeight = 30;
    const spacing = 5;
    const totalHeight = ganttData.requests.length * (barHeight + spacing) + 100;

    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Qwen Code Trace Gantt Chart</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .chart-container { border: 1px solid #ccc; padding: 20px; max-width: 100%; box-sizing: border-box; }
        .chart-header { margin-bottom: 20px; }
        .chart-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .chart-stats { font-size: 14px; color: #666; }
        .gantt-scroll { overflow-x: auto; overflow-y: hidden; }
        .gantt-chart { position: relative; height: ${totalHeight}px; min-width: ${chartWidth}px; }
        .request-bar { 
            position: absolute; 
            height: ${barHeight}px; 
            border-radius: 4px; 
            display: flex; 
            align-items: center; 
            padding: 0 8px; 
            color: white; 
            font-size: 12px; 
            font-weight: bold;
            cursor: pointer;
        }
        .request-bar:hover { opacity: 0.8; }
        .request-label { 
            position: absolute; 
            left: -200px; 
            width: 180px; 
            text-align: right; 
            font-size: 12px; 
            color: #333;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-family: Arial, sans-serif;
            pointer-events: none;
            z-index: 1000;
            display: none;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border: 1px solid #333;
        }
        .tooltip-title {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 6px;
            color: #4CAF50;
        }
        .tooltip-content {
            line-height: 1.4;
        }
        .tooltip-row {
            margin-bottom: 4px;
        }
        .tooltip-label {
            color: #ccc;
            font-weight: bold;
        }
        .tooltip-value {
            color: white;
        }
        .timeline { 
            position: absolute; 
            top: -30px; 
            height: 20px; 
            border-bottom: 1px solid #ccc;
        }
        .timeline-marker { 
            position: absolute; 
            top: 15px; 
            font-size: 10px; 
            color: #666;
        }
        .legend { margin-top: 20px; }
        .legend-item { display: inline-block; margin-right: 20px; }
        .legend-color { 
            display: inline-block; 
            width: 16px; 
            height: 16px; 
            margin-right: 5px; 
            vertical-align: middle;
        }
    </style>
</head>
<body>
    <div class="chart-container">
        <div class="chart-header">
            <div class="chart-title">Qwen Code Trace Timeline</div>
            <div class="chart-stats">
                Total Requests: ${ganttData.requests.length} | 
                Total Duration: ${this.formatDuration(ganttData.timeline.totalDuration)} | 
                Start: ${new Date(ganttData.timeline.start).toLocaleString()} | 
                End: ${new Date(ganttData.timeline.end).toLocaleString()}
            </div>
        </div>
        
        <div class="gantt-scroll">
          <div class="gantt-chart" style="width: ${chartWidth}px;">
            <div class="timeline" style="width: ${chartWidth}px;">
                ${this.generateTimelineMarkers(totalDuration, chartWidth)}
            </div>
            ${ganttData.requests.map((request, index) => {
              const top = index * (barHeight + spacing);
              const left = Math.max(0, Math.floor(request.start * pxPerMs));
              const width = Math.max(2, Math.floor((request.end - request.start) * pxPerMs));
              
              // 获取原始请求数据用于详细信息
              const originalRequest = request.originalRequest;
              const startTime = originalRequest ? new Date(originalRequest.startTime).toLocaleString() : new Date(request.start).toLocaleString();
              const endTime = originalRequest ? new Date(originalRequest.endTime || originalRequest.startTime).toLocaleString() : new Date(request.end).toLocaleString();
              
              return `
                <div class="request-label" style="top: ${top}px;">
                    ${request.name}
                </div>
                <div class="request-bar" 
                     style="top: ${top}px; left: ${left}px; width: ${width}px; background-color: ${request.color};"
                     title="${request.name} (${this.formatDuration(request.duration)})"
                     data-request-type="${originalRequest?.type || 'unknown'}"
                     data-request-status="${originalRequest?.status || 'unknown'}"
                     data-request-id="${originalRequest?.id || 'unknown'}"
                     data-request-start="${startTime}"
                     data-request-end="${endTime}"
                     data-request-duration="${this.formatDuration(request.duration)}"
                     data-request-content='${JSON.stringify(originalRequest?.content || {}).replace(/'/g, "&#39;")}'
                     data-request-metadata='${JSON.stringify(originalRequest?.metadata || {}).replace(/'/g, "&#39;")}'>
                    ${request.duration > 50 ? this.formatDuration(request.duration) : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <div class="legend">
            ${this.generateLegend()}
        </div>
    </div>
    
    <!-- Tooltip -->
    <div class="tooltip" id="tooltip">
        <div class="tooltip-title" id="tooltip-title"></div>
        <div class="tooltip-content" id="tooltip-content"></div>
    </div>
    
    <script>
        // Enhanced tooltip functionality
        const tooltip = document.getElementById('tooltip');
        const tooltipTitle = document.getElementById('tooltip-title');
        const tooltipContent = document.getElementById('tooltip-content');
        
        // Add hover handlers for request bars
        document.querySelectorAll('.request-bar').forEach(bar => {
            bar.addEventListener('mouseenter', function(e) {
                const type = this.dataset.requestType || 'Unknown';
                const status = this.dataset.requestStatus || 'Unknown';
                const id = this.dataset.requestId || 'Unknown';
                const start = this.dataset.requestStart || 'Unknown';
                const end = this.dataset.requestEnd || 'Unknown';
                const duration = this.dataset.requestDuration || 'Unknown';
                
                let content = '';
                let contentData = {};
                let metadata = {};
                
                try {
                    contentData = JSON.parse(this.dataset.requestContent || '{}');
                    metadata = JSON.parse(this.dataset.requestMetadata || '{}');
                } catch (e) {
                    console.warn('Failed to parse request data:', e);
                }
                
                // Build tooltip content
                tooltipTitle.textContent = \`\${type.toUpperCase()} Request\`;
                
                content += \`<div class="tooltip-row"><span class="tooltip-label">ID:</span> <span class="tooltip-value">\${id.substring(0, 8)}...</span></div>\`;
                content += \`<div class="tooltip-row"><span class="tooltip-label">Status:</span> <span class="tooltip-value">\${status}</span></div>\`;
                content += \`<div class="tooltip-row"><span class="tooltip-label">Duration:</span> <span class="tooltip-value">\${duration}</span></div>\`;
                content += \`<div class="tooltip-row"><span class="tooltip-label">Start:</span> <span class="tooltip-value">\${start}</span></div>\`;
                content += \`<div class="tooltip-row"><span class="tooltip-label">End:</span> <span class="tooltip-value">\${end}</span></div>\`;
                
                // Add type-specific content
                if (type === 'llm' && contentData.prompt) {
                    const prompt = contentData.prompt.length > 100 ? 
                        contentData.prompt.substring(0, 100) + '...' : 
                        contentData.prompt;
                    content += \`<div class="tooltip-row"><span class="tooltip-label">Prompt:</span> <span class="tooltip-value">\${prompt}</span></div>\`;
                }
                
                if (type === 'llm' && contentData.model) {
                    content += \`<div class="tooltip-row"><span class="tooltip-label">Model:</span> <span class="tooltip-value">\${contentData.model}</span></div>\`;
                }
                
                if (type === 'tool_call' && contentData.toolName) {
                    content += \`<div class="tooltip-row"><span class="tooltip-label">Tool:</span> <span class="tooltip-value">\${contentData.toolName}</span></div>\`;
                }
                
                if (type === 'tool_call' && contentData.toolArgs) {
                    const args = Object.keys(contentData.toolArgs);
                    if (args.length > 0) {
                        content += \`<div class="tooltip-row"><span class="tooltip-label">Args:</span> <span class="tooltip-value">\${args.join(', ')}</span></div>\`;
                    }
                }
                
                if (type === 'embedding' && contentData.input) {
                    const input = contentData.input.length > 50 ? 
                        contentData.input.substring(0, 50) + '...' : 
                        contentData.input;
                    content += \`<div class="tooltip-row"><span class="tooltip-label">Input:</span> <span class="tooltip-value">\${input}</span></div>\`;
                }
                
                if (type === 'embedding' && contentData.embeddingModel) {
                    content += \`<div class="tooltip-row"><span class="tooltip-label">Model:</span> <span class="tooltip-value">\${contentData.embeddingModel}</span></div>\`;
                }
                
                // Add metadata if available
                if (metadata.sessionId) {
                    content += \`<div class="tooltip-row"><span class="tooltip-label">Session:</span> <span class="tooltip-value">\${metadata.sessionId.substring(0, 8)}...</span></div>\`;
                }
                
                tooltipContent.innerHTML = content;
                tooltip.style.display = 'block';
                
                // Position tooltip
                const rect = this.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                let left = e.pageX + 10;
                let top = e.pageY - 10;
                
                // Adjust if tooltip goes off screen
                if (left + tooltipRect.width > window.innerWidth) {
                    left = e.pageX - tooltipRect.width - 10;
                }
                if (top + tooltipRect.height > window.innerHeight) {
                    top = e.pageY - tooltipRect.height - 10;
                }
                
                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
            });
            
            bar.addEventListener('mouseleave', function() {
                tooltip.style.display = 'none';
            });
            
            bar.addEventListener('mousemove', function(e) {
                if (tooltip.style.display === 'block') {
                    const rect = this.getBoundingClientRect();
                    const tooltipRect = tooltip.getBoundingClientRect();
                    let left = e.pageX + 10;
                    let top = e.pageY - 10;
                    
                    // Adjust if tooltip goes off screen
                    if (left + tooltipRect.width > window.innerWidth) {
                        left = e.pageX - tooltipRect.width - 10;
                    }
                    if (top + tooltipRect.height > window.innerHeight) {
                        top = e.pageY - tooltipRect.height - 10;
                    }
                    
                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                }
            });
            
            // Keep click handler for detailed view
            bar.addEventListener('click', function() {
                const type = this.dataset.requestType || 'Unknown';
                const id = this.dataset.requestId || 'Unknown';
                const content = this.dataset.requestContent || '{}';
                const metadata = this.dataset.requestMetadata || '{}';
                
                let contentData = {};
                let metadataData = {};
                
                try {
                    contentData = JSON.parse(content);
                    metadataData = JSON.parse(metadata);
                } catch (e) {
                    console.warn('Failed to parse request data:', e);
                }
                
                const details = \`Request Details:\\n\\n\` +
                    \`Type: \${type}\\n\` +
                    \`ID: \${id}\\n\` +
                    \`Status: \${this.dataset.requestStatus}\\n\` +
                    \`Duration: \${this.dataset.requestDuration}\\n\` +
                    \`Start: \${this.dataset.requestStart}\\n\` +
                    \`End: \${this.dataset.requestEnd}\\n\\n\` +
                    \`Content: \${JSON.stringify(contentData, null, 2)}\\n\\n\` +
                    \`Metadata: \${JSON.stringify(metadataData, null, 2)}\`;
                
                alert(details);
            });
        });
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * Create SVG Gantt chart
   */
  private createGanttChartSVG(ganttData: GanttChartData): string {
    const maxDuration = Math.max(...ganttData.requests.map(r => r.end));
    const chartWidth = Math.max(800, maxDuration * 2);
    const barHeight = 30;
    const spacing = 5;
    const totalHeight = ganttData.requests.length * (barHeight + spacing) + 100;

    let svg = `
<svg width="${chartWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <style>
            .request-bar { cursor: pointer; }
            .request-bar:hover { opacity: 0.8; }
            .request-label { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
            .timeline-marker { font-family: Arial, sans-serif; font-size: 10px; fill: #666; }
        </style>
    </defs>
    
    <!-- Title -->
    <text x="${chartWidth / 2}" y="20" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold">
        Qwen Code Trace Timeline
    </text>
    
    <!-- Stats -->
    <text x="10" y="40" font-family="Arial" font-size="12" fill="#666">
        Total Requests: ${ganttData.requests.length} | Duration: ${this.formatDuration(ganttData.timeline.totalDuration)}
    </text>
    
    <!-- Timeline -->
    <line x1="0" y1="60" x2="${chartWidth}" y2="60" stroke="#ccc" stroke-width="1"/>
    ${this.generateTimelineMarkersSVG(maxDuration, chartWidth, 60)}
    
    <!-- Request bars -->
    ${ganttData.requests.map((request, index) => {
      const y = 80 + index * (barHeight + spacing);
      const x = (request.start / maxDuration) * chartWidth;
      const width = ((request.end - request.start) / maxDuration) * chartWidth;
      
      return `
        <rect class="request-bar" 
              x="${x}" y="${y}" width="${width}" height="${barHeight}" 
              fill="${request.color}" rx="4" ry="4"
              title="${request.name} (${this.formatDuration(request.duration)})"/>
        <text class="request-label" x="10" y="${y + barHeight / 2 + 4}" text-anchor="start">
            ${request.name.length > 40 ? request.name.substring(0, 40) + '...' : request.name}
        </text>
        ${width > 50 ? `
          <text x="${x + width / 2}" y="${y + barHeight / 2 + 4}" 
                text-anchor="middle" font-size="10" fill="white" font-weight="bold">
            ${this.formatDuration(request.duration)}
          </text>
        ` : ''}
      `;
    }).join('')}
    
    <!-- Legend -->
    ${this.generateLegendSVG(chartWidth - 200, totalHeight - 30)}
</svg>`;

    return svg;
  }

  /**
   * Create Canvas Gantt chart
   */
  private createGanttChartCanvas(ganttData: GanttChartData, createCanvas: any): any {
    const maxDuration = Math.max(...ganttData.requests.map(r => r.end));
    const chartWidth = Math.max(800, maxDuration * 2);
    const barHeight = 30;
    const spacing = 5;
    const totalHeight = ganttData.requests.length * (barHeight + spacing) + 100;

    const canvas = createCanvas(chartWidth, totalHeight);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, chartWidth, totalHeight);

    // Title
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('Qwen Code Trace Timeline', chartWidth / 2, 25);

    // Stats
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText(
      `Total Requests: ${ganttData.requests.length} | Duration: ${this.formatDuration(ganttData.timeline.totalDuration)}`,
      10, 45
    );

    // Timeline
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(chartWidth, 60);
    ctx.stroke();

    // Timeline markers
    this.drawTimelineMarkers(ctx, maxDuration, chartWidth, 60);

    // Request bars
    ganttData.requests.forEach((request, index) => {
      const y = 80 + index * (barHeight + spacing);
      const x = (request.start / maxDuration) * chartWidth;
      const width = ((request.end - request.start) / maxDuration) * chartWidth;

      // Request bar
      ctx.fillStyle = request.color;
      ctx.fillRect(x, y, width, barHeight);

      // Request label
      ctx.font = '12px Arial';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      const label = request.name.length > 40 ? request.name.substring(0, 40) + '...' : request.name;
      ctx.fillText(label, 10, y + barHeight / 2 + 4);

      // Duration text
      if (width > 50) {
        ctx.font = '10px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(this.formatDuration(request.duration), x + width / 2, y + barHeight / 2 + 4);
      }
    });

    return canvas;
  }

  /**
   * Generate timeline markers for HTML
   */
  private generateTimelineMarkers(maxDuration: number, chartWidth: number): string {
    const markers = [];
    const numMarkers = 10;
    
    for (let i = 0; i <= numMarkers; i++) {
      const position = (i / numMarkers) * chartWidth;
      const time = (i / numMarkers) * maxDuration;
      
      markers.push(`
        <div class="timeline-marker" style="left: ${position}px;">
          ${this.formatDuration(time)}
        </div>
      `);
    }
    
    return markers.join('');
  }

  /**
   * Generate timeline markers for SVG
   */
  private generateTimelineMarkersSVG(maxDuration: number, chartWidth: number, y: number): string {
    const markers = [];
    const numMarkers = 10;
    
    for (let i = 0; i <= numMarkers; i++) {
      const x = (i / numMarkers) * chartWidth;
      const time = (i / numMarkers) * maxDuration;
      
      markers.push(`
        <line x1="${x}" y1="${y - 5}" x2="${x}" y2="${y + 5}" stroke="#ccc" stroke-width="1"/>
        <text class="timeline-marker" x="${x}" y="${y - 10}" text-anchor="middle">
          ${this.formatDuration(time)}
        </text>
      `);
    }
    
    return markers.join('');
  }

  /**
   * Draw timeline markers on canvas
   */
  private drawTimelineMarkers(ctx: any, maxDuration: number, chartWidth: number, y: number): void {
    const numMarkers = 10;
    
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    
    for (let i = 0; i <= numMarkers; i++) {
      const x = (i / numMarkers) * chartWidth;
      const time = (i / numMarkers) * maxDuration;
      
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
      
      ctx.fillText(this.formatDuration(time), x, y - 10);
    }
  }

  /**
   * Generate legend for HTML
   */
  private generateLegend(): string {
    const legendItems = [
      { color: '#4CAF50', label: 'LLM Completed' },
      { color: '#F44336', label: 'LLM Failed' },
      { color: '#8BC34A', label: 'Tool Completed' },
      { color: '#E91E63', label: 'Tool Failed' },
      { color: '#9C27B0', label: 'Embedding Completed' },
      { color: '#795548', label: 'Embedding Failed' },
    ];

    return legendItems.map(item => `
      <div class="legend-item">
        <span class="legend-color" style="background-color: ${item.color};"></span>
        ${item.label}
      </div>
    `).join('');
  }

  /**
   * Generate legend for SVG
   */
  private generateLegendSVG(x: number, y: number): string {
    const legendItems = [
      { color: '#4CAF50', label: 'LLM Completed' },
      { color: '#8BC34A', label: 'Tool Completed' },
      { color: '#9C27B0', label: 'Embedding Completed' },
    ];

    return legendItems.map((item, index) => `
      <rect x="${x}" y="${y + index * 20}" width="16" height="16" fill="${item.color}"/>
      <text x="${x + 20}" y="${y + index * 20 + 12}" font-family="Arial" font-size="12" fill="#333">
        ${item.label}
      </text>
    `).join('');
  }

  /**
   * Format duration in milliseconds to human readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Generate empty chart HTML
   */
  private generateEmptyChart(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Qwen Code Trace Gantt Chart</title>
</head>
<body>
    <h1>No trace data available</h1>
    <p>No requests were found to generate a Gantt chart.</p>
</body>
</html>`;
  }

  /**
   * Generate empty SVG
   */
  private generateEmptySVG(): string {
    return `
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
    <text x="200" y="100" text-anchor="middle" font-family="Arial" font-size="16">
        No trace data available
    </text>
</svg>`;
  }

  /**
   * Generate empty PNG
   */
  private generateEmptyPNG(): Buffer {
    // Return a minimal 1x1 pixel PNG
    return Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
  }
}
