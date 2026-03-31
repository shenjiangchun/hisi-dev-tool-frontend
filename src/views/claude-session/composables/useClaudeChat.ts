import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { ChatMessage } from '../types/chat.types'
import { claudeApi } from '@/api/claude'

export interface UseClaudeChatOptions {
  sessionId: Ref<string | null>
  onMessageSaved?: () => void
}

export function useClaudeChat(options: UseClaudeChatOptions) {
  const { sessionId, onMessageSaved } = options

  const messageList = ref<ChatMessage[]>([])
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
    const userMessage: ChatMessage = {
      key: `user-${Date.now()}`,
      role: 'user',
      content: content.trim()
    }
    messageList.value.push(userMessage)

    // 添加 AI 消息占位
    const aiMessage: ChatMessage = {
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