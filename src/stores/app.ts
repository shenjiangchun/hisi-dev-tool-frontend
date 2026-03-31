import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { configApi } from '@/api/config'

export const useAppStore = defineStore('app', () => {
  // State
  const projectDir = ref<string>('')
  const projectDirConfigured = computed(() => projectDir.value.trim() !== '')
  const selectedProject = ref<string>('')
  const projectSelected = computed(() => selectedProject.value.trim() !== '')

  // Config loading state
  const configLoading = ref(false)
  const configError = ref<string>('')

  // Menu availability - requires project selection for analysis features
  const availableMenus = computed(() => ({
    'project-management': true, // Always available
    'mcp-guide': true, // Always available
    'claude-terminal': true, // Always available
    'call-chain': projectDirConfigured.value && projectSelected.value,
    'log-analysis': projectDirConfigured.value && projectSelected.value,
    'prompt-config': true, // 提示词配置始终可用
    'ops': false // Permanently disabled - no local monitoring capability
  }))

  // Actions
  async function loadProjectDir() {
    configLoading.value = true
    configError.value = ''

    try {
      const response = await configApi.getProjectDir()
      if (response.data) {
        projectDir.value = response.data.value || ''
      }
    } catch (e: any) {
      configError.value = e.message || 'Failed to load configuration'
    } finally {
      configLoading.value = false
    }
  }

  async function updateProjectDir(newPath: string) {
    try {
      await configApi.updateProjectDir(newPath)
      projectDir.value = newPath
      return true
    } catch (e: any) {
      configError.value = e.message || 'Failed to update configuration'
      return false
    }
  }

  function selectProject(project: string) {
    selectedProject.value = project
  }

  function clearSelectedProject() {
    selectedProject.value = ''
  }

  return {
    // State
    projectDir,
    projectDirConfigured,
    selectedProject,
    projectSelected,
    configLoading,
    configError,
    availableMenus,
    // Actions
    loadProjectDir,
    updateProjectDir,
    selectProject,
    clearSelectedProject
  }
})