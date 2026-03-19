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
        <el-table-column label="调用链状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getTaskStatusType(getProjectTaskStatus(row.name))" size="small">
              {{ getTaskStatusText(getProjectTaskStatus(row.name)) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastCommitMessage" label="最近提交" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.lastCommitMessage">{{ row.lastCommitMessage }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280">
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
              type="warning"
              link
              @click="handleGenerateChain(row)"
              :loading="getProjectTaskStatus(row.name) === 'RUNNING'"
              :disabled="!appStore.projectDirConfigured"
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Plus, Select, FolderOpened, Connection } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { projectApi } from '@/api/project'
import { taskApi } from '@/api/task'
import type { CallChainTask } from '@/types/callchain'
import { useAppStore } from '@/stores/app'
import ProjectDirConfig from '@/components/ProjectDirConfig.vue'
import GitOperations from '@/components/GitOperations.vue'
import type { GitRepositoryInfo } from '@/types/callchain'

const appStore = useAppStore()

const loading = ref(false)
const cloning = ref(false)
const scanning = ref(false)
const showCloneDialog = ref(false)
const projects = ref<GitRepositoryInfo[]>([])

const cloneForm = reactive({
  url: '',
  branch: 'master',
  directory: ''
})

// Task status tracking for call chain generation
const taskStatusMap = ref<Record<string, CallChainTask>>({})
let pollingTimer: ReturnType<typeof setInterval> | null = null

// Status style
const getTaskStatusType = (status?: string) => {
  const types: Record<string, string> = {
    PENDING: 'info',
    RUNNING: 'warning',
    COMPLETED: 'success',
    FAILED: 'danger'
  }
  return types[status || ''] || 'info'
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

// Start polling
const startPolling = () => {
  if (pollingTimer) return
  pollingTimer = setInterval(async () => {
    const runningProjects = Object.values(taskStatusMap.value)
      .filter(t => t.status === 'PENDING' || t.status === 'RUNNING')
      .map(t => t.projectName)

    if (runningProjects.length === 0) {
      stopPolling()
      return
    }

    try {
      const res = await taskApi.getStatus(runningProjects)
      if (res.data) {
        res.data.forEach(task => {
          taskStatusMap.value[task.projectName] = task
        })
      }
    } catch (e) {
      console.error('Failed to poll task status:', e)
    }
  }, 20000)
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

  try {
    const res = await taskApi.startGenerate(row.name)
    if (res.data) {
      taskStatusMap.value[row.name] = res.data
      ElMessage.success('已开始生成调用链')
      startPolling()
    }
  } catch (e) {
    ElMessage.error('启动任务失败')
  }
}

// Get task status for a project
const getProjectTaskStatus = (projectName: string) => {
  return taskStatusMap.value[projectName]?.status
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
</style>