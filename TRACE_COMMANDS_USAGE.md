# Trace 命令使用指南

## 🎉 问题已解决！

您的 `/trace` 命令现在已经正确注册并可以使用了！

## 📋 可用的 Trace 命令

### 基本命令

```bash
/trace stats                    # 显示追踪统计信息
/trace list [数量]              # 列出最近的请求（默认10个）
/trace sessions                 # 显示可用的会话信息
/trace enable                   # 启用追踪监控
/trace disable                  # 禁用追踪监控
```

### 可视化命令

```bash
/trace gantt html               # 生成 HTML 格式的甘特图
/trace gantt svg [文件名]       # 生成 SVG 格式的甘特图
/trace gantt png [文件名]       # 生成 PNG 格式的甘特图（需要 canvas 库）
```

### 数据管理命令

```bash
/trace export json [文件名]     # 导出 JSON 格式数据
/trace export csv [文件名]      # 导出 CSV 格式数据
/trace clear --confirm          # 清除所有追踪数据
/trace cleanup [天数]           # 删除指定天数前的旧数据（默认30天）
```

## 🚀 快速开始

### 1. 启动 Qwen Code

```bash
# 在项目目录中启动
npm start

# 或者全局安装后使用
npm install -g @qwen-code/qwen-code
qwen
```

### 2. 使用 Trace 命令

在 Qwen Code 交互界面中：

```bash
# 查看当前统计信息
/trace stats

# 列出最近的请求
/trace list 5

# 生成甘特图
/trace gantt html

# 导出数据
/trace export json my-trace-data.json
```

## 📊 命令输出示例

### `/trace stats` 输出示例：
```
📊 Trace Statistics
==================
Total Requests: 15
Total Duration: 2.3s
Average Duration: 153.3ms
Error Rate: 0.0%

📈 Requests by Type:
  llm: 8
  tool_call: 5
  embedding: 2

📋 Requests by Status:
  completed: 14
  failed: 1
```

### `/trace list` 输出示例：
```
📝 Recent Requests (5)
=====================================

1. LLM - completed
   ID: req-123
   Time: 2024-01-15 10:30:45
   Duration: 250ms
   Prompt: 你好，请帮我写一个Python函数
   Model: qwen-2.5-72b-instruct

2. TOOL_CALL - completed
   ID: tool-456
   Time: 2024-01-15 10:30:50
   Duration: 50ms
   Tool: write_file
```

## 🎨 甘特图功能

生成的甘特图包含以下特性：

- **时间轴显示**：显示请求的开始和结束时间
- **颜色编码**：
  - 🟢 绿色：LLM 请求（已完成）
  - 🔴 红色：LLM 请求（失败）
  - 🟡 黄色：工具调用（已完成）
  - 🟣 紫色：嵌入请求（已完成）
- **交互式**：鼠标悬停显示详细信息
- **多格式**：支持 HTML、SVG、PNG 格式

## 💾 数据存储

- **数据库位置**：`.qwen/trace/trace.db`
- **自动保存**：每 5 秒自动保存到数据库
- **数据清理**：使用 `/trace cleanup 30` 删除 30 天前的数据

## 🔧 配置选项

### 环境变量
```bash
export QWEN_TRACE_ENABLED=true
export QWEN_TRACE_DATA_DIR=.qwen/trace
export QWEN_TRACE_AUTO_SAVE_INTERVAL=5000
```

### 配置文件
在 `settings.json` 中添加：
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

## 🆘 故障排除

### 常见问题

1. **命令未找到**
   - 确保已重新构建项目：`npm run build`
   - 重启 Qwen Code

2. **数据库错误**
   - 检查 `.qwen/trace/` 目录权限
   - 确保没有其他进程在使用数据库

3. **甘特图生成失败**
   - HTML/SVG 格式通常都能正常工作
   - PNG 格式需要安装 canvas 库：`npm install canvas`

4. **没有数据**
   - 确保追踪已启用：`/trace enable`
   - 进行一些 LLM 请求或工具调用

### 调试模式

```bash
# 启用调试日志
qwen --debug

# 查看详细错误信息
qwen --verbose
```

## 🎯 使用场景

1. **性能监控**：跟踪请求耗时，识别瓶颈
2. **使用分析**：了解 LLM 和工具使用模式
3. **调试支持**：可视化请求流程，定位问题
4. **优化指导**：基于数据驱动的系统优化
5. **合规审计**：完整的 AI 交互记录

## 🎊 开始使用

现在您可以开始使用 trace 命令了！建议的使用流程：

1. 启动 Qwen Code
2. 运行 `/trace enable` 启用追踪
3. 进行一些正常的 LLM 交互
4. 使用 `/trace stats` 查看统计信息
5. 使用 `/trace gantt html` 生成甘特图
6. 使用 `/trace export json` 导出数据

享受您的追踪监控体验！🚀

