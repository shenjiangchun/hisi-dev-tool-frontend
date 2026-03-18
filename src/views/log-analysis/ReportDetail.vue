<template>
  <div class="report-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>分析报告 #{{ reportId }}</span>
          <el-button @click="goBack">返回</el-button>
        </div>
      </template>
      <el-descriptions :column="2" border v-if="report">
        <el-descriptions-item label="报告ID">{{ report.id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(report.status)">{{ report.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ report.createTime }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ report.updateTime }}</el-descriptions-item>
      </el-descriptions>
      <el-divider />
      <div v-if="report?.content" class="report-content">
        <h3>分析结果</h3>
        <pre>{{ report.content }}</pre>
      </div>
      <el-empty v-else description="暂无报告内容" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { logAnalysisApi } from '@/api/logAnalysis'
import type { Report } from '@/types/log'

const route = useRoute()
const router = useRouter()
const reportId = route.params.id as string
const loading = ref(false)
const report = ref<Report | null>(null)

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    COMPLETED: 'success',
    PROCESSING: 'warning',
    FAILED: 'danger',
    PENDING: 'info'
  }
  return types[status] || ''
}

const goBack = () => {
  router.push('/log-analysis')
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await logAnalysisApi.getReport(Number(reportId))
    report.value = res.data
  } catch (error) {
    ElMessage.error('加载报告失败')
    console.error('Failed to load report:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.report-content {
  margin-top: 16px;
}
.report-content pre {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>