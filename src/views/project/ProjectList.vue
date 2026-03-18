<template>
  <div class="project-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>项目管理</span>
          <el-button type="primary" @click="showCloneDialog = true">
            <el-icon><Plus /></el-icon>
            克隆项目
          </el-button>
        </div>
      </template>
      <el-table :data="projects" v-loading="loading" stripe>
        <el-table-column prop="name" label="项目名称" />
        <el-table-column prop="url" label="仓库地址" show-overflow-tooltip />
        <el-table-column prop="branch" label="分支" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="180" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link @click="handlePull(row)">拉取</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 克隆对话框 -->
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
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { projectApi } from '@/api/project'

const loading = ref(false)
const cloning = ref(false)
const showCloneDialog = ref(false)
const projects = ref<any[]>([])

const cloneForm = reactive({
  url: '',
  branch: 'master',
  directory: ''
})

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    READY: 'success',
    CLONING: 'warning',
    ERROR: 'danger'
  }
  return types[status] || 'info'
}

const loadProjects = async () => {
  loading.value = true
  try {
    const res = await projectApi.getProjects()
    projects.value = res.data || []
  } catch (error) {
    console.error('Failed to load projects:', error)
  } finally {
    loading.value = false
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
    loadProjects()
  } catch (error) {
    ElMessage.error('克隆失败')
  } finally {
    cloning.value = false
  }
}

const handlePull = async (row: any) => {
  try {
    await projectApi.pull(row.name)
    ElMessage.success('拉取成功')
    loadProjects()
  } catch (error) {
    ElMessage.error('拉取失败')
  }
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除项目 ${row.name} 吗？`, '确认删除', {
    type: 'warning'
  }).then(async () => {
    try {
      await projectApi.delete(row.name)
      ElMessage.success('删除成功')
      loadProjects()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>