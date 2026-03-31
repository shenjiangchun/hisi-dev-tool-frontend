# Claude Session Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor ClaudeSession.vue using Element Plus X to implement dual-mode input, streaming response, file upload, and session management.

**Architecture:** Vue 3 + TypeScript + Element Plus X (Sender/BubbleList/useXStream) + Pinia. New components under `src/views/claude-session/` with composables for reusable logic.

**Tech Stack:** vue-element-plus-x, unplugin-auto-import, unplugin-vue-components, Element Plus

---

## Phase 1: Environment Setup

### Task 1: Create Feature Branch

**Step 1: Create and switch to new branch**

Run:
```bash
cd C:\Users\47583\projects\hisi-dev-tool-frontend
git checkout -b feature/claude-session-refactor
```

Expected: New branch created, output shows `Switched to a new branch 'feature/claude-session-refactor'`

---

### Task 2: Install Dependencies

**Step 1: Install vue-element-plus-x**

Run:
```bash
npm install vue-element-plus-x
```

Expected: Package installed successfully

**Step 2: Install unplugin-auto-import and unplugin-vue-components**

Run:
```bash
npm install -D unplugin-auto-import unplugin-vue-components
```

Expected: Dev dependencies installed successfully

**Step 3: Verify package.json**

Run:
```bash
cat package.json | grep -E "(vue-element-plus-x|unplugin)"
```

Expected: Shows both dependencies added

**Step 4: Commit dependency changes**

Run:
```bash
git add package.json package-lock.json
git commit -m "chore: add vue-element-plus-x and unplugin dependencies"
```

---

### Task 3: Update Vite Configuration

**Files:**
- Modify: `src/vite.config.ts`

**Step 1: Update vite.config.ts with AutoImport and Components plugins**

Replace entire file content:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusXResolver } from 'vue-element-plus-x'

// https://vite.dev/config/
export default defineConfig({
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
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

**Step 2: Verify dev server starts**

Run:
```bash
npm run dev
```

Wait 10 seconds, then check output for "ready in" message.

Expected: Server starts without errors

**Step 3: Stop dev server and commit**

Press `Ctrl+C` to stop server, then:

```bash
git add vite.config.ts
git commit -m "chore: configure unplugin-auto-import and unplugin-vue-components"
```

---

### Task 4: Update TypeScript Configuration

**Files:**
- Modify: `tsconfig.json`

**Step 1: Read current tsconfig.json**

Run:
```bash
cat tsconfig.json
```

**Step 2: Add vue-element-plus-x/global to types array**

Add `"vue-element-plus-x/global"` to the types array in compilerOptions. The relevant section should look like:

```json
"types": ["vite/client", "vue-element-plus-x/global"]
```

If no types array exists, add it to compilerOptions.

**Step 3: Commit TypeScript config changes**

```bash
git add tsconfig.json
git commit -m "chore: add vue-element-plus-x global types"
```

---

### Task 5: Create Directory Structure

**Step 1: Create component directories**

Run:
```bash
mkdir -p src/views/claude-session/components
mkdir -p src/views/claude-session/composables
mkdir -p src/views/claude-session/types
mkdir -p src/styles
```

**Step 2: Commit directory structure**

Run:
```bash
git add .
git commit -m "chore: create claude-session directory structure"
```

---

## Phase 2: Core Types and Composables

### Task 6: Create Type Definitions

**Files:**
- Create: `src/views/claude-session/types/chat.types.ts`

**Step 1: Create chat.types.ts**

```typescript
import type { BubbleListItem } from 'vue-element-plus-x'

/**
 * Element Plus X 兼容的消息格式
 */
export interface ChatMessage extends BubbleListItem {
  key: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

/**
 * 快捷按钮配置
 */
export interface QuickAction {
  key: string
  name: string
  icon: string
  prompt: string
}

/**
 * 文件上传结果
 */
export interface FileUploadResult {
  success: boolean
  filename: string
  content: string
  error?: string
}
```

**Step 2: Commit types**

```bash
git add src/views/claude-session/types/chat.types.ts
git commit -m "feat: add chat type definitions"
```

---

### Task 7: Create Quick Actions Configuration

**Files:**
- Create: `src/views/claude-session/components/QuickActions.vue`

**Step 1: Create QuickActions.vue**

```vue
<template>
  <div class="quick-actions">
    <!-- Used as Sender actions prop, no template needed -->
  </div>
</template>

<script setup lang="ts">
import type { SenderAction } from 'vue-element-plus-x'

/**
 * 快捷按钮配置
 */
export const quickActions: SenderAction[] = [
  {
    key: 'code-review',
    name: '代码审查',
    icon: 'Search',
    onClick: () => '请帮我审查当前项目的代码质量，重点检查 TypeScript 类型定义与 Vue 组件的响应式逻辑'
  },
  {
    key: 'explain',
    name: '代码解释',
    icon: 'Document',
    onClick: () => '请解释这段代码的业务逻辑与实现思路'
  },
  {
    key: 'fix-bug',
    name: 'Bug 分析',
    icon: 'Warning',
    onClick: () => '请帮我分析这个问题并提供修复建议'
  },
  {
    key: 'generate-test',
    name: '生成测试',
    icon: 'DocumentChecked',
    onClick: () => '请为这段代码生成单元测试'
  }
]

defineExpose({ quickActions })
</script>
```

**Step 2: Commit QuickActions**

```bash
git add src/views/claude-session/components/QuickActions.vue
git commit -m "feat: add quick actions configuration"
```

---

### Task 8: Create useClaudeChat Composable

**Files:**
- Create: `src/views/claude-session/composables/useClaudeChat.ts`

**Step 1: Create useClaudeChat.ts**

```typescript
import { ref, nextTick, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { BubbleListItem } from 'vue-element-plus-x'
import { claudeApi } from '@/api/claude'

export interface UseClaudeChatOptions {
  sessionId: Ref<string | null>
  onMessageSaved?: () => void
}

export function useClaudeChat(options: UseClaudeChatOptions) {
  const { sessionId, onMessageSaved } = options

  const messageList = ref<BubbleListItem[]>([])
  const isStreaming = ref(false)
  const streamingContent = ref('')

  /**
   * 追加内容到最后一条 AI 消息
   */
  function appendToLastMessage(content: string) {
    streamingContent.value += content

    // 更新最后一条消息
    if (messageList.value.length > 0) {
      const lastMessage = messageList.value[messageList.value.length - 1]
      if (lastMessage.role === 'assistant') {
        lastMessage.content = streamingContent.value
      }
    }
  }

  /**
   * 发送消息
   */
  async function sendMessage(content: string): Promise<void> {
    if (!content.trim()) return

    // 添加用户消息
    const userMessage: BubbleListItem = {
      key: `user-${Date.now()}`,
      role: 'user',
      content: content.trim()
    }
    messageList.value.push(userMessage)

    // 添加 AI 消息占位
    const aiMessage: BubbleListItem = {
      key: `assistant-${Date.now()}`,
      role: 'assistant',
      content: ''
    }
    messageList.value.push(aiMessage)

    // 重置流式内容
    streamingContent.value = ''
    isStreaming.value = true

    try {
      await claudeApi.universalChat(
        {
          sessionId: sessionId.value || undefined,
          prompt: content.trim(),
          scene: 'free-chat',
          workingDirectory: undefined
        },
        {
          onSession: (id) => {
            // 更新 sessionId（如果是新会话）
            if (!sessionId.value) {
              sessionId.value = id
            }
          },
          onOutput: (chunk) => {
            appendToLastMessage(chunk)
          },
          onDone: () => {
            isStreaming.value = false
            streamingContent.value = ''
            onMessageSaved?.()
          },
          onError: (error) => {
            isStreaming.value = false
            streamingContent.value = ''
            ElMessage.error(`请求失败: ${error}`)
          }
        }
      )
    } catch (error) {
      isStreaming.value = false
      streamingContent.value = ''
      ElMessage.error('发送消息失败')
    }
  }

  /**
   * 加载历史消息
   */
  function loadMessages(messages: Array<{ id: number; role: string; content: string }>) {
    messageList.value = messages.map(msg => ({
      key: msg.id.toString(),
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))
  }

  /**
   * 清空消息
   */
  function clearMessages() {
    messageList.value = []
    streamingContent.value = ''
  }

  return {
    messageList,
    isStreaming,
    streamingContent,
    sendMessage,
    loadMessages,
    clearMessages
  }
}
```

**Step 2: Commit useClaudeChat**

```bash
git add src/views/claude-session/composables/useClaudeChat.ts
git commit -m "feat: add useClaudeChat composable"
```

---

### Task 9: Create useSessionManager Composable

**Files:**
- Create: `src/views/claude-session/composables/useSessionManager.ts`

**Step 1: Create useSessionManager.ts**

```typescript
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSessionStore } from '@/stores/sessionStore'
import { useAppStore } from '@/stores/app'
import { claudeApi } from '@/api/claude'

export function useSessionManager() {
  const sessionStore = useSessionStore()
  const appStore = useAppStore()

  const searchKeyword = ref('')
  const listCollapsed = ref(false)

  /**
   * 过滤后的活跃会话
   */
  const filteredActiveSessions = computed(() => {
    const keyword = searchKeyword.value.toLowerCase()
    return sessionStore.activeSessions.filter(s =>
      (s.title || '').toLowerCase().includes(keyword) ||
      s.scene.toLowerCase().includes(keyword)
    )
  })

  /**
   * 过滤后的归档会话
   */
  const filteredArchivedSessions = computed(() => {
    const keyword = searchKeyword.value.toLowerCase()
    return sessionStore.archivedSessions.filter(s =>
      (s.title || '').toLowerCase().includes(keyword) ||
      s.scene.toLowerCase().includes(keyword)
    )
  })

  /**
   * 创建新会话
   */
  async function createNewSession(): Promise<string | null> {
    if (!appStore.projectSelected) {
      ElMessage.warning('请先选择一个项目')
      return null
    }

    try {
      let newSessionId = ''

      await claudeApi.universalChat(
        {
          prompt: '你好，请问我有什么可以帮助你的？',
          scene: 'free-chat',
          metadata: { projectName: appStore.selectedProject },
          workingDirectory: appStore.projectDir
        },
        {
          onSession: async (sessionId) => {
            newSessionId = sessionId
            await sessionStore.loadSessions()
            sessionStore.setCurrentSession(sessionId)
            ElMessage.success('已创建新会话')
          },
          onOutput: () => {},
          onDone: () => {},
          onError: (error) => {
            ElMessage.error(`创建会话失败: ${error}`)
          }
        }
      )

      if (!newSessionId) {
        await sessionStore.loadSessions()
      }

      return newSessionId
    } catch (error) {
      ElMessage.error('创建会话失败')
      return null
    }
  }

  /**
   * 切换会话
   */
  function switchSession(sessionId: string) {
    sessionStore.setCurrentSession(sessionId)
  }

  /**
   * 归档会话
   */
  async function archiveSession(sessionId: string) {
    try {
      await ElMessageBox.confirm('确定要归档此会话吗？', '提示', {
        type: 'warning'
      })
      await sessionStore.closeSession(sessionId)
      await sessionStore.archiveSession(sessionId)
      ElMessage.success('归档成功')
    } catch {
      // User cancelled
    }
  }

  /**
   * 删除会话
   */
  async function deleteSession(sessionId: string) {
    try {
      await ElMessageBox.confirm('确定要删除此会话吗？此操作不可恢复。', '警告', {
        type: 'error'
      })
      await sessionStore.closeSession(sessionId)
      await sessionStore.deleteSession(sessionId)
      ElMessage.success('删除成功')
    } catch {
      // User cancelled
    }
  }

  /**
   * 导出会话
   */
  async function exportSession(sessionId: string, format: 'markdown' | 'json' = 'markdown') {
    await sessionStore.exportSession(sessionId, format)
  }

  return {
    searchKeyword,
    listCollapsed,
    filteredActiveSessions,
    filteredArchivedSessions,
    createNewSession,
    switchSession,
    archiveSession,
    deleteSession,
    exportSession
  }
}
```

**Step 2: Commit useSessionManager**

```bash
git add src/views/claude-session/composables/useSessionManager.ts
git commit -m "feat: add useSessionManager composable"
```

---

## Phase 3: Core Components

### Task 10: Create ChatContainer Component

**Files:**
- Create: `src/views/claude-session/components/ChatContainer.vue`

**Step 1: Create ChatContainer.vue**

```vue
<template>
  <div class="chat-container">
    <!-- Message List -->
    <div class="message-area" ref="messageAreaRef">
      <BubbleList
        ref="bubbleListRef"
        :list="messageList"
        class="bubble-list"
      />
      <!-- Streaming indicator -->
      <div v-if="isStreaming" class="streaming-indicator">
        <span class="streaming-cursor">▋</span>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <Sender
        ref="senderRef"
        v-model="inputText"
        :disabled="isStreaming"
        :loading="isStreaming"
        :file-upload-enabled="true"
        :allowed-file-types="allowedFileTypes"
        :trigger-strings="['/', '@']"
        :actions="quickActions"
        placeholder="输入问题或指令，/ 唤起工具列表..."
        @send="handleSend"
        @file-upload="handleFileUpload"
        @trigger="handleTrigger"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { BubbleList, Sender } from 'vue-element-plus-x'
import type { BubbleListItem, SenderAction } from 'vue-element-plus-x'
import { ElMessage } from 'element-plus'

// Props
const props = defineProps<{
  sessionId: string | null
  messages: BubbleListItem[]
  isStreaming: boolean
}>()

// Emits
const emit = defineEmits<{
  send: [content: string]
  fileUpload: [file: File]
}>()

// Refs
const messageAreaRef = ref<HTMLElement | null>(null)
const bubbleListRef = ref<InstanceType<typeof BubbleList> | null>(null)
const senderRef = ref<InstanceType<typeof Sender> | null>(null)
const inputText = ref('')

// Quick actions configuration
const quickActions: SenderAction[] = [
  {
    key: 'code-review',
    name: '代码审查',
    icon: 'Search',
    onClick: () => {
      inputText.value = '请帮我审查当前项目的代码质量，重点检查 TypeScript 类型定义与 Vue 组件的响应式逻辑'
    }
  },
  {
    key: 'explain',
    name: '代码解释',
    icon: 'Document',
    onClick: () => {
      inputText.value = '请解释这段代码的业务逻辑与实现思路'
    }
  },
  {
    key: 'fix-bug',
    name: 'Bug 分析',
    icon: 'Warning',
    onClick: () => {
      inputText.value = '请帮我分析这个问题并提供修复建议'
    }
  },
  {
    key: 'generate-test',
    name: '生成测试',
    icon: 'DocumentChecked',
    onClick: () => {
      inputText.value = '请为这段代码生成单元测试'
    }
  }
]

// Allowed file types
const allowedFileTypes = [
  '.java', '.ts', '.js', '.vue', '.json',
  '.xml', '.yml', '.yaml', '.md', '.txt',
  '.sql', '.py', '.go'
]

// Computed message list
const messageList = ref<BubbleListItem[]>([])

// Watch for message changes
watch(() => props.messages, (newMessages) => {
  messageList.value = newMessages
  scrollToBottom()
}, { deep: true })

// Handle send
function handleSend() {
  if (!inputText.value.trim()) return
  emit('send', inputText.value.trim())
  inputText.value = ''
}

// Handle file upload
async function handleFileUpload(file: File) {
  emit('fileUpload', file)
}

// Handle trigger (e.g., '/' command)
function handleTrigger(trigger: string) {
  console.log('Trigger:', trigger)
}

// Scroll to bottom
function scrollToBottom() {
  nextTick(() => {
    if (messageAreaRef.value) {
      messageAreaRef.value.scrollTop = messageAreaRef.value.scrollHeight
    }
  })
}

// Focus input on mount
onMounted(() => {
  nextTick(() => {
    if (senderRef.value) {
      // Focus the sender input
    }
  })
})

// Expose methods
defineExpose({
  scrollToBottom
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.message-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.bubble-list {
  width: 100%;
}

.streaming-indicator {
  padding: 8px 16px;
  text-align: left;
}

.streaming-cursor {
  display: inline-block;
  animation: blink 1s infinite;
  font-size: 14px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.input-area {
  padding: 16px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
}
</style>
```

**Step 2: Commit ChatContainer**

```bash
git add src/views/claude-session/components/ChatContainer.vue
git commit -m "feat: add ChatContainer component with BubbleList and Sender"
```

---

### Task 11: Create SessionList Component

**Files:**
- Create: `src/views/claude-session/components/SessionList.vue`

**Step 1: Create SessionList.vue**

```vue
<template>
  <div class="session-list-panel" :class="{ collapsed: collapsed }">
    <div class="panel-header">
      <span v-if="!collapsed">会话列表</span>
      <el-button text @click="collapsed = !collapsed">
        <el-icon><component :is="collapsed ? 'DArrowRight' : 'DArrowLeft'" /></el-icon>
      </el-button>
    </div>

    <template v-if="!collapsed">
      <div class="session-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索会话"
          prefix-icon="Search"
          clearable
          size="small"
        />
        <el-button
          type="primary"
          size="small"
          style="margin-top: 8px; width: 100%;"
          @click="$emit('create')"
        >
          <el-icon><Plus /></el-icon>
          新建会话
        </el-button>
      </div>

      <div class="session-groups">
        <!-- Active Sessions -->
        <div class="session-group">
          <div class="group-header" @click="toggleGroup('active')">
            <el-icon><FolderOpened v-if="expandedGroups.active" /><Folder v-else /></el-icon>
            <span>进行中 ({{ activeSessions.length }})</span>
          </div>
          <div v-show="expandedGroups.active" class="group-items">
            <div
              v-for="session in filteredActiveSessions"
              :key="session.id"
              class="session-item"
              :class="{ active: currentSessionId === session.id }"
              @click="$emit('select', session.id)"
            >
              <div class="session-title">{{ session.title || getDefaultTitle(session) }}</div>
              <div class="session-meta">{{ formatDate(session.createdAt) }}</div>
            </div>
          </div>
        </div>

        <!-- Archived Sessions -->
        <div class="session-group">
          <div class="group-header" @click="toggleGroup('archived')">
            <el-icon><FolderOpened v-if="expandedGroups.archived" /><Folder v-else /></el-icon>
            <span>已归档 ({{ archivedSessions.length }})</span>
          </div>
          <div v-show="expandedGroups.archived" class="group-items">
            <div
              v-for="session in filteredArchivedSessions"
              :key="session.id"
              class="session-item"
              :class="{ active: currentSessionId === session.id }"
              @click="$emit('select', session.id)"
            >
              <div class="session-title">{{ session.title || getDefaultTitle(session) }}</div>
              <div class="session-meta">{{ formatDate(session.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Folder, FolderOpened, Plus, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import type { Session } from '@/types/session'
import { SCENE_NAMES } from '@/types/session'

// Props
const props = defineProps<{
  currentSessionId: string | null
  activeSessions: Session[]
  archivedSessions: Session[]
}>()

// Emits
defineEmits<{
  create: []
  select: [sessionId: string]
}>()

// State
const collapsed = ref(false)
const searchKeyword = ref('')
const expandedGroups = ref({ active: true, archived: false })

// Computed
const filteredActiveSessions = computed(() => {
  const keyword = searchKeyword.value.toLowerCase()
  return props.activeSessions.filter(s =>
    (s.title || '').toLowerCase().includes(keyword) ||
    s.scene.toLowerCase().includes(keyword)
  )
})

const filteredArchivedSessions = computed(() => {
  const keyword = searchKeyword.value.toLowerCase()
  return props.archivedSessions.filter(s =>
    (s.title || '').toLowerCase().includes(keyword) ||
    s.scene.toLowerCase().includes(keyword)
  )
})

// Methods
function toggleGroup(group: 'active' | 'archived') {
  expandedGroups.value[group] = !expandedGroups.value[group]
}

function getDefaultTitle(session: Session): string {
  return `${SCENE_NAMES[session.scene]} - ${formatDate(session.createdAt)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.session-list-panel {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
}

.session-list-panel.collapsed {
  width: 50px;
}

.panel-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;
}

.session-actions {
  padding: 12px 16px;
}

.session-groups {
  flex: 1;
  overflow-y: auto;
}

.session-group {
  margin-bottom: 8px;
}

.group-header {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #606266;
}

.group-header:hover {
  background: #f5f7fa;
}

.group-items {
  padding: 0 8px;
}

.session-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
}

.session-item:hover {
  background: #ecf5ff;
}

.session-item.active {
  background: #409eff;
  color: #fff;
}

.session-item.active .session-meta {
  color: rgba(255, 255, 255, 0.8);
}

.session-title {
  font-size: 14px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-meta {
  font-size: 12px;
  color: #909399;
}
</style>
```

**Step 2: Commit SessionList**

```bash
git add src/views/claude-session/components/SessionList.vue
git commit -m "feat: add SessionList component"
```

---

### Task 12: Create FileUploader Component

**Files:**
- Create: `src/views/claude-session/components/FileUploader.vue`

**Step 1: Create FileUploader.vue**

```vue
<template>
  <!-- This component is used as a utility, no template needed -->
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const allowedFileTypes = [
  '.java', '.ts', '.js', '.vue', '.json',
  '.xml', '.yml', '.yaml', '.md', '.txt',
  '.sql', '.py', '.go'
]

/**
 * Read file content
 */
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      resolve(content || '')
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Handle file upload
 */
async function handleFileUpload(file: File): Promise<string | null> {
  try {
    // Check file type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedFileTypes.includes(ext)) {
      ElMessage.warning(`不支持的文件类型: ${ext}`)
      return null
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.warning('文件大小不能超过 10MB')
      return null
    }

    // Read file content
    const content = await readFileContent(file)

    // Generate prompt
    const prompt = `请分析文件 "${file.name}"：

\`\`\`
${content.slice(0, 3000)}${content.length > 3000 ? '\n... (内容已截断)' : ''}
\`\`\`
`

    ElMessage.success('文件已加载，请输入具体问题')
    return prompt
  } catch (error) {
    ElMessage.error('读取文件失败')
    return null
  }
}

defineExpose({
  allowedFileTypes,
  handleFileUpload
})
</script>
```

**Step 2: Commit FileUploader**

```bash
git add src/views/claude-session/components/FileUploader.vue
git commit -m "feat: add FileUploader component"
```

---

## Phase 4: Main Component Integration

### Task 13: Create ClaudeSessionNew.vue Main Component

**Files:**
- Create: `src/views/claude-session/ClaudeSessionNew.vue`

**Step 1: Create ClaudeSessionNew.vue**

```vue
<template>
  <div class="claude-session-new">
    <!-- Session List Sidebar -->
    <SessionList
      :current-session-id="sessionStore.currentSessionId"
      :active-sessions="sessionStore.activeSessions"
      :archived-sessions="sessionStore.archivedSessions"
      @create="handleCreateSession"
      @select="handleSelectSession"
    />

    <!-- Main Chat Area -->
    <div class="main-area">
      <template v-if="sessionStore.currentSession">
        <!-- Header -->
        <div class="chat-header">
          <div class="session-info">
            <h3>{{ sessionStore.currentSession.title || '新会话' }}</h3>
            <el-tag size="small">{{ getSceneName(sessionStore.currentSession.scene) }}</el-tag>
          </div>
          <div class="session-actions">
            <el-button size="small" @click="handleExport">导出</el-button>
            <el-button size="small" @click="handleArchive">归档</el-button>
            <el-button size="small" type="danger" @click="handleDelete">删除</el-button>
          </div>
        </div>

        <!-- Chat Container -->
        <ChatContainer
          :session-id="sessionStore.currentSessionId"
          :messages="bubbleMessages"
          :is-streaming="isStreaming"
          @send="handleSend"
          @file-upload="handleFileUpload"
          ref="chatContainerRef"
        />
      </template>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <el-empty description="选择一个会话或点击左侧「新建会话」开始" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import SessionList from './components/SessionList.vue'
import ChatContainer from './components/ChatContainer.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { useAppStore } from '@/stores/app'
import { claudeApi } from '@/api/claude'
import { SCENE_NAMES, type SceneType } from '@/types/session'
import type { BubbleListItem } from 'vue-element-plus-x'

// Stores
const sessionStore = useSessionStore()
const appStore = useAppStore()

// Refs
const chatContainerRef = ref<InstanceType<typeof ChatContainer> | null>(null)
const isStreaming = ref(false)
const currentStreamingContent = ref('')

// Computed
const bubbleMessages = computed<BubbleListItem[]>(() => {
  const messages = sessionStore.messages
  const result: BubbleListItem[] = messages.map(msg => ({
    key: msg.id.toString(),
    role: msg.role,
    content: msg.content
  }))

  // Add streaming message if active
  if (isStreaming.value && currentStreamingContent.value) {
    result.push({
      key: 'streaming',
      role: 'assistant',
      content: currentStreamingContent.value
    })
  }

  return result
})

// Methods
function getSceneName(scene: SceneType): string {
  return SCENE_NAMES[scene]
}

async function handleCreateSession() {
  if (!appStore.projectSelected) {
    ElMessage.warning('请先选择一个项目')
    return
  }

  isStreaming.value = true
  currentStreamingContent.value = ''

  try {
    let newSessionId = ''

    await claudeApi.universalChat(
      {
        prompt: '你好，请问我有什么可以帮助你的？',
        scene: 'free-chat',
        metadata: { projectName: appStore.selectedProject },
        workingDirectory: appStore.projectDir
      },
      {
        onSession: async (sessionId) => {
          newSessionId = sessionId
          await sessionStore.loadSessions()
          sessionStore.setCurrentSession(sessionId)
          ElMessage.success('已创建新会话')
        },
        onOutput: (content) => {
          currentStreamingContent.value += content
        },
        onDone: () => {
          isStreaming.value = false
          // Save the message
          if (newSessionId && currentStreamingContent.value) {
            sessionStore.addMessageToSession(newSessionId, {
              id: Date.now(),
              sessionId: newSessionId,
              role: 'assistant',
              content: currentStreamingContent.value,
              createdAt: new Date().toISOString()
            })
          }
          currentStreamingContent.value = ''
        },
        onError: (error) => {
          isStreaming.value = false
          currentStreamingContent.value = ''
          ElMessage.error(`创建会话失败: ${error}`)
        }
      }
    )
  } catch (error) {
    isStreaming.value = false
    ElMessage.error('创建会话失败')
  }
}

function handleSelectSession(sessionId: string) {
  sessionStore.setCurrentSession(sessionId)
}

async function handleSend(content: string) {
  if (!sessionStore.currentSessionId) return

  const sessionId = sessionStore.currentSessionId

  // Add user message
  sessionStore.addMessageToSession(sessionId, {
    id: Date.now(),
    sessionId,
    role: 'user',
    content,
    createdAt: new Date().toISOString()
  })

  isStreaming.value = true
  currentStreamingContent.value = ''

  try {
    await claudeApi.universalChat(
      {
        sessionId,
        prompt: content,
        scene: 'free-chat'
      },
      {
        onOutput: (chunk) => {
          currentStreamingContent.value += chunk
        },
        onDone: () => {
          isStreaming.value = false
          // Save assistant message
          sessionStore.addMessageToSession(sessionId, {
            id: Date.now() + 1,
            sessionId,
            role: 'assistant',
            content: currentStreamingContent.value,
            createdAt: new Date().toISOString()
          })
          currentStreamingContent.value = ''
        },
        onError: (error) => {
          isStreaming.value = false
          currentStreamingContent.value = ''
          ElMessage.error(`发送失败: ${error}`)
        }
      }
    )
  } catch (error) {
    isStreaming.value = false
    ElMessage.error('发送失败')
  }
}

async function handleFileUpload(file: File) {
  // Read file content
  const reader = new FileReader()
  reader.onload = async (e) => {
    const content = e.target?.result as string
    if (!content) return

    // Generate prompt
    const prompt = `请分析文件 "${file.name}"：\n\n\`\`\`\n${content.slice(0, 3000)}${content.length > 3000 ? '\n... (内容已截断)' : ''}\n\`\`\`\n`

    ElMessage.success('文件已加载')

    // Set the prompt in input
    // Note: We need to emit to ChatContainer to set inputText
    // For now, just send the prompt
    if (sessionStore.currentSessionId) {
      await handleSend(prompt)
    }
  }
  reader.readAsText(file)
}

async function handleExport() {
  if (sessionStore.currentSessionId) {
    await sessionStore.exportSession(sessionStore.currentSessionId, 'markdown')
  }
}

async function handleArchive() {
  if (!sessionStore.currentSessionId) return
  try {
    await sessionStore.closeSession(sessionStore.currentSessionId)
    await sessionStore.archiveSession(sessionStore.currentSessionId)
    ElMessage.success('归档成功')
  } catch {
    ElMessage.error('归档失败')
  }
}

async function handleDelete() {
  if (!sessionStore.currentSessionId) return
  try {
    await sessionStore.closeSession(sessionStore.currentSessionId)
    await sessionStore.deleteSession(sessionStore.currentSessionId)
    ElMessage.success('删除成功')
  } catch {
    ElMessage.error('删除失败')
  }
}

// Lifecycle
onMounted(() => {
  sessionStore.loadSessions()
})
</script>

<style scoped>
.claude-session-new {
  display: flex;
  height: 100%;
  background: #f5f7fa;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.session-info h3 {
  margin: 0;
  font-size: 16px;
}

.session-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

**Step 2: Commit ClaudeSessionNew**

```bash
git add src/views/claude-session/ClaudeSessionNew.vue
git commit -m "feat: add ClaudeSessionNew main component"
```

---

## Phase 5: Router and Style Updates

### Task 14: Update Router to Use New Component

**Files:**
- Modify: `src/router/index.ts`

**Step 1: Update the ClaudeSession route**

Change line 37 from:
```typescript
component: () => import('@/views/claude-session/ClaudeSession.vue'),
```

To:
```typescript
component: () => import('@/views/claude-session/ClaudeSessionNew.vue'),
```

**Step 2: Verify the change**

Run:
```bash
grep -n "ClaudeSession" src/router/index.ts
```

Expected: Shows `ClaudeSessionNew.vue` in the route

**Step 3: Commit router change**

```bash
git add src/router/index.ts
git commit -m "feat: switch to ClaudeSessionNew component"
```

---

### Task 15: Add Global Styles

**Files:**
- Create: `src/styles/claude-chat.scss`

**Step 1: Create claude-chat.scss**

```scss
// Claude Chat Styles

// Theme variables
:root {
  --chat-primary: #409eff;
  --chat-bg: #f5f7fa;
  --chat-message-user: #409eff;
  --chat-message-ai: #ffffff;
  --chat-border: #e4e7ed;
}

// Bubble styles
.x-bubble-list {
  .x-bubble {
    max-width: 80%;
    margin-bottom: 16px;

    &.x-bubble-user {
      background: var(--chat-message-user);
      color: #fff;
      border-radius: 16px 16px 4px 16px;
    }

    &.x-bubble-assistant {
      background: var(--chat-message-ai);
      border: 1px solid var(--chat-border);
      border-radius: 16px 16px 16px 4px;
    }
  }
}

// Code block styles
pre[class*="language-"] {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 8px 0;

  code {
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    color: #d4d4d4;
  }
}

// Inline code
code:not([class*="language-"]) {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
}

// Sender styles
.x-sender {
  border: 1px solid var(--chat-border);
  border-radius: 12px;
  overflow: hidden;

  .x-sender-textarea {
    min-height: 60px;
    padding: 12px;
    font-size: 14px;
    line-height: 1.6;
    resize: none;
    border: none;
    outline: none;
  }
}

// Streaming cursor animation
.streaming-cursor {
  display: inline-block;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// Dark mode support (optional)
@media (prefers-color-scheme: dark) {
  :root {
    --chat-bg: #1a1a1a;
    --chat-message-ai: #2a2a2a;
    --chat-border: #404040;
  }
}
```

**Step 2: Import styles in main.ts**

Add import to `src/main.ts`:
```typescript
import './styles/claude-chat.scss'
```

**Step 3: Commit styles**

```bash
git add src/styles/claude-chat.scss src/main.ts
git commit -m "feat: add claude chat styles"
```

---

## Phase 6: Testing and Cleanup

### Task 16: Test the Implementation

**Step 1: Start the development server**

Run:
```bash
npm run dev
```

**Step 2: Open browser**

Navigate to `http://localhost:5173/claude-session`

**Step 3: Verify functionality**

Check each item:
- [ ] Session list loads correctly
- [ ] "新建会话" button creates a new session
- [ ] Messages send and receive correctly
- [ ] Streaming text appears with typewriter effect
- [ ] Quick action buttons work
- [ ] File upload works
- [ ] Session export/archive/delete works

**Step 4: Check for console errors**

Open browser DevTools (F12) and check Console tab for errors.

Expected: No errors

---

### Task 17: Final Commit and Push

**Step 1: Review all changes**

Run:
```bash
git status
```

Expected: No unstaged changes

**Step 2: Push to remote**

Run:
```bash
git push -u origin feature/claude-session-refactor
```

Expected: Branch pushed successfully

---

## Summary

**Files Created:**
- `src/views/claude-session/ClaudeSessionNew.vue`
- `src/views/claude-session/components/ChatContainer.vue`
- `src/views/claude-session/components/SessionList.vue`
- `src/views/claude-session/components/QuickActions.vue`
- `src/views/claude-session/components/FileUploader.vue`
- `src/views/claude-session/composables/useClaudeChat.ts`
- `src/views/claude-session/composables/useSessionManager.ts`
- `src/views/claude-session/types/chat.types.ts`
- `src/styles/claude-chat.scss`

**Files Modified:**
- `package.json` (added dependencies)
- `vite.config.ts` (added plugins)
- `tsconfig.json` (added types)
- `src/router/index.ts` (updated route)
- `src/main.ts` (added style import)

**Dependencies Added:**
- vue-element-plus-x
- unplugin-auto-import
- unplugin-vue-components