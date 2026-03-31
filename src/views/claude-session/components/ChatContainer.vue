<template>
  <div class="chat-container">
    <!-- Message Area -->
    <div class="message-area" ref="messageAreaRef">
      <!-- Welcome state when no messages -->
      <Welcome
        v-if="messages.length === 0"
        title="HiSi DevTool Claude Assistant"
        description="选择一个快捷操作开始对话，或输入您的问题"
        variant="borderless"
      />

      <!-- Bubble List for messages -->
      <BubbleList
        v-else
        ref="bubbleListRef"
        :list="messages"
        :auto-scroll="true"
        :max-height="messageAreaHeight"
      />

      <!-- Streaming Indicator -->
      <div v-if="isStreaming" class="streaming-indicator">
        <span class="streaming-cursor"></span>
      </div>
    </div>

    <!-- Quick Actions (shown when no messages or collapsed) -->
    <div v-if="showQuickActions" class="quick-actions-area">
      <Prompts
        title="快捷操作"
        :items="quickActionItems"
        wrap
        @item-click="handleQuickAction"
      />
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <Sender
        ref="senderRef"
        v-model="inputValue"
        placeholder="输入消息... (Ctrl+Enter 发送)"
        :loading="isStreaming"
        :disabled="!sessionId"
        :auto-size="{ minRows: 2, maxRows: 6 }"
        :trigger-strings="triggerStrings"
        clearable
        @submit="handleSend"
        @paste-file="handleFilePaste"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { BubbleList, Sender, Welcome, Prompts, type BubbleListItem, type PromptsItemsProps } from 'vue-element-plus-x'
import { ElMessage } from 'element-plus'
import { Search, Document, Warning, DocumentChecked } from '@element-plus/icons-vue'
import { h } from 'vue'

// Props
interface Props {
  sessionId: string | null
  messages: BubbleListItem[]
  isStreaming: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  send: [content: string]
  fileUpload: [file: File]
}>()

// Refs
const messageAreaRef = ref<HTMLElement | null>(null)
const bubbleListRef = ref<{ scrollToBottom: () => void } | null>(null)
const senderRef = ref<{ focus: () => void; clear: () => void } | null>(null)
const inputValue = ref('')
const messageAreaHeight = ref('100%')

// Trigger strings for mention/command support
const triggerStrings = ['/', '@']

// Allowed file types for upload
const allowedFileTypes = [
  '.java', '.ts', '.js', '.vue', '.json',
  '.xml', '.yml', '.yaml', '.md', '.txt',
  '.sql', '.py', '.go'
]

// Show quick actions when no messages
const showQuickActions = computed(() => props.messages.length === 0)

// Quick action items configuration
const quickActionItems: PromptsItemsProps[] = [
  {
    key: 'code-review',
    label: '代码审查',
    icon: h(Search),
    description: '检查代码质量与潜在问题'
  },
  {
    key: 'explain',
    label: '代码解释',
    icon: h(Document),
    description: '解释代码的业务逻辑与实现'
  },
  {
    key: 'fix-bug',
    label: 'Bug 分析',
    icon: h(Warning),
    description: '分析问题并提供修复建议'
  },
  {
    key: 'generate-test',
    label: '生成测试',
    icon: h(DocumentChecked),
    description: '为代码生成单元测试'
  }
]

// Quick action prompts mapping
const quickActionPrompts: Record<string, string> = {
  'code-review': '请帮我审查当前项目的代码质量，重点检查 TypeScript 类型定义与 Vue 组件的响应式逻辑',
  'explain': '请解释这段代码的业务逻辑与实现思路',
  'fix-bug': '请帮我分析这个问题并提供修复建议',
  'generate-test': '请为这段代码生成单元测试'
}

/**
 * Handle quick action click
 */
function handleQuickAction(item: PromptsItemsProps) {
  const prompt = quickActionPrompts[item.key as string]
  if (prompt) {
    handleSend(prompt)
  }
}

/**
 * Handle send message
 */
function handleSend(content: string) {
  if (!content.trim()) {
    return
  }
  if (!props.sessionId) {
    ElMessage.warning('请先选择或创建一个会话')
    return
  }

  emit('send', content.trim())
  inputValue.value = ''
}

/**
 * Handle file paste event
 */
function handleFilePaste(file: File, fileList: FileList) {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!allowedFileTypes.includes(ext)) {
    ElMessage.warning(`不支持的文件类型: ${ext}`)
    return
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过 10MB')
    return
  }

  emit('fileUpload', file)
}

/**
 * Scroll to bottom when messages update
 */
function scrollToBottom() {
  nextTick(() => {
    if (bubbleListRef.value?.scrollToBottom) {
      bubbleListRef.value.scrollToBottom()
    } else if (messageAreaRef.value) {
      messageAreaRef.value.scrollTop = messageAreaRef.value.scrollHeight
    }
  })
}

/**
 * Update message area height
 */
function updateMessageAreaHeight() {
  if (messageAreaRef.value) {
    const parentHeight = messageAreaRef.value.parentElement?.clientHeight || 0
    const inputAreaHeight = 80 // Approximate input area height
    messageAreaHeight.value = `${parentHeight - inputAreaHeight}px`
  }
}

// Watch for message changes and auto-scroll
watch(
  () => props.messages,
  () => {
    scrollToBottom()
  },
  { deep: true }
)

// Watch for streaming state changes
watch(
  () => props.isStreaming,
  (streaming) => {
    if (streaming) {
      scrollToBottom()
    }
  }
)

// Lifecycle hooks
onMounted(() => {
  updateMessageAreaHeight()
  window.addEventListener('resize', updateMessageAreaHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMessageAreaHeight)
})

// Expose methods for parent component
defineExpose({
  focusInput: () => senderRef.value?.focus(),
  clearInput: () => senderRef.value?.clear(),
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

.quick-actions-area {
  padding: 16px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 8px;
  margin-top: 8px;
}

.streaming-cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: #409eff;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.input-area {
  padding: 16px;
  background: white;
  border-top: 1px solid #e4e7ed;
}
</style>