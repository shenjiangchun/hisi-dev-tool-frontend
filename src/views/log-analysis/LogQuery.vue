<template>
  <div class="log-query">
    <el-card header="日志查询">
      <el-form :model="queryForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="应用ID">
              <el-input v-model="queryForm.appId" placeholder="请输入应用ID" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="日志级别">
              <el-select v-model="queryForm.logLevel" clearable placeholder="请选择">
                <el-option label="ERROR" value="ERROR" />
                <el-option label="WARN" value="WARN" />
                <el-option label="INFO" value="INFO" />
                <el-option label="DEBUG" value="DEBUG" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="关键词">
              <el-input v-model="queryForm.keyword" placeholder="请输入关键词" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="queryForm.startTime"
                type="datetime"
                placeholder="选择开始时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="queryForm.endTime"
                type="datetime"
                placeholder="选择结束时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item>
              <el-button type="primary" @click="handleQuery" :loading="loading">
                <el-icon><Search /></el-icon>
                查询
              </el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card header="查询结果" class="mt-4">
      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="level" label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="消息" show-overflow-tooltip />
        <el-table-column prop="timestamp" label="时间" width="180" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleAnalyze(row)">
              分析
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="mt-4"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleQuery"
        @current-change="handleQuery"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { logAnalysisApi } from '@/api/logAnalysis'
import type { LogEntry } from '@/types/log'

const router = useRouter()
const loading = ref(false)
const logs = ref<LogEntry[]>([])

const queryForm = reactive({
  appId: '',
  logLevel: 'ERROR',
  keyword: '',
  startTime: null as Date | null,
  endTime: null as Date | null
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const getLevelType = (level: string) => {
  const types: Record<string, string> = {
    ERROR: 'danger',
    WARN: 'warning',
    INFO: 'info',
    DEBUG: ''
  }
  return types[level] || ''
}

const handleQuery = async () => {
  if (!queryForm.appId) {
    ElMessage.warning('请输入应用ID')
    return
  }
  loading.value = true
  try {
    const res = await logAnalysisApi.queryLogs({
      ...queryForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    logs.value = res.data?.logs || []
    pagination.total = res.data?.total || 0
  } catch (error) {
    ElMessage.error('查询失败，请稍后重试')
    console.error('Query failed:', error)
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  Object.assign(queryForm, {
    appId: '',
    logLevel: 'ERROR',
    keyword: '',
    startTime: null,
    endTime: null
  })
}

const handleAnalyze = async (row: LogEntry) => {
  try {
    const res = await logAnalysisApi.analyze({
      logIds: [row.id]
    })
    ElMessage.success('分析任务已提交')
    const taskId = (res as any).data?.taskId || (res as any).taskId
    router.push(`/log-analysis/report/${taskId}`)
  } catch (error) {
    ElMessage.error('提交分析任务失败')
    console.error('Analyze failed:', error)
  }
}
</script>

<style scoped>
.mt-4 {
  margin-top: 16px;
}
</style>