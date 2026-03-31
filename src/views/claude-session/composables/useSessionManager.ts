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