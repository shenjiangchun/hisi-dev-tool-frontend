import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ClaudeWorkspaceSession } from '@/types/terminal'
import { workspaceSessionApi } from '@/api/workspaceSession'
import { ElMessage } from 'element-plus'

export const useWorkspaceStore = defineStore('workspace', () => {
  // State
  const sessions = ref<ClaudeWorkspaceSession[]>([])
  const currentSessionId = ref<string | null>(null)
  const loading = ref(false)

  // Getters
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
  async function loadSessions(status?: string) {
    loading.value = true
    try {
      const res = await workspaceSessionApi.list(status)
      sessions.value = res.data || []
    } catch (e) {
      console.error('Failed to load sessions:', e)
    } finally {
      loading.value = false
    }
  }

  async function createSession(scene?: string, initialPrompt?: string, workingDirectory?: string) {
    try {
      const res = await workspaceSessionApi.create({ scene, initialPrompt, workingDirectory })
      sessions.value.unshift(res.data)
      currentSessionId.value = res.data.id
      return res.data
    } catch (e) {
      ElMessage.error('创建会话失败')
      throw e
    }
  }

  async function updateSession(id: string, title?: string, status?: string) {
    try {
      const res = await workspaceSessionApi.update(id, { title, status })
      const index = sessions.value.findIndex(s => s.id === id)
      if (index >= 0) {
        sessions.value[index] = res.data
      }
    } catch (e) {
      ElMessage.error('更新会话失败')
    }
  }

  async function deleteSession(id: string) {
    try {
      await workspaceSessionApi.delete(id)
      sessions.value = sessions.value.filter(s => s.id !== id)
      if (currentSessionId.value === id) {
        currentSessionId.value = null
      }
    } catch (e) {
      ElMessage.error('删除会话失败')
    }
  }

  async function archiveSession(id: string) {
    try {
      const res = await workspaceSessionApi.archive(id)
      const index = sessions.value.findIndex(s => s.id === id)
      if (index >= 0) {
        sessions.value[index] = res.data
      }
    } catch (e) {
      ElMessage.error('归档会话失败')
    }
  }

  async function bindClaudeSession(id: string, claudeSessionId: string) {
    try {
      const res = await workspaceSessionApi.bindClaudeSession(id, claudeSessionId)
      const index = sessions.value.findIndex(s => s.id === id)
      if (index >= 0) {
        sessions.value[index] = res.data
      }
    } catch (e) {
      console.error('Failed to bind Claude session:', e)
    }
  }

  function selectSession(id: string) {
    currentSessionId.value = id
  }

  return {
    // State
    sessions,
    currentSessionId,
    loading,
    // Getters
    currentSession,
    activeSessions,
    archivedSessions,
    // Actions
    loadSessions,
    createSession,
    updateSession,
    deleteSession,
    archiveSession,
    bindClaudeSession,
    selectSession
  }
})