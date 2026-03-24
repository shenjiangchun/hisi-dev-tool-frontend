<template>
  <div class="project-list">
    <!-- Project Directory Configuration -->
    <ProjectDirConfig />

    <!-- Guidance Prompts -->
    <el-alert
      v-if="!appStore.projectDirConfigured"
      title="请先配置项目目录"
      type="warning"
      show-icon
      :closable="false"
      class="guidance-alert"
    />
    <el-alert
      v-else-if="!appStore.projectSelected"
      title="请选择一个项目以开始分析"
      type="info"
      show-icon
      :closable="false"
      class="guidance-alert"
    />
    <el-alert
      v-else
      :title="`已选择项目: ${appStore.selectedProject}`"
      type="success"
      show-icon
      :closable="false"
      class="guidance-alert"
    />

    <el-card>
      <template #header>
        <div class="card-header">
          <span>项目管理</span>
          <div class="header-buttons">
            <el-button
              type="warning"
              @click="handleUpdateAll"
              :loading="updatingAll"
              :disabled="!appStore.projectDirConfigured"
            >
              <el-icon><Refresh /></el-icon>
              一键更新所有仓库
            </el-button>
            <el-button
              type="success"
              @click="handleScan"
              :loading="scanning"
              :disabled="!appStore.projectDirConfigured"
            >
              <el-icon><FolderOpened /></el-icon>
              扫描仓库
            </el-button>
            <el-button type="primary" @click="showCloneDialog = true">
              <el-icon><Plus /></el-icon>
              克隆项目
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="projects" v-loading="loading" stripe>
        <el-table-column prop="name" label="项目名称">
          <template #default="{ row }">
            <div class="project-name-cell">
              <span>{{ row.name }}</span>
              <el-tag v-if="appStore.selectedProject === row.name" type="success" size="small">
                已选择
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="branch" label="分支" width="100" />
        <el-table-column prop="remoteUrl" label="远程地址" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.remoteUrl || row.url || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row)">{{ getStatusText(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.source === 'scanned' ? 'primary' : 'info'" size="small">
              {{ row.source === 'scanned' ? '扫描' : '克隆' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="调用链状态" width="100" align="center">
          <template #default="{ row }">
            <div class="status-indicator">
              <span
                class="status-dot"
                :class="getTaskStatusClass(getProjectTaskStatus(row.name))"
                :title="getTaskStatusTooltip(getProjectTaskStatus(row.name))"
              ></span>
              <span class="status-text">{{ getTaskStatusText(getProjectTaskStatus(row.name)) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="lastCommitMessage" label="最近提交" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.lastCommitMessage">{{ row.lastCommitMessage }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="380">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              @click="handleSelect(row)"
              :disabled="!appStore.projectDirConfigured"
            >
              <el-icon><Select /></el-icon>
              选择
            </el-button>
            <el-button
              type="info"
              link
              @click="showCommitDialog(row)"
              :disabled="!appStore.projectDirConfigured"
            >
              <el-icon><Document /></el-icon>
              提交分析
            </el-button>
            <el-button
              type="warning"
              link
              @click="handleGenerateChain(row)"
              :loading="generatingProjects.has(row.name)"
              :disabled="!appStore.projectDirConfigured || isTaskRunning(getProjectTaskStatus(row.name))"
            >
              <el-icon><Connection /></el-icon>
              生成调用链
            </el-button>
            <GitOperations
              v-if="hasGit(row) && appStore.projectDirConfigured"
              :project-path="getProjectPath(row.name)"
            />
            <el-button type="primary" link @click="handlePull(row)">拉取</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Clone Dialog -->
    <el-dialog v-model="showCloneDialog" title="克隆项目" width="500px">
      <el-form :model="cloneForm" label-width="100px">
        <el-form-item label="仓库地址">
          <el-input v-model="cloneForm.url" placeholder="Git仓库URL" />
        </el-form-item>
        <el-form-item label="分支">
          <el-input v-model="cloneForm.branch" placeholder="默认: master" />
        </el-form-item>
        <el-form-item label="目录名">
          <el-input v-model="cloneForm.directory" placeholder="可选，默认使用仓库名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCloneDialog = false">取消</el-button>
        <el-button type="primary" @click="handleClone" :loading="cloning">克隆</el-button>
      </template>
    </el-dialog>

    <!-- Commit Analysis Dialog -->
    <el-dialog v-model="commitDialogVisible" title="提交代码分析" width="800px">
      <div v-if="commitsLoading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载提交列表...</span>
      </div>
      <div v-else>
        <div class="commit-header">
          <span>项目: {{ selectedProjectForCommit }}</span>
          <el-button type="primary" size="small" @click="loadCommits">刷新</el-button>
        </div>
        <el-table
          :data="commits"
          @selection-change="handleCommitSelection"
          max-height="400"
          v-loading="analysisLoading"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="commitId" label="Commit" width="100" />
          <el-table-column prop="shortMessage" label="提交信息" show-overflow-tooltip />
          <el-table-column prop="author" label="作者" width="120" />
          <el-table-column prop="date" label="时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.date) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="commitDialogVisible = false">取消</el-button>
        <el-button
          type="warning"
          @click="handleImpactAnalysis"
          :disabled="selectedCommits.length === 0"
          :loading="analysisLoading"
        >
          影响分析
        </el-button>
        <el-button
          type="primary"
          @click="handleCodeAnalysis"
          :disabled="selectedCommits.length === 0"
          :loading="analysisLoading"
        >
          提交代码分析
        </el-button>
      </template>
    </el-dialog>

    <!-- Update All Result Dialog -->
    <el-dialog v-model="updateResultVisible" title="一键更新结果" width="600px">
      <div class="update-result">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="总仓库数">{{ updateResult?.totalRepos || 0 }}</el-descriptions-item>
          <el-descriptions-item label="成功">{{ updateResult?.successCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="失败">{{ updateResult?.failCount || 0 }}</el-descriptions-item>
        </el-descriptions>
        <el-table :data="updateResult?.results || []" max-height="300" class="mt-4">
          <el-table-column prop="path" label="仓库路径" show-overflow-tooltip />
          <el-table-column prop="branch" label="分支" width="100" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'">
                {{ row.success ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="消息" show-overflow-tooltip />
        </el-table>
      </div>
      <template #footer>
        <el-button type="primary" @click="updateResultVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Select, FolderOpened, Connection, Document, Refresh, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { projectApi } from '@/api/project'
import { taskApi } from '@/api/task'
import { gitApi, type GitCommit, type UpdateAllResponse } from '@/api/git'
import { claudeApi } from '@/api/claude'
import { usePromptStore } from '@/stores/promptStore'
import type { CallChainTask } from '@/types/callchain'
import { useAppStore } from '@/stores/app'
import ProjectDirConfig from '@/components/ProjectDirConfig.vue'
import GitOperations from '@/components/GitOperations.vue'
import type { GitRepositoryInfo } from '@/types/callchain'

const router = useRouter()
const appStore = useAppStore()
const promptStore = usePromptStore()

const loading = ref(false)
const cloning = ref(false)
const scanning = ref(false)
const updatingAll = ref(false)
const showCloneDialog = ref(false)
const projects = ref<GitRepositoryInfo[]>([])

// Commit analysis state
const commitDialogVisible = ref(false)
const commitsLoading = ref(false)
const analysisLoading = ref(false)
const selectedProjectForCommit = ref('')
const commits = ref<GitCommit[]>([])
const selectedCommits = ref<GitCommit[]>([])

// Update all result
const updateResultVisible = ref(false)
const updateResult = ref<UpdateAllResponse | null>(null)

const cloneForm = reactive({
  url: '',
  branch: 'master',
  directory: ''
})

// Task status tracking for call chain generation
const taskStatusMap = ref<Record<string, CallChainTask>>({})
// Track which projects are currently being generated (waiting for API response)
const generatingProjects = ref<Set<string>>(new Set())
let pollingTimer: ReturnType<typeof setInterval> | null = null

// Status dot class
const getTaskStatusClass = (status?: string) => {
  const classes: Record<string, string> = {
    PENDING: 'status-pending',
    RUNNING: 'status-running',
    COMPLETED: 'status-completed',
    FAILED: 'status-failed'
  }
  return classes[status || ''] || 'status-none'
}

// Status tooltip
const getTaskStatusTooltip = (status?: string) => {
  const tooltips: Record<string, string> = {
    PENDING: '等待中',
    RUNNING: '生成中',
    COMPLETED: '已完成',
    FAILED: '生成失败'
  }
  return tooltips[status || ''] || '未生成调用链'
}

// Status text
const getTaskStatusText = (status?: string) => {
  const texts: Record<string, string> = {
    PENDING: '等待中',
    RUNNING: '生成中',
    COMPLETED: '已完成',
    FAILED: '失败'
  }
  return texts[status || ''] || '未生成'
}

// Check if task is running
const isTaskRunning = (status?: string) => {
  return status === 'PENDING' || status === 'RUNNING'
}

// Start polling when there are running tasks
const startPolling = () => {
  if (pollingTimer) {
    console.log('Polling already running, skip')
    return
  }
  console.log('Starting polling for task status updates...')
  pollingTimer = setInterval(async () => {
    const runningProjects = Object.values(taskStatusMap.value)
      .filter(t => t.status === 'PENDING' || t.status === 'RUNNING')
      .map(t => t.projectName)

    if (runningProjects.length === 0) {
      console.log('No running tasks, stopping polling')
      stopPolling()
      return
    }

    console.log('Polling status for projects:', runningProjects)
    try {
      const tasks = await taskApi.getStatus(runningProjects)
      if (tasks && Array.isArray(tasks)) {
        // Create new object to ensure reactivity
        const newMap = { ...taskStatusMap.value }
        tasks.forEach(task => {
          newMap[task.projectName] = task
          console.log(`Task ${task.projectName} status: ${task.status}`)
        })
        taskStatusMap.value = newMap

        // Check if all tasks are now complete, stop polling
        const stillRunning = tasks.some(t => t.status === 'PENDING' || t.status === 'RUNNING')
        if (!stillRunning) {
          console.log('All tasks completed, stopping polling')
          stopPolling()
        }
      }
    } catch (e) {
      console.error('Failed to poll task status:', e)
    }
  }, 20000) // Poll every 20 seconds

  console.log('Polling timer started, interval: 20s')
}

// Stop polling
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// Generate call chain
const handleGenerateChain = async (row: GitRepositoryInfo) => {
  if (!appStore.projectDirConfigured) {
    ElMessage.warning('请先配置项目目录')
    return
  }

  // Mark as generating
  generatingProjects.value.add(row.name)

  try {
    const task = await taskApi.startGenerate(row.name)
    if (task) {
      // Use Object.assign to ensure reactivity
      taskStatusMap.value = {
        ...taskStatusMap.value,
        [row.name]: task
      }
      ElMessage.success('已开始生成调用链')
      // Start polling after first task created
      startPolling()
    }
  } catch (error: any) {
    // Handle different error types
    if (error.response?.status === 409) {
      // Task already running
      const errorData = error.response.data
      ElMessage.warning(errorData?.message || '该项目已有任务在执行中')
      // Update status map with the running task
      if (errorData?.runningTask) {
        taskStatusMap.value = {
          ...taskStatusMap.value,
          [row.name]: errorData.runningTask
        }
        // Start polling for the running task
        startPolling()
      }
    } else if (error.response?.status === 400) {
      // Invalid project path
      const errorData = error.response.data
      ElMessage.error(errorData?.message || '项目路径不存在')
    } else {
      ElMessage.error('启动任务失败')
    }
  } finally {
    generatingProjects.value.delete(row.name)
  }
}

// Get task status for a project
const getProjectTaskStatus = (projectName: string) => {
  return taskStatusMap.value[projectName]?.status
}

// Load all project task statuses
const loadAllTaskStatuses = async () => {
  if (projects.value.length === 0) return

  const projectNames = projects.value.map(p => p.name)
  try {
    const tasks = await taskApi.getStatus(projectNames)
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      // Create new object to ensure reactivity
      const newMap: Record<string, CallChainTask> = {}
      let hasRunning = false
      tasks.forEach(task => {
        newMap[task.projectName] = task
        // Check directly if task is running (computed may not be updated yet)
        if (task.status === 'PENDING' || task.status === 'RUNNING') {
          hasRunning = true
        }
      })
      taskStatusMap.value = newMap
      // Start polling if any task is running
      if (hasRunning) {
        startPolling()
      }
    }
  } catch (e) {
    console.error('Failed to load task statuses:', e)
  }
}

const getStatusType = (row: GitRepositoryInfo) => {
  if (row.source === 'scanned') return row.clean ? 'success' : 'warning'
  const types: Record<string, string> = {
    READY: 'success',
    CLONING: 'warning',
    ERROR: 'danger'
  }
  return types[row.status || ''] || 'info'
}

const getStatusText = (row: GitRepositoryInfo) => {
  if (row.source === 'scanned') return row.clean ? 'Clean' : 'Modified'
  return row.status || 'Unknown'
}

// All repos have git since they were scanned or cloned
const hasGit = (_row: GitRepositoryInfo) => {
  return true
}

// Construct full project path
const getProjectPath = (projectName: string) => {
  return `${appStore.projectDir}/${projectName}`
}

// Handle project selection
const handleSelect = (row: GitRepositoryInfo) => {
  if (!appStore.projectDirConfigured) {
    ElMessage.warning('请先配置项目目录')
    return
  }
  appStore.selectProject(row.name)
  ElMessage.success(`已选择项目: ${row.name}`)
}

const loadProjects = async () => {
  loading.value = true
  try {
    // Merge scanned repos with existing project list
    const [scannedRes, listRes] = await Promise.all([
      projectApi.scanGitRepos(),
      projectApi.getProjects().catch(() => ({ data: [] }))
    ])

    const scannedRepos = scannedRes.data || []
    const existingNames = new Set(scannedRepos.map(r => r.name))

    // Convert legacy projects to GitRepositoryInfo format
    const legacyProjects = (listRes.data || [])
      .filter((name: string) => !existingNames.has(name))
      .map((name: string): GitRepositoryInfo => ({
        name,
        path: getProjectPath(name),
        branch: 'unknown',
        clean: true,
        source: 'cloned',
        status: 'READY'
      }))

    projects.value = [...scannedRepos, ...legacyProjects]

    // Load task statuses after projects are loaded
    await loadAllTaskStatuses()
  } catch (error) {
    ElMessage.error('加载项目列表失败')
    console.error('Failed to load projects:', error)
  } finally {
    loading.value = false
  }
}

const handleScan = async () => {
  if (!appStore.projectDirConfigured) {
    ElMessage.warning('请先配置项目目录')
    return
  }
  scanning.value = true
  try {
    const res = await projectApi.scanGitRepos()
    projects.value = res.data || []
    ElMessage.success(`扫描完成，发现 ${projects.value.length} 个仓库`)
    // Load task statuses after scan
    await loadAllTaskStatuses()
  } catch (error) {
    ElMessage.error('扫描失败')
  } finally {
    scanning.value = false
  }
}

const handleClone = async () => {
  if (!cloneForm.url) {
    ElMessage.warning('请输入仓库地址')
    return
  }
  cloning.value = true
  try {
    await projectApi.clone(cloneForm)
    ElMessage.success('克隆成功')
    showCloneDialog.value = false
    handleScan() // Refresh list after clone
  } catch (error) {
    ElMessage.error('克隆失败')
  } finally {
    cloning.value = false
  }
}

const handlePull = async (row: GitRepositoryInfo) => {
  try {
    await projectApi.pull(row.name)
    ElMessage.success('拉取成功')
    loadProjects()
  } catch (error) {
    ElMessage.error('拉取失败')
  }
}

const handleDelete = (row: GitRepositoryInfo) => {
  ElMessageBox.confirm(`确定要删除项目 ${row.name} 吗？`, '确认删除', {
    type: 'warning'
  }).then(async () => {
    try {
      await projectApi.delete(row.name)
      ElMessage.success('删除成功')
      // Clear selection if deleted project was selected
      if (appStore.selectedProject === row.name) {
        appStore.clearSelectedProject()
      }
      loadProjects()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// Show commit dialog
const showCommitDialog = (row: GitRepositoryInfo) => {
  selectedProjectForCommit.value = row.name
  commitDialogVisible.value = true
  loadCommits()
}

// Load commits
const loadCommits = async () => {
  commitsLoading.value = true
  try {
    const path = getProjectPath(selectedProjectForCommit.value)
    const res = await gitApi.getCommits(path, 50)
    commits.value = res.data || []
  } catch (error) {
    ElMessage.error('加载提交列表失败')
  } finally {
    commitsLoading.value = false
  }
}

// Handle commit selection
const handleCommitSelection = (selection: GitCommit[]) => {
  selectedCommits.value = selection
}

// Format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// Handle code analysis
const handleCodeAnalysis = async () => {
  if (selectedCommits.value.length === 0) return

  analysisLoading.value = true
  let newSessionId = ''

  try {
    // Build prompt with commit info
    const commitInfos = selectedCommits.value.map(c =>
      `${c.commitId}: ${c.shortMessage} (${c.author})`
    ).join('\n')

    await promptStore.loadTemplates()
    const prompt = promptStore.render('code-analysis', {
      codeSnippet: `以下是需要分析的 Git 提交:\n\n${commitInfos}`,
      language: 'Java',
      projectContext: `项目: ${selectedProjectForCommit.value}`
    })

    newSessionId = await claudeApi.universalChat(
      {
        prompt,
        scene: 'code-analysis',
        metadata: {
          projectName: selectedProjectForCommit.value,
          commits: selectedCommits.value.map(c => c.commitId)
        }
      },
      {
        onSession: (sessionId) => {
          // 收到 sessionId 后立即跳转
          newSessionId = sessionId
          commitDialogVisible.value = false
          router.push({ name: 'ClaudeSession', query: { sessionId } })
        },
        onOutput: () => {},
        onDone: () => {
          ElMessage.success('分析完成')
        },
        onError: (error) => {
          ElMessage.error(`分析失败: ${error}`)
        }
      }
    )

    // 如果 onSession 没被调用，使用返回的 sessionId 跳转
    if (newSessionId && !router.currentRoute.value.query.sessionId) {
      commitDialogVisible.value = false
      router.push({ name: 'ClaudeSession', query: { sessionId: newSessionId } })
    }
  } catch (error) {
    ElMessage.error('创建分析会话失败')
  } finally {
    analysisLoading.value = false
  }
}

// Handle impact analysis
const handleImpactAnalysis = async () => {
  if (selectedCommits.value.length === 0) return

  analysisLoading.value = true
  let newSessionId = ''

  try {
    const commitInfos = selectedCommits.value.map(c =>
      `${c.commitId}: ${c.shortMessage}`
    ).join('\n')

    await promptStore.loadTemplates()
    const prompt = promptStore.render('impact-analysis', {
      changedFile: '多个文件变更',
      changedMethod: '多个方法变更',
      changeType: 'MODIFY',
      projectName: selectedProjectForCommit.value
    }) + `\n\n提交信息:\n${commitInfos}`

    newSessionId = await claudeApi.universalChat(
      {
        prompt,
        scene: 'impact-analysis',
        metadata: {
          projectName: selectedProjectForCommit.value,
          commits: selectedCommits.value.map(c => c.commitId)
        }
      },
      {
        onSession: (sessionId) => {
          // 收到 sessionId 后立即跳转
          newSessionId = sessionId
          commitDialogVisible.value = false
          router.push({ name: 'ClaudeSession', query: { sessionId } })
        },
        onOutput: () => {},
        onDone: () => {
          ElMessage.success('分析完成')
        },
        onError: (error) => {
          ElMessage.error(`分析失败: ${error}`)
        }
      }
    )

    // 如果 onSession 没被调用，使用返回的 sessionId 跳转
    if (newSessionId && !router.currentRoute.value.query.sessionId) {
      commitDialogVisible.value = false
      router.push({ name: 'ClaudeSession', query: { sessionId: newSessionId } })
    }
  } catch (error) {
    ElMessage.error('创建分析会话失败')
  } finally {
    analysisLoading.value = false
  }
}

// Handle update all
const handleUpdateAll = async () => {
  if (!appStore.projectDirConfigured) {
    ElMessage.warning('请先配置项目目录')
    return
  }

  updatingAll.value = true
  try {
    const res = await gitApi.updateAll(appStore.projectDir)
    // axios 拦截器已返回 response.data
    updateResult.value = res as unknown as UpdateAllResponse
    updateResultVisible.value = true

    // Refresh project list
    await handleScan()
  } catch (error: any) {
    ElMessage.error(`一键更新失败: ${error.message || error}`)
  } finally {
    updatingAll.value = false
  }
}

onMounted(() => {
  if (appStore.projectDirConfigured) {
    handleScan()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.guidance-alert {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.project-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-muted {
  color: #909399;
}

/* Status indicator styles */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.status-none {
  background-color: #c0c4cc;
  box-shadow: 0 0 4px rgba(192, 196, 204, 0.5);
}

.status-pending {
  background-color: #e6a23c;
  box-shadow: 0 0 6px rgba(230, 162, 60, 0.6);
  animation: pulse 1.5s infinite;
}

.status-running {
  background-color: #e6a23c;
  box-shadow: 0 0 8px rgba(230, 162, 60, 0.8);
  animation: pulse 1s infinite;
}

.status-completed {
  background-color: #67c23a;
  box-shadow: 0 0 4px rgba(103, 194, 58, 0.5);
}

.status-failed {
  background-color: #f56c6c;
  box-shadow: 0 0 4px rgba(245, 108, 108, 0.5);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: 12px;
  color: #606266;
}

/* Commit dialog styles */
.commit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-weight: 500;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: #909399;
}

/* Update result styles */
.update-result {
  margin-top: 16px;
}

.mt-4 {
  margin-top: 16px;
}
</style>