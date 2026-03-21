<template>
  <div class="log-query">
    <el-card header="日志查询">
      <el-form :model="queryForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="DSL查询">
              <el-input
                v-model="queryForm.dslQuery"
                type="textarea"
                :rows="4"
                placeholder='输入自定义DSL查询，例如: {"size":10,"query":{"match":{"level":"ERROR"}}}'
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="快速筛选">
              <div class="quick-filters">
                <el-select v-model="queryForm.logLevel" clearable placeholder="日志级别" style="width: 120px">
                  <el-option label="ERROR" value="ERROR" />
                  <el-option label="WARN" value="WARN" />
                  <el-option label="INFO" value="INFO" />
                  <el-option label="DEBUG" value="DEBUG" />
                </el-select>
                <el-input v-model="queryForm.keyword" placeholder="关键词" style="width: 150px" clearable />
                <el-input v-model="queryForm.traceId" placeholder="TraceID" style="width: 150px" clearable />
              </div>
            </el-form-item>
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="queryForm.startTime"
                type="datetime"
                placeholder="开始时间"
                style="width: 180px"
              />
              <span style="margin: 0 8px;">至</span>
              <el-date-picker
                v-model="queryForm.endTime"
                type="datetime"
                placeholder="结束时间"
                style="width: 180px"
              />
            </el-form-item>
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
      <template #header>
        <div class="result-header">
          <span>查询结果</span>
          <span class="result-count" v-if="pagination.total > 0">共 {{ pagination.total }} 条</span>
        </div>
      </template>

      <el-table :data="logs" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="level" label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)" size="small">{{ row.level || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="timestamp" label="时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="serviceName" label="服务" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.serviceName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="traceId" label="TraceID" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tooltip :content="row.traceId" placement="top" v-if="row.traceId">
              <span class="trace-id">{{ row.traceId }}</span>
            </el-tooltip>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="消息" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="log-message">
              <el-tag v-if="row.errorType" type="danger" size="small" class="error-tag">{{ row.errorType }}</el-tag>
              <span>{{ row.message }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="hostname" label="主机" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tooltip :content="row.hostname" placement="top" v-if="row.hostname">
              <span>{{ shortText(row.hostname, 15) }}</span>
            </el-tooltip>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleAnalyze(row)">
              分析
            </el-button>
            <el-button type="info" link size="small" @click="showDetail(row)">
              详情
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

    <!-- 日志详情弹窗 -->
    <el-dialog v-model="detailVisible" title="日志详情" width="800px">
      <div class="log-detail" v-if="selectedLog">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="时间">{{ selectedLog.timestamp }}</el-descriptions-item>
          <el-descriptions-item label="级别">
            <el-tag :type="getLevelType(selectedLog.level)">{{ selectedLog.level }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="服务">{{ selectedLog.serviceName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="TraceID">{{ selectedLog.traceId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="主机">{{ selectedLog.hostname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Pod">{{ selectedLog.podName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="命名空间">{{ selectedLog.namespace || '-' }}</el-descriptions-item>
          <el-descriptions-item label="错误类型">{{ selectedLog.errorType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="日志源" :span="2">{{ selectedLog.logSource || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-section" v-if="selectedLog.message">
          <div class="section-title">日志消息</div>
          <pre class="message-content">{{ selectedLog.message }}</pre>
        </div>

        <div class="detail-section" v-if="selectedLog.stackTrace">
          <div class="section-title">堆栈信息</div>
          <pre class="stack-content">{{ selectedLog.stackTrace }}</pre>
        </div>

        <div class="detail-section" v-if="selectedLog.rawFields">
          <div class="section-title">原始字段</div>
          <el-collapse>
            <el-collapse-item title="点击展开查看所有字段">
              <pre class="raw-fields">{{ JSON.stringify(selectedLog.rawFields, null, 2) }}</pre>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </el-dialog>

    <!-- LLM 分析结果弹窗 -->
    <el-dialog v-model="analysisVisible" title="LLM 智能分析" width="900px" @close="closeAnalysisDialog">
      <!-- 分析中状态 -->
      <div v-if="analysisLoading" class="analysis-loading">
        <div class="loading-content">
          <el-icon class="loading-icon is-loading"><Loading /></el-icon>
          <h3>正在分析日志...</h3>
          <p class="loading-message" v-if="analyzingLog">
            <el-tag type="danger" size="small" v-if="analyzingLog.errorType">{{ analyzingLog.errorType }}</el-tag>
            <span class="analyzing-text">{{ shortText(analyzingLog.message, 80) }}</span>
          </p>
          <el-progress
            :percentage="Math.round(analysisProgress)"
            :stroke-width="10"
            :show-text="true"
            class="analysis-progress"
          />
          <p class="progress-hint">正在调用 Claude AI 进行智能分析，请稍候...</p>
        </div>
      </div>

      <!-- 分析错误状态 -->
      <div v-else-if="analysisError" class="analysis-error">
        <el-result icon="warning" title="分析失败" :sub-title="analysisError">
          <template #extra>
            <el-button type="primary" @click="analyzingLog && handleAnalyze(analyzingLog)">
              重试
            </el-button>
            <el-button @click="closeAnalysisDialog">关闭</el-button>
          </template>
        </el-result>
      </div>

      <!-- 分析结果展示 -->
      <div v-else-if="analysisResult" class="analysis-result">
        <!-- 分析头部信息 -->
        <div class="result-header-section">
          <div class="header-row">
            <div class="header-item">
              <span class="header-label">错误类型</span>
              <el-tag type="danger" effect="dark" size="large">
                <el-icon><Warning /></el-icon>
                {{ analysisResult.errorType || '未知错误' }}
              </el-tag>
            </div>
            <div class="header-item">
              <span class="header-label">置信度</span>
              <div class="confidence-display">
                <el-progress
                  type="circle"
                  :width="60"
                  :percentage="getConfidencePercent(analysisResult.confidence)"
                  :color="getConfidenceColor(analysisResult.confidence)"
                />
              </div>
            </div>
            <div class="header-item">
              <span class="header-label">分析时间</span>
              <span class="header-value">{{ analysisResult.timestamp || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 根本原因 -->
        <div class="result-section">
          <div class="section-header">
            <el-icon><Cpu /></el-icon>
            <span>根本原因分析</span>
          </div>
          <div class="section-content root-cause">
            <p>{{ analysisResult.rootCause || '无法确定根本原因' }}</p>
          </div>
        </div>

        <!-- 受影响的代码 -->
        <div class="result-section" v-if="analysisResult.affectedCode && analysisResult.affectedCode.length > 0">
          <div class="section-header">
            <el-icon><Document /></el-icon>
            <span>受影响的代码</span>
          </div>
          <div class="section-content">
            <div class="code-list">
              <div
                v-for="(code, index) in analysisResult.affectedCode"
                :key="index"
                class="code-item"
              >
                <el-tag size="small" type="info">{{ index + 1 }}</el-tag>
                <code>{{ code }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- 修复建议 -->
        <div class="result-section" v-if="analysisResult.fixSuggestions && analysisResult.fixSuggestions.length > 0">
          <div class="section-header">
            <el-icon><Check /></el-icon>
            <span>修复建议</span>
          </div>
          <div class="section-content">
            <el-timeline>
              <el-timeline-item
                v-for="(suggestion, index) in analysisResult.fixSuggestions"
                :key="index"
                :type="index === 0 ? 'primary' : 'info'"
                :hollow="index !== 0"
              >
                <div class="suggestion-item">
                  <div class="suggestion-number">建议 {{ index + 1 }}</div>
                  <p>{{ suggestion }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>

        <!-- 附加信息 -->
        <div class="result-meta">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="分析类型">{{ analysisResult.analysisType || '日志分析' }}</el-descriptions-item>
            <el-descriptions-item label="请求ID">{{ analysisResult.requestId || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <!-- 弹窗底部按钮 -->
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeAnalysisDialog">关闭</el-button>
          <el-button
            v-if="analysisResult && analysisResult.requestId"
            type="primary"
            @click="navigateToReport"
          >
            查看详细报告
            <el-icon class="el-icon--right"><Right /></el-icon>
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Loading, Document, Warning, Cpu, Check, Right } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { logAnalysisApi } from '@/api/logAnalysis'
import { claudeApi } from '@/api/claude'
import type { LogEntry } from '@/types/log'
import type { ClaudeAnalysisResult } from '@/api/claude'

const router = useRouter()
const loading = ref(false)
const logs = ref<LogEntry[]>([])
const detailVisible = ref(false)
const selectedLog = ref<LogEntry | null>(null)

// Analysis state
const analysisLoading = ref(false)
const analysisVisible = ref(false)
const analysisResult = ref<ClaudeAnalysisResult | null>(null)
const analysisError = ref<string | null>(null)
const analysisProgress = ref(0)
const analyzingLog = ref<LogEntry | null>(null)

const queryForm = reactive({
  dslQuery: '',
  logLevel: 'ERROR',
  keyword: '',
  traceId: '',
  startTime: null as Date | null,
  endTime: null as Date | null
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const getLevelType = (level: string | null) => {
  if (!level) return ''
  const types: Record<string, string> = {
    ERROR: 'danger',
    WARN: 'warning',
    INFO: 'info',
    DEBUG: '',
    SEVERE: 'danger',
    FATAL: 'danger'
  }
  return types[level.toUpperCase()] || ''
}

const formatTime = (timestamp: string | null) => {
  if (!timestamp) return '-'
  try {
    return new Date(timestamp).toLocaleString('zh-CN')
  } catch {
    return timestamp
  }
}

const shortText = (text: string | null, maxLen: number) => {
  if (!text) return '-'
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

const handleQuery = async () => {
  loading.value = true
  try {
    const params: any = {
      size: pagination.pageSize
    }

    // 如果有自定义 DSL，使用它
    if (queryForm.dslQuery && queryForm.dslQuery.trim()) {
      params.dslQuery = queryForm.dslQuery.trim()
    } else {
      // 否则使用快速筛选条件
      if (queryForm.logLevel) params.logLevel = queryForm.logLevel
      if (queryForm.keyword) params.keyword = queryForm.keyword
      if (queryForm.traceId) params.traceId = queryForm.traceId
      if (queryForm.startTime) params.startTime = queryForm.startTime
      if (queryForm.endTime) params.endTime = queryForm.endTime
    }

    const res = await logAnalysisApi.queryLogs(params)
    logs.value = res.data?.logs || []
    pagination.total = res.data?.total || 0
  } catch (error: any) {
    ElMessage.error(`查询失败: ${error.message || '请稍后重试'}`)
    console.error('Query failed:', error)
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  Object.assign(queryForm, {
    dslQuery: '',
    logLevel: 'ERROR',
    keyword: '',
    traceId: '',
    startTime: null,
    endTime: null
  })
  pagination.page = 1
  logs.value = []
  pagination.total = 0
}

const showDetail = (row: LogEntry) => {
  selectedLog.value = row
  detailVisible.value = true
}

const handleAnalyze = async (row: LogEntry) => {
  // Reset state
  analyzingLog.value = row
  analysisResult.value = null
  analysisError.value = null
  analysisProgress.value = 0
  analysisVisible.value = true
  analysisLoading.value = true

  // Simulate progress during analysis
  const progressInterval = setInterval(() => {
    if (analysisProgress.value < 90) {
      analysisProgress.value += Math.random() * 15
    }
  }, 300)

  try {
    const res = await claudeApi.analyzeLog({
      errorMessage: row.message || '',
      stackTrace: row.stackTrace || undefined,
      projectPath: row.serviceName || undefined,
      additionalContext: row.traceId ? `TraceID: ${row.traceId}` : undefined
    })

    analysisProgress.value = 100
    analysisResult.value = res.data
    ElMessage.success('分析完成')
  } catch (error: any) {
    analysisError.value = error.message || '分析过程中发生错误'
    ElMessage.error(`分析失败: ${analysisError.value}`)
    console.error('Analysis failed:', error)
  } finally {
    clearInterval(progressInterval)
    analysisLoading.value = false
  }
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return '#67c23a'
  if (confidence >= 0.6) return '#e6a23c'
  return '#f56c6c'
}

const getConfidencePercent = (confidence: number) => {
  return Math.round(confidence * 100)
}

const navigateToReport = () => {
  if (analysisResult.value?.requestId) {
    router.push(`/log-analysis/report/${analysisResult.value.requestId}`)
  }
}

const closeAnalysisDialog = () => {
  analysisVisible.value = false
  analyzingLog.value = null
}
</script>

<style scoped>
.mt-4 {
  margin-top: 16px;
}

.quick-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-count {
  font-size: 13px;
  color: #909399;
}

.trace-id {
  font-family: monospace;
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
}

.log-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.error-tag {
  flex-shrink: 0;
}

.log-detail {
  padding: 8px 0;
}

.detail-section {
  margin-top: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.message-content {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.stack-content {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.raw-fields {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}

/* Analysis Dialog Styles */
.analysis-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  padding: 40px;
}

.loading-content {
  text-align: center;
  max-width: 500px;
}

.loading-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 20px;
}

.loading-content h3 {
  font-size: 18px;
  color: #303133;
  margin: 0 0 16px 0;
}

.loading-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
  color: #606266;
}

.analyzing-text {
  font-family: monospace;
  font-size: 13px;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-progress {
  width: 100%;
  max-width: 400px;
  margin: 0 auto 16px;
}

.progress-hint {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.analysis-error {
  padding: 20px;
}

.analysis-result {
  padding: 8px 0;
}

.result-header-section {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.header-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-label {
  font-size: 12px;
  color: #909399;
}

.header-value {
  font-size: 14px;
  color: #303133;
}

.confidence-display {
  display: flex;
  align-items: center;
}

.result-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.section-header .el-icon {
  color: #409eff;
}

.section-content {
  padding: 0 4px;
}

.root-cause {
  background: #fef0f0;
  border-left: 3px solid #f56c6c;
  padding: 12px 16px;
  border-radius: 4px;
}

.root-cause p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.code-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f5f7fa;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.code-item code {
  font-family: monospace;
  font-size: 13px;
  color: #303133;
  background: none;
}

.suggestion-item {
  padding: 4px 0;
}

.suggestion-number {
  font-weight: 500;
  color: #409eff;
  margin-bottom: 4px;
  font-size: 13px;
}

.suggestion-item p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.result-meta {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>