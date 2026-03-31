<template>
  <div class="claude-session-new">
    <!-- Left Sidebar: Session List -->
    <SessionList
      :current-session-id="sessionStore.currentSessionId"
      :active-sessions="sessionStore.activeSessions"
      :archived-sessions="sessionStore.archivedSessions"
      @create="handleCreateSession"
      @select="handleSelectSession"
    />

    <!-- Right Main Area -->
    <div class="main-area">
      <!-- Header with session info and action buttons -->
      <template v-if="sessionStore.currentSession">
        <div class="session-header">
          <div class="session-info">
            <div class="session-title-row">
              <h2 class="session-title">
                {{ sessionStore.currentSession.title || getDefaultTitle(sessionStore.currentSession) }}
              </h2>
              <el-tag size="small" type="info">
                {{ getSceneName(sessionStore.currentSession.scene) }}
              </el-tag>
            </div>
            <div class="session-meta">
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ formatDateTime(sessionStore.currentSession.createdAt) }}
              </span>
              <span v-if="sessionStore.currentSession.workingDirectory" class="meta-item">
                <el-icon><FolderOpened /></el-icon>
                {{ sessionStore.currentSession.workingDirectory }}
              </span>
            </div>
          </div>
          <div class="session-actions">
            <el-button-group>
              <el-button size="small" @click="handleExport">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
              <el-button size="small" @click="handleArchive">
                <el-icon><FolderRemove /></el-icon>
                归档
              </el-button>
              <el-button size="small" type="danger" @click="handleDelete">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </div>
        </div>

        <!-- Chat Container -->
        <ChatContainer
          ref="chatContainerRef"
          :session-id="sessionStore.currentSessionId"
          :messages="chatMessages"
          :is-streaming="isStreaming"
          @send="handleSend"
          @file-upload="handleFileUpload"
        />
      </template>

      <!-- Empty State when no session selected -->
      <div v-else class="empty-state">
        <el-empty description="请选择一个会话或创建新会话开始对话">
          <el-button type="primary" @click="handleCreateSession">
            <el-icon><Plus /></el-icon>
            创建新会话
          </el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, FolderOpened, Download, FolderRemove, Delete, Plus } from '@element-plus/icons-vue'
import { useSessionStore } from '@/stores/sessionStore'
import { useAppStore } from '@/stores/app'
import { usePromptStore } from '@/stores/promptStore'
import { claudeApi } from '@/api/claude'
import { SCENE_NAMES, type SceneType, type Session, type Message } from '@/types/session'
import type { ChatMessage } from './types/chat.types'
import SessionList from './components/SessionList.vue'
import ChatContainer from './components/ChatContainer.vue'

// Stores
const route = useRoute()
const sessionStore = useSessionStore()
const appStore = useAppStore()
const promptStore = usePromptStore()

// Refs
const chatContainerRef = ref<{ focusInput: () => void; clearInput: () => void; scrollToBottom: () => void } | null>(null)
const isStreaming = ref(false)
const currentStreamingContent = ref('')

// Computed: Convert sessionStore.messages to ChatMessage format for ChatContainer
const chatMessages = computed<ChatMessage[]>(() => {
  const messages = sessionStore.messages.map((msg: Message) => ({
    key: msg.id.toString(),
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: msg.createdAt
  }))

  // If streaming, append the streaming content as a partial assistant message
  if (isStreaming.value && currentStreamingContent.value) {
    // Find if there's already an assistant message being streamed
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === '') {
      // Update the empty assistant message with streaming content
      lastMessage.content = currentStreamingContent.value
    } else {
      // Add a new streaming assistant message
      messages.push({
        key: `streaming-${Date.now()}`,
        role: 'assistant',
        content: currentStreamingContent.value,
        timestamp: new Date().toISOString()
      })
    }
  }

  return messages
})

// Computed: project name for prompt
const projectName = computed(() => appStore.selectedProject || '')

/**
 * Get default title for a session
 */
function getDefaultTitle(session: Session): string {
  return `${SCENE_NAMES[session.scene]} - ${formatDate(session.createdAt)}`
}

/**
 * Get scene display name
 */
function getSceneName(scene: SceneType): string {
  return SCENE_NAMES[scene] || scene
}

/**
 * Format date (short format)
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format date time (full format)
 */
function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Handle creating a new session
 */
async function handleCreateSession(): Promise<void> {
  if (!appStore.projectSelected) {
    ElMessage.warning('请先选择一个项目')
    return
  }

  try {
    // Load prompt templates
    await promptStore.loadTemplates()

    // Render the default prompt for free-chat scene
    const prompt = promptStore.render('free-chat', {
      projectName: projectName.value,
      projectPath: appStore.projectDir
    }) || `你好，我正在分析项目 ${projectName.value}，请问我有什么可以帮助你的？`

    let newSessionId = ''

    // Set streaming state
    isStreaming.value = true
    currentStreamingContent.value = ''

    await claudeApi.universalChat(
      {
        prompt,
        scene: 'free-chat',
        metadata: {
          projectName: projectName.value
        },
        workingDirectory: appStore.projectDir
      },
      {
        onSession: async (sessionId) => {
          newSessionId = sessionId
          // Set streaming session in store
          sessionStore.setStreamingSession(sessionId)
          // Refresh session list
          await sessionStore.loadSessions()
          // Switch to new session
          sessionStore.setCurrentSession(sessionId)
          ElMessage.success('已创建新会话')
          // Focus input
          nextTick(() => {
            chatContainerRef.value?.focusInput()
          })
        },
        onOutput: (content) => {
          if (newSessionId) {
            currentStreamingContent.value += content
            sessionStore.appendStreamingContent(newSessionId, content)
          }
        },
        onDone: () => {
          if (newSessionId) {
            // Save the assistant message
            const fullContent = sessionStore.getStreamingContent(newSessionId)
            sessionStore.addMessageToSession(newSessionId, {
              id: Date.now(),
              sessionId: newSessionId,
              role: 'assistant',
              content: fullContent,
              createdAt: new Date().toISOString()
            })
            // Clear streaming state
            sessionStore.clearStreamingContent(newSessionId)
          }
          isStreaming.value = false
          currentStreamingContent.value = ''
        },
        onError: (error) => {
          if (newSessionId) {
            sessionStore.clearStreamingContent(newSessionId)
          }
          isStreaming.value = false
          currentStreamingContent.value = ''
          ElMessage.error(`创建会话失败: ${error}`)
        }
      }
    )

    // Fallback if onSession was not called
    if (!newSessionId) {
      await sessionStore.loadSessions()
    }
  } catch (error) {
    isStreaming.value = false
    currentStreamingContent.value = ''
    ElMessage.error('创建会话失败')
  }
}

/**
 * Handle selecting a session
 */
async function handleSelectSession(sessionId: string): Promise<void> {
  // Use switchSession to properly handle session switching
  await sessionStore.switchSession(sessionId)
  // Focus input after switching
  nextTick(() => {
    chatContainerRef.value?.focusInput()
  })
}

/**
 * Handle sending a message
 */
async function handleSend(content: string): Promise<void> {
  if (!content.trim() || !sessionStore.currentSessionId) return

  const currentSessionId = sessionStore.currentSessionId
  const message = content.trim()

  // Add user message immediately
  sessionStore.addMessageToSession(currentSessionId, {
    id: Date.now(),
    sessionId: currentSessionId,
    role: 'user',
    content: message,
    createdAt: new Date().toISOString()
  })

  // Set streaming state
  isStreaming.value = true
  currentStreamingContent.value = ''
  sessionStore.setStreamingSession(currentSessionId)

  // Scroll to bottom
  nextTick(() => {
    chatContainerRef.value?.scrollToBottom()
  })

  try {
    await claudeApi.universalChat(
      {
        sessionId: currentSessionId,
        prompt: message,
        workingDirectory: appStore.projectDir
      },
      {
        onOutput: (chunk) => {
          currentStreamingContent.value += chunk
          sessionStore.appendStreamingContent(currentSessionId, chunk)
          // Auto-scroll on output
          nextTick(() => {
            chatContainerRef.value?.scrollToBottom()
          })
        },
        onDone: () => {
          // Save assistant message
          const fullContent = sessionStore.getStreamingContent(currentSessionId)
          sessionStore.addMessageToSession(currentSessionId, {
            id: Date.now() + 1,
            sessionId: currentSessionId,
            role: 'assistant',
            content: fullContent,
            createdAt: new Date().toISOString()
          })
          // Clear streaming state
          sessionStore.clearStreamingContent(currentSessionId)
          isStreaming.value = false
          currentStreamingContent.value = ''
        },
        onError: (error) => {
          sessionStore.clearStreamingContent(currentSessionId)
          isStreaming.value = false
          currentStreamingContent.value = ''
          ElMessage.error(`发送失败: ${error}`)
        }
      }
    )
  } catch (error) {
    sessionStore.clearStreamingContent(currentSessionId)
    isStreaming.value = false
    currentStreamingContent.value = ''
    ElMessage.error('发送消息失败')
  }
}

/**
 * Handle file upload - read file content and send as prompt
 */
async function handleFileUpload(file: File): Promise<void> {
  if (!sessionStore.currentSessionId) {
    ElMessage.warning('请先选择或创建一个会话')
    return
  }

  try {
    // Read file content
    const content = await readFileContent(file)

    // Construct prompt with file content
    const prompt = `请分析以下文件内容:\n\n文件名: ${file.name}\n\n${content}`

    // Send the prompt
    await handleSend(prompt)
  } catch (error) {
    ElMessage.error('读取文件失败')
  }
}

/**
 * Read file content as text
 */
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsText(file)
  })
}

/**
 * Handle export session
 */
async function handleExport(): Promise<void> {
  if (!sessionStore.currentSessionId) return

  try {
    await sessionStore.exportSession(sessionStore.currentSessionId, 'markdown')
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

/**
 * Handle archive session
 */
async function handleArchive(): Promise<void> {
  if (!sessionStore.currentSessionId) return

  try {
    await ElMessageBox.confirm('确定要归档此会话吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })

    // Close session first to save session code
    await sessionStore.closeSession(sessionStore.currentSessionId)
    // Archive the session
    await sessionStore.archiveSession(sessionStore.currentSessionId)
    ElMessage.success('归档成功')
  } catch {
    // User cancelled
  }
}

/**
 * Handle delete session
 */
async function handleDelete(): Promise<void> {
  if (!sessionStore.currentSessionId) return

  try {
    await ElMessageBox.confirm('确定要删除此会话吗？此操作不可恢复。', '警告', {
      type: 'error',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })

    // Close session first
    await sessionStore.closeSession(sessionStore.currentSessionId)
    // Delete the session
    await sessionStore.deleteSession(sessionStore.currentSessionId)
    ElMessage.success('删除成功')
  } catch {
    // User cancelled
  }
}

// Watch for route query parameter to auto-select session
watch(
  () => route.query.sessionId,
  (sessionId) => {
    if (sessionId) {
      sessionStore.setCurrentSession(sessionId as string)
    }
  },
  { immediate: true }
)

// Watch for streaming content changes to auto-scroll
watch(currentStreamingContent, () => {
  nextTick(() => {
    chatContainerRef.value?.scrollToBottom()
  })
})

// Initialize: load sessions on mount
onMounted(() => {
  sessionStore.loadSessions()
})
</script>

<style scoped>
.claude-session-new {
  display: flex;
  height: 100%;
  background: #f5f7fa;
  overflow: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.session-header {
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.session-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.session-actions {
  display: flex;
  align-items: center;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
</style>