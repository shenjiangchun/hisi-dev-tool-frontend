# Claude 前端组件重构设计文档

## 概述

基于研究文档《Vue3 + TypeScript + Vite 嵌入 Claude 前端组件方案调研与实现指南》，采用 Element Plus X 组件库全面重构 ClaudeSession.vue，实现双模式输入、流式响应优化、文件上传支持和会话管理增强。

## 技术选型

| 组件库 | 版本 | 用途 |
|--------|------|------|
| vue-element-plus-x | ^1.0.0 | AI 对话核心组件库 |
| unplugin-auto-import | ^0.17.0 | API 自动导入 |
| unplugin-vue-components | ^0.26.0 | 组件自动注册 |

## 架构设计

### 组件结构

```
src/views/claude-session/
├── ClaudeSessionNew.vue          # 主入口（新组件）
├── components/
│   ├── ChatContainer.vue         # 对话容器（BubbleList + Sender）
│   ├── SessionList.vue           # 会话列表侧边栏
│   ├── QuickActions.vue          # 快捷按钮配置
│   └── FileUploader.vue          # 文件上传处理
├── composables/
│   ├── useClaudeChat.ts          # 封装流式对话逻辑
│   └── useSessionManager.ts      # 会话管理逻辑
└── types/
    └── chat.types.ts             # 类型定义
```

### 数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                      ClaudeSessionNew.vue                    │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │ SessionList │◄──►│ SessionStore    │◄──►│ChatContainer│  │
│  │ (左侧面板)  │    │ (Pinia)         │    │ (主对话区)  │  │
│  └─────────────┘    └────────┬────────┘    └──────┬──────┘  │
│                              │                     │         │
│                              ▼                     ▼         │
│                     ┌────────────────────────────────┐      │
│                     │     useClaudeChat (Composable) │      │
│                     │  - useXStream Hook 封装        │      │
│                     │  - 消息发送/接收               │      │
│                     │  - 流式中断/重试               │      │
│                     └───────────────┬────────────────┘      │
│                                     │                        │
└─────────────────────────────────────┼────────────────────────┘
                                      ▼
                           ┌──────────────────┐
                           │   后端 API       │
                           │ /api/claude/...  │
                           └──────────────────┘
```

## 核心组件设计

### 1. ChatContainer.vue

使用 Element Plus X 的 BubbleList + Sender 组件：

- **BubbleList**: 虚拟滚动、Markdown 渲染、代码高亮
- **Sender**: 双模式输入（`/` 指令触发）、文件上传、快捷按钮
- 自动滚动到最新消息

### 2. useClaudeChat.ts

封装流式对话逻辑：

```typescript
export function useClaudeChat(sessionId: Ref<string | null>) {
  const { connect, cancel, loading } = useXStream({
    onChunk: (chunk) => appendToLastMessage(chunk),
    onDone: () => saveMessageToBackend(),
    onError: (error) => handleError(error)
  })

  async function sendMessage(content: string) { ... }
  function cancelStreaming() { ... }

  return { messageList, isStreaming, sendMessage, cancelStreaming }
}
```

### 3. 快捷按钮配置

```typescript
const quickActions: SenderAction[] = [
  { key: 'code-review', name: '代码审查', icon: 'Search' },
  { key: 'explain', name: '代码解释', icon: 'Document' },
  { key: 'fix-bug', name: 'Bug 分析', icon: 'Warning' },
  { key: 'generate-test', name: '生成测试', icon: 'DocumentChecked' }
]
```

### 4. 文件上传

支持文件类型：`.java`, `.ts`, `.js`, `.vue`, `.json`, `.xml`, `.yml`, `.md`, `.txt`, `.sql`, `.py`, `.go`

流程：前端读取 → 上传后端 → 自动填充分析指令

## 会话管理设计

### SessionStore 改造

保留现有逻辑，新增：

- `getBubbleListMessages()`: 转换为 BubbleList 兼容格式
- `addBubbleMessage()`: 添加消息并转换格式

### 会话持久化策略

仅后端存储，刷新页面后从后端加载历史会话。

### 会话状态同步

```
用户发送消息 → ChatContainer → useClaudeChat → 后端 API
                    ↓
              SessionStore (缓存)
```

## Vite 配置优化

### vite.config.ts

```typescript
plugins: [
  vue(),
  AutoImport({
    resolvers: [ElementPlusXResolver()],
    imports: ['vue', 'pinia', 'vue-router'],
    dts: 'src/auto-imports.d.ts'
  }),
  Components({
    resolvers: [ElementPlusXResolver()],
    dts: 'src/components.d.ts'
  })
]
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vue-element-plus-x/global"]
  }
}
```

## 实施路线图

| 阶段 | 任务 | 工时 |
|------|------|------|
| Phase 1 | 环境准备、新分支创建、依赖安装 | 0.5 天 |
| Phase 2 | 核心组件实现（ChatContainer + useClaudeChat） | 1.5 天 |
| Phase 3 | 会话管理实现（SessionList + useSessionManager） | 1 天 |
| Phase 4 | 功能完善（快捷按钮 + 文件上传） | 1 天 |
| Phase 5 | 测试与清理 | 0.5 天 |
| **总计** | | **4.5 天** |

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| Element Plus X 与现有 Element Plus 样式冲突 | 使用 CSS 命名空间隔离 |
| 后端 SSE 接口格式不兼容 | 在 useClaudeChat 中适配 |
| 虚拟滚动性能问题 | 设置合理的 item-size，测试长消息列表 |

## 验收标准

1. 双模式输入：`/` 触发指令列表，快捷按钮可用
2. 流式响应：打字机效果、Markdown 渲染正常
3. 文件上传：支持拖拽、类型限制、后端对接正常
4. 会话管理：创建/切换/删除会话正常，消息持久化
5. 性能：100+ 消息列表滚动流畅

---

创建日期: 2026-03-30