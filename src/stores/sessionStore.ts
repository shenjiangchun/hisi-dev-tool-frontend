import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session, Message, SessionStatus } from '@/types/session'
import { sessionApi } from '@/api/session'

export const useSessionStore = defineStore('session', () => {
  // 状态
  const sessions = ref<Session[]>([])
  const currentSessionId = ref<string | null>(null)
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const total = ref(0)

  // 计算属性
  const currentSession = computed(() =>
    sessions.value.find(s => s.id === currentSessionId.value) || null
  )

  const activeSessions = computed(() =>
    sessions.value.filter(s => s.status === 'active')
  )

  const archivedSessions = computed(() =>
    sessions.value.filter(s => s.status === 'archived')
  )

  // Actions

  /**
   * 加载会话列表
   */
  async function loadSessions(status?: SessionStatus, page = 1, pageSize = 20) {
    loading.value = true
    try {
      const response = await sessionApi.list({ status, page, pageSize })
      sessions.value = response.data.list
      total.value = response.data.total
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载会话详情
   */
  async function loadSessionDetail(sessionId: string) {
    loading.value = true
    try {
      const response = await sessionApi.get(sessionId)
      // 更新或添加会话
      const index = sessions.value.findIndex(s => s.id === sessionId)
      if (index >= 0) {
        sessions.value[index] = response.data.session
      } else {
        sessions.value.unshift(response.data.session)
      }
      currentSessionId.value = sessionId
      messages.value = response.data.messages
    } catch (error) {
      console.error('Failed to load session detail:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置当前会话
   */
  function setCurrentSession(sessionId: string | null) {
    currentSessionId.value = sessionId
    if (sessionId) {
      loadSessionDetail(sessionId)
    } else {
      messages.value = []
    }
  }

  /**
   * 添加消息
   */
  function addMessage(message: Message) {
    messages.value.push(message)
  }

  /**
   * 清空当前会话消息
   */
  function clearCurrentMessages() {
    messages.value = []
  }

  /**
   * 更新会话标题
   */
  async function updateSessionTitle(sessionId: string, title: string) {
    try {
      await sessionApi.update(sessionId, { title })
      const session = sessions.value.find(s => s.id === sessionId)
      if (session) {
        session.title = title
      }
    } catch (error) {
      console.error('Failed to update session title:', error)
    }
  }

  /**
   * 归档会话
   */
  async function archiveSession(sessionId: string) {
    try {
      await sessionApi.archive(sessionId)
      const session = sessions.value.find(s => s.id === sessionId)
      if (session) {
        session.status = 'archived'
      }
    } catch (error) {
      console.error('Failed to archive session:', error)
    }
  }

  /**
   * 删除会话
   */
  async function deleteSession(sessionId: string) {
    try {
      await sessionApi.delete(sessionId)
      sessions.value = sessions.value.filter(s => s.id !== sessionId)
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
        messages.value = []
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  /**
   * 清除会话历史
   */
  async function clearSessionMessages(sessionId: string) {
    try {
      await sessionApi.clearMessages(sessionId)
      if (currentSessionId.value === sessionId) {
        messages.value = []
      }
    } catch (error) {
      console.error('Failed to clear messages:', error)
    }
  }

  /**
   * 导出会话
   */
  async function exportSession(sessionId: string, format: 'markdown' | 'json' = 'markdown') {
    try {
      const response = await sessionApi.export(sessionId, format)
      const blob = new Blob([response.data], {
        type: format === 'json' ? 'application/json' : 'text/markdown'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `session-${sessionId}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export session:', error)
    }
  }

  return {
    // 状态
    sessions,
    currentSessionId,
    messages,
    loading,
    total,
    // 计算属性
    currentSession,
    activeSessions,
    archivedSessions,
    // Actions
    loadSessions,
    loadSessionDetail,
    setCurrentSession,
    addMessage,
    clearCurrentMessages,
    updateSessionTitle,
    archiveSession,
    deleteSession,
    clearSessionMessages,
    exportSession
  }
})
