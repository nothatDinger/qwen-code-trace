## Qwen Code Trace - 使用说明

本仓库已为 qwen-code 添加 Trace 跟踪能力，自动记录 LLM 请求、工具调用与 Embedding 请求的开始/结束时间与内容，持久化到本地 JSONL 文件，并可生成甘特图进行可视化。

### 目录
- 安装
- 启动与自动追踪（CLI/REPL）
- 数据存储位置
- 环境变量
- 查看统计与生成甘特图（REPL 内）
- 从 JSONL 脚本生成甘特图（非 REPL/离线）
- 查看原始 LLM 请求/响应

### 安装
1) 安装依赖
```bash
npm install
npm run build
```

2) 可选：全局链接 CLI（按需）
```bash
npm link
```

### 启动与自动追踪（CLI/REPL）
- 非交互模式（一次性调用）：直接运行 qwen-code，Trace 自动开启并记录
```bash
qwen "写一个快速排序"
```

- 交互 REPL 模式：在会话中输入对话或命令，Trace 自动记录
```text
/trace stats
/trace list 20
/trace gantt html
```

说明：我们在内部用 `TracedGeminiClient` 和 `TracedCoreToolScheduler` 包裹了核心客户端与工具调度器，CLI 与 REPL 均自动写入本地会话 JSONL。

### 数据存储位置
- 默认目录：项目根目录下 `.trace/`
- 每个终端会话使用独立会话文件：
  - `<sessionId>.jsonl`：去重后的标准 Trace 数据
  - `<sessionId>.raw.json`：原始 LLM 请求/响应数据（完整入参/出参）

查看会话文件：
```bash
ls -lt .trace
tail -n 50 .trace/<sessionId>.jsonl
tail -n 50 .trace/<sessionId>.raw.json
```

### 环境变量
- 模型与认证等配置遵循 qwen-code 原有机制；如需覆盖模型：
在项目根目录中添加.env文件
```bash
OPENAI_API_KEY=YOUR_API_KEY
OPENAI_BASE_URL=YOUR_BASE_URL
OPENAI_MODEL=YOUR_MODEL
```
Trace 会自动读取配置，记录到请求内容中。

### 查看统计与生成甘特图（REPL 内）
在 REPL 中：
```text
/trace stats          # 展示总次数、耗时、类型/状态分布等

```

生成的甘特图文件名示例：`trace-gantt-<sessionIdPrefix>.html`

### 从 JSONL 脚本生成甘特图（非 REPL/离线）
提供脚本 `scripts/generate-gantt-from-jsonl.mjs`，可直接对 JSONL 文件生成甘特图，支持过滤与多格式输出。

用法：
```bash
node scripts/generate-gantt-from-jsonl.mjs .trace/<sessionId>.jsonl \
  --format html|svg|png \
  --out ./my-gantt.html \
  --start 1758180000000 --end 1758189999999 \
  --type llm|tool_call|embedding \
  --status completed|failed
```

示例：
```bash
node scripts/generate-gantt-from-jsonl.mjs .trace/82c79ff4-....jsonl --format html --out trace-gantt.html
```

说明：脚本会根据 JSONL 所在目录自动识别会话 ID，并复用内部可视化逻辑（同 REPL 的甘特图）。

### 查看原始 LLM 请求/响应
- 原始数据文件：`.trace/<sessionId>.raw.json`
- REPL 内查看：
```text
/trace raw 20
```

原始请求会包含 `contents`、`generationConfig` 等；原始响应包含 `candidates`、`usageMetadata` 等。用于排查与审计。

### 备注
- Trace 默认对每条请求只持久化一次，避免重复写入。
- 会话隔离：每个终端会话独立 `sessionId`，REPL 与命令行共享同一会话实例。
- 本地文件为 JSONL 明文，便于离线分析与备份。