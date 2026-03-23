<template>
  <div class="log-query">
    <el-card header="日志查询">
      <el-form :model="queryForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="16">
            <!-- DSL 配置化构建 -->
            <el-card shadow="never" class="dsl-builder-card">
              <template #header>
                <div class="dsl-builder-header">
                  <span>DSL 查询配置</span>
                  <el-button type="primary" size="small" @click="previewDsl">
                    预览 DSL
                  </el-button>
                </div>
              </template>

              <!-- 基础配置 -->
              <el-row :gutter="16">
                <el-col :span="6">
                  <el-form-item label="返回条数" label-width="80px">
                    <el-input-number
                      v-model="dslConfig.size"
                      :min="1"
                      :max="1000"
                      :step="10"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="9">
                  <el-form-item label="时间范围" label-width="80px">
                    <el-select v-model="dslConfig.timeRange" style="width: 100%">
                      <el-option label="最近 5 分钟" value="now-5m" />
                      <el-option label="最近 15 分钟" value="now-15m" />
                      <el-option label="最近 30 分钟" value="now-30m" />
                      <el-option label="最近 1 小时" value="now-1h" />
                      <el-option label="最近 3 小时" value="now-3h" />
                      <el-option label="最近 6 小时" value="now-6h" />
                      <el-option label="最近 12 小时" value="now-12h" />
                      <el-option label="最近 24 小时" value="now-24h" />
                      <el-option label="最近 7 天" value="now-7d" />
                      <el-option label="自定义时间" value="custom" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="9" v-if="dslConfig.timeRange === 'custom'">
                  <el-form-item label="自定义" label-width="60px">
                    <el-date-picker
                      v-model="dslConfig.customStartTime"
                      type="datetime"
                      placeholder="开始时间"
                      style="width: 48%"
                    />
                    <span style="margin: 0 2px">-</span>
                    <el-date-picker
                      v-model="dslConfig.customEndTime"
                      type="datetime"
                      placeholder="结束时间"
                      style="width: 48%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <!-- Must 条件 -->
              <el-divider content-position="left">Must 条件 (必须满足)</el-divider>
              <div class="condition-list">
                <div v-for="(condition, index) in dslConfig.mustConditions" :key="'must-' + index" class="condition-item">
                  <el-select v-model="condition.field" placeholder="字段" style="width: 140px">
                    <el-option label="@timestamp" value="@timestamp" />
                    <el-option label="level" value="level" />
                    <el-option label="message" value="message" />
                    <el-option label="service" value="service" />
                    <el-option label="traceId" value="traceId" />
                    <el-option label="hostname" value="hostname" />
                    <el-option label="自定义字段" value="custom" />
                  </el-select>
                  <el-input v-if="condition.field === 'custom'" v-model="condition.customField" placeholder="字段名" style="width: 120px" />
                  <el-select v-model="condition.operator" placeholder="操作符" style="width: 110px">
                    <el-option label="range" value="range" />
                    <el-option label="match" value="match" />
                    <el-option label="match_phrase" value="match_phrase" />
                    <el-option label="term" value="term" />
                    <el-option label="wildcard" value="wildcard" />
                  </el-select>
                  <el-input v-model="condition.value" placeholder="值" style="flex: 1; min-width: 150px" />
                  <el-button type="danger" :icon="Delete" circle size="small" @click="removeCondition('must', index)" />
                </div>
                <el-button type="primary" size="small" @click="addCondition('must')">
                  <el-icon><Plus /></el-icon> 添加 Must 条件
                </el-button>
              </div>

              <!-- Should 条件 -->
              <el-divider content-position="left">Should 条件 (满足任一)</el-divider>
              <div class="condition-list">
                <div v-for="(condition, index) in dslConfig.shouldConditions" :key="'should-' + index" class="condition-item">
                  <el-select v-model="condition.field" placeholder="字段" style="width: 140px">
                    <el-option label="level" value="level" />
                    <el-option label="message" value="message" />
                    <el-option label="service" value="service" />
                    <el-option label="自定义字段" value="custom" />
                  </el-select>
                  <el-input v-if="condition.field === 'custom'" v-model="condition.customField" placeholder="字段名" style="width: 120px" />
                  <el-select v-model="condition.operator" placeholder="操作符" style="width: 130px">
                    <el-option label="match" value="match" />
                    <el-option label="match_phrase" value="match_phrase" />
                    <el-option label="term" value="term" />
                    <el-option label="wildcard" value="wildcard" />
                    <el-option label="regexp" value="regexp" />
                  </el-select>
                  <el-input v-model="condition.value" placeholder="值" style="flex: 1; min-width: 150px" />
                  <el-button type="danger" :icon="Delete" circle size="small" @click="removeCondition('should', index)" />
                </div>
                <el-row :gutter="10" style="margin-top: 8px">
                  <el-col :span="auto">
                    <el-button type="primary" size="small" @click="addCondition('should')">
                      <el-icon><Plus /></el-icon> 添加 Should 条件
                    </el-button>
                  </el-col>
                  <el-col :span="auto">
                    <el-button size="small" @click="addPresetCondition">
                      <el-icon><Plus /></el-icon> 快速添加错误模式
                    </el-button>
                  </el-col>
                </el-row>
              </div>

              <!-- minimum_should_match -->
              <el-form-item label="至少匹配" style="margin-top: 16px">
                <el-input-number v-model="dslConfig.minimumShouldMatch" :min="0" :max="dslConfig.shouldConditions.length || 10" />
                <span class="form-hint">个 Should 条件</span>
              </el-form-item>

              <!-- 生成的 DSL 预览 -->
              <el-collapse v-if="generatedDsl" v-model="dslCollapseActive" style="margin-top: 16px">
                <el-collapse-item title="生成的 DSL 查询" name="dsl">
                  <pre class="dsl-preview">{{ generatedDsl }}</pre>
                  <el-button size="small" @click="copyDsl">复制 DSL</el-button>
                </el-collapse-item>
              </el-collapse>

              <!-- 手动输入 DSL -->
              <el-divider content-position="left">手动输入 DSL</el-divider>
              <div class="manual-dsl-section">
                <el-input
                  v-model="manualDsl"
                  type="textarea"
                  :rows="6"
                  placeholder="在此输入自定义 DSL 查询 JSON，例如：
{
  &quot;size&quot;: 20,
  &quot;query&quot;: {
    &quot;bool&quot;: {
      &quot;must&quot;: [{ &quot;match&quot;: { &quot;level&quot;: &quot;ERROR&quot; } }],
      &quot;should&quot;: [{ &quot;match_phrase&quot;: { &quot;message&quot;: &quot;Exception&quot; } }]
    }
  }
}"
                  style="font-family: monospace"
                />
                <div class="manual-dsl-actions">
                  <el-button size="small" @click="formatManualDsl">格式化</el-button>
                  <el-button size="small" @click="loadManualDslToBuilder">加载到配置</el-button>
                  <el-button size="small" type="warning" @click="clearManualDsl">清空</el-button>
                </div>
              </div>
            </el-card>
          </el-col>

          <el-col :span="8">
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
    <el-dialog v-model="analysisVisible" title="Claude 智能分析" width="1000px" @close="closeAnalysisDialog">
      <!-- 分析中状态 - 流式输出 -->
      <div v-if="analysisLoading" class="analysis-streaming">
        <div class="stream-header">
          <el-icon class="streaming-icon is-loading"><Loading /></el-icon>
          <span>Claude 正在分析...</span>
          <el-tag v-if="currentSessionId" size="small" type="info">Session: {{ currentSessionId.slice(0, 8) }}</el-tag>
        </div>

        <!-- 流式输出区域 -->
        <div class="stream-output" ref="streamOutputRef">
          <pre>{{ streamOutput }}</pre>
        </div>

        <!-- 聊天输入框 -->
        <div class="chat-input" v-if="currentSessionId">
          <el-input
            v-model="chatInput"
            placeholder="继续向 Claude 提问..."
            @keyup.enter="sendChat"
            :disabled="chatLoading"
          >
            <template #append>
              <el-button @click="sendChat" :loading="chatLoading" type="primary">发送</el-button>
            </template>
          </el-input>
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

      <!-- 分析完成后的交互界面 -->
      <div v-else class="analysis-complete">
        <div class="stream-header">
          <el-icon color="#67c23a"><Check /></el-icon>
          <span>分析完成</span>
          <el-tag v-if="currentSessionId" size="small" type="success">Session: {{ currentSessionId.slice(0, 8) }}</el-tag>
        </div>

        <!-- 完整输出 -->
        <div class="stream-output complete">
          <pre>{{ streamOutput }}</pre>
        </div>

        <!-- 继续对话 -->
        <div class="chat-input">
          <el-input
            v-model="chatInput"
            placeholder="继续向 Claude 提问..."
            @keyup.enter="sendChat"
            :disabled="chatLoading"
          >
            <template #append>
              <el-button @click="sendChat" :loading="chatLoading" type="primary">发送</el-button>
            </template>
          </el-input>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeAnalysisDialog">关闭</el-button>
          <el-button
            v-if="!analysisLoading && streamOutput"
            type="primary"
            @click="copyOutput"
          >
            复制输出
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Loading, Document, Warning, Cpu, Check, Right, Delete, Plus } from '@element-plus/icons-vue'
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

// DSL 配置化
interface DslCondition {
  field: string
  customField: string
  operator: string
  value: string
}

const dslConfig = reactive({
  size: 20,
  timeRange: 'now-15m',
  customStartTime: null as Date | null,
  customEndTime: null as Date | null,
  mustConditions: [] as DslCondition[],
  shouldConditions: [
    { field: 'message', customField: '', operator: 'match_phrase', value: 'Caused by:' },
    { field: 'message', customField: '', operator: 'match_phrase', value: '*ExceptionHandler' },
    { field: 'level', customField: '', operator: 'match', value: 'ERROR' },
    { field: 'level', customField: '', operator: 'match', value: 'SEVERE' },
    { field: 'message', customField: '', operator: 'match_phrase', value: '.*Exception' },
    { field: 'message', customField: '', operator: 'match_phrase', value: '.*Error' },
    { field: 'message', customField: '', operator: 'match_phrase', value: 'at org.springframework' }
  ] as DslCondition[],
  minimumShouldMatch: 1
})

const generatedDsl = ref('')
const dslCollapseActive = ref(['dsl'])
const manualDsl = ref('')

// 生成 DSL JSON
const buildDslQuery = () => {
  const query: any = {
    size: dslConfig.size,
    query: {
      bool: {} as any
    }
  }

  // Must 条件
  if (dslConfig.mustConditions.length > 0) {
    query.query.bool.must = dslConfig.mustConditions.map(cond => {
      const fieldName = cond.field === 'custom' ? cond.customField : cond.field
      if (cond.operator === 'range') {
        return { range: { [fieldName]: { gte: cond.value } } }
      }
      return { [cond.operator]: { [fieldName]: cond.value } }
    })
  }

  // 时间范围 (添加到 must)
  if (!query.query.bool.must) {
    query.query.bool.must = []
  }
  if (dslConfig.timeRange === 'custom' && dslConfig.customStartTime) {
    query.query.bool.must.push({
      range: {
        '@timestamp': {
          gte: dslConfig.customStartTime.toISOString(),
          lte: (dslConfig.customEndTime || new Date()).toISOString()
        }
      }
    })
  } else if (dslConfig.timeRange !== 'custom') {
    query.query.bool.must.push({
      range: {
        '@timestamp': { gte: dslConfig.timeRange }
      }
    })
  }

  // Should 条件
  if (dslConfig.shouldConditions.length > 0) {
    query.query.bool.should = dslConfig.shouldConditions.map(cond => {
      const fieldName = cond.field === 'custom' ? cond.customField : cond.field
      return { [cond.operator]: { [fieldName]: cond.value } }
    })
    query.query.bool.minimum_should_match = dslConfig.minimumShouldMatch
  }

  return query
}

const previewDsl = () => {
  const dsl = buildDslQuery()
  generatedDsl.value = JSON.stringify(dsl, null, 2)
  dslCollapseActive.value = ['dsl'] // 展开折叠面板
}

const copyDsl = () => {
  navigator.clipboard.writeText(generatedDsl.value)
  ElMessage.success('DSL 已复制到剪贴板')
}

const addCondition = (type: 'must' | 'should') => {
  const newCondition: DslCondition = {
    field: 'message',
    customField: '',
    operator: 'match',
    value: ''
  }
  if (type === 'must') {
    dslConfig.mustConditions.push(newCondition)
  } else {
    dslConfig.shouldConditions.push(newCondition)
  }
}

const removeCondition = (type: 'must' | 'should', index: number) => {
  if (type === 'must') {
    dslConfig.mustConditions.splice(index, 1)
  } else {
    dslConfig.shouldConditions.splice(index, 1)
  }
}

const addPresetCondition = () => {
  const presets = [
    { field: 'message', customField: '', operator: 'match_phrase', value: 'Caused by:' },
    { field: 'message', customField: '', operator: 'match_phrase', value: 'Exception' },
    { field: 'level', customField: '', operator: 'match', value: 'ERROR' }
  ]
  const randomPreset = presets[Math.floor(Math.random() * presets.length)]
  dslConfig.shouldConditions.push({ ...randomPreset })
}

// 手动 DSL 相关方法
const formatManualDsl = () => {
  if (!manualDsl.value.trim()) return
  try {
    const parsed = JSON.parse(manualDsl.value)
    manualDsl.value = JSON.stringify(parsed, null, 2)
    ElMessage.success('DSL 格式化成功')
  } catch (e: any) {
    ElMessage.error(`JSON 格式错误: ${e.message}`)
  }
}

const loadManualDslToBuilder = () => {
  if (!manualDsl.value.trim()) return
  try {
    const parsed = JSON.parse(manualDsl.value)

    // 解析 size
    if (parsed.size) {
      dslConfig.size = parsed.size
    }

    // 解析时间范围
    if (parsed.query?.bool?.must) {
      const must = parsed.query.bool.must
      for (const cond of must) {
        if (cond.range?.['@timestamp']) {
          const gte = cond.range['@timestamp'].gte
          if (gte && gte.startsWith('now-')) {
            dslConfig.timeRange = gte
          }
        }
      }
    }

    // 解析 must 条件
    if (parsed.query?.bool?.must) {
      const must = parsed.query.bool.must
      dslConfig.mustConditions = []
      for (const cond of must) {
        if (!cond.range) {
          const operator = Object.keys(cond)[0]
          const field = Object.keys(cond[operator])[0]
          const value = cond[operator][field]
          dslConfig.mustConditions.push({
            field,
            customField: '',
            operator,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value)
          })
        }
      }
    }

    // 解析 should 条件
    if (parsed.query?.bool?.should) {
      const should = parsed.query.bool.should
      dslConfig.shouldConditions = []
      for (const cond of should) {
        const operator = Object.keys(cond)[0]
        const field = Object.keys(cond[operator])[0]
        const value = cond[operator][field]
        dslConfig.shouldConditions.push({
          field,
          customField: '',
          operator,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        })
      }
    }

    // 解析 minimum_should_match
    if (parsed.query?.bool?.minimum_should_match !== undefined) {
      dslConfig.minimumShouldMatch = parsed.query.bool.minimum_should_match
    }

    ElMessage.success('DSL 已加载到配置')
    previewDsl()
  } catch (e: any) {
    ElMessage.error(`解析失败: ${e.message}`)
  }
}

const clearManualDsl = () => {
  manualDsl.value = ''
}

// Analysis state - 流式输出
const analysisLoading = ref(false)
const analysisVisible = ref(false)
const analysisError = ref<string | null>(null)
const analyzingLog = ref<MockLogEntry | null>(null)
const streamOutput = ref('')
const currentSessionId = ref('')
const chatInput = ref('')
const chatLoading = ref(false)
const abortController = ref<(() => void) | null>(null)
const streamOutputRef = ref<HTMLElement | null>(null)

const queryForm = reactive({
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
    // 判断使用手动 DSL 还是配置化 DSL
    let dslQuery: any
    let dslJsonString: string

    if (manualDsl.value.trim()) {
      // 使用手动输入的 DSL
      try {
        dslQuery = JSON.parse(manualDsl.value)
        dslJsonString = manualDsl.value
        // 更新预览
        generatedDsl.value = manualDsl.value
      } catch (e: any) {
        ElMessage.error(`DSL JSON 格式错误: ${e.message}`)
        loading.value = false
        return
      }
    } else {
      // 使用配置化的 DSL 查询
      dslQuery = buildDslQuery()
      dslJsonString = JSON.stringify(dslQuery)
      // 自动更新预览
      generatedDsl.value = dslJsonString
    }

    // ========== MOCK 模式：非华为内网环境测试 ==========
    // TODO: 测试完成后将 mockMode 设为 false，恢复真实 API 调用
    const mockMode = true
    if (mockMode) {
      console.log('【MOCK 模式】返回模拟错误日志数据')
      const mockLogs = createMockLogs()
      logs.value = mockLogs
      pagination.total = mockLogs.length
      loading.value = false
      return
    }
    // ========== MOCK 模式结束 ==========

    const params: any = {
      dslQuery: dslJsonString
    }

    // 如果有快速筛选条件，添加到参数中
    if (queryForm.logLevel) params.logLevel = queryForm.logLevel
    if (queryForm.keyword) params.keyword = queryForm.keyword
    if (queryForm.traceId) params.traceId = queryForm.traceId

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

// ========== MOCK 数据函数 - 测试完成后删除 ==========
interface MockLogEntry {
  id: number
  timestamp: string
  level: string
  serviceName: string
  traceId: string
  hostname: string
  podName: string
  namespace: string
  errorType: string
  message: string
  stackTrace: string
  hasStackTrace: boolean
  lineCount: number
}

const createMockLogs = (): MockLogEntry[] => {
  const now = new Date()

  // 模拟 NullPointerException 错误
  const npeMessage = `2026-03-21 14:30:45.123 [http-nio-8080-exec-15 - MOCK-TRACE-001] ERROR c.h.p.s.i.UserServiceImpl : Failed to get user info

java.lang.NullPointerException: Cannot invoke "com.huawei.project.entity.User.getId()" because "user" is null
	at com.huawei.project.service.impl.UserServiceImpl.getUserById(UserServiceImpl.java:85)
	at com.huawei.project.controller.UserController.getUser(UserController.java:45)
	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:77)
	at java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.base/java.lang.reflect.Method.invoke(Method.java:568)
	at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)
	at org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:150)
	at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)
	at javax.servlet.http.HttpServlet.service(HttpServlet.java:623)
	at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)
Caused by: java.util.NoSuchElementException: No value present
	at java.base/java.util.Optional.orElseThrow(Optional.java:377)
	at com.huawei.project.repository.UserRepository.findById(UserRepository.java:32)
	at com.huawei.project.service.impl.UserServiceImpl.getUserById(UserServiceImpl.java:82)
	... 11 more`

  // 模拟 SQLException 错误
  const sqlMessage = `2026-03-21 14:25:30.456 [http-nio-8081-exec-8 - MOCK-TRACE-002] ERROR c.h.p.r.OrderRepository : Database connection failed

java.sql.SQLException: Connection refused
	at com.zaxxer.hikari.pool.HikariPool.createConnection(HikariPool.java:586)
	at com.zaxxer.hikari.pool.HikariPool$PoolEntryCreator.call(HikariPool.java:742)
	at com.zaxxer.hikari.pool.HikariPool$PoolEntryCreator.call(HikariPool.java:723)
	at java.base/java.util.concurrent.FutureTask.run(FutureTask.java:264)
	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:635)
	at java.base/java.lang.Thread.run(Thread.java:833)
Caused by: java.net.ConnectException: Connection refused
	at java.base/sun.nio.ch.Net.connect0(Native Method)
	at java.base/sun.nio.ch.Net.connect(Net.java:579)
	at java.base/sun.nio.ch.Net.connect(Net.java:568)
	at java.base/sun.nio.ch.SocketChannelImpl.connect(SocketChannelImpl.java:643)
	... 7 more`

  return [
    {
      id: 1,
      timestamp: now.toISOString(),
      level: 'ERROR',
      serviceName: 'com.huawei.project.service.impl.UserServiceImpl',
      traceId: `MOCK-TRACE-001-${Date.now()}`,
      hostname: 'pod-user-service-7f8b9c-x2k4m',
      podName: 'user-service-deployment-7f8b9c-x2k4m',
      namespace: 'production',
      errorType: 'NullPointerException',
      message: npeMessage,
      stackTrace: npeMessage,
      hasStackTrace: true,
      lineCount: 18
    },
    {
      id: 2,
      timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      level: 'ERROR',
      serviceName: 'com.huawei.project.repository.OrderRepository',
      traceId: `MOCK-TRACE-002-${Date.now()}`,
      hostname: 'pod-order-service-3a5b7c-p9q2r',
      podName: 'order-service-deployment-3a5b7c-p9q2r',
      namespace: 'production',
      errorType: 'SQLException',
      message: sqlMessage,
      stackTrace: sqlMessage,
      hasStackTrace: true,
      lineCount: 16
    }
  ]
}
// ========== MOCK 数据函数结束 ==========

const handleReset = () => {
  Object.assign(queryForm, {
    logLevel: 'ERROR',
    keyword: '',
    traceId: '',
    startTime: null,
    endTime: null
  })
  Object.assign(dslConfig, {
    size: 20,
    timeRange: 'now-15m',
    customStartTime: null,
    customEndTime: null,
    mustConditions: [],
    shouldConditions: [
      { field: 'message', customField: '', operator: 'match_phrase', value: 'Caused by:' },
      { field: 'message', customField: '', operator: 'match_phrase', value: '*ExceptionHandler' },
      { field: 'level', customField: '', operator: 'match', value: 'ERROR' },
      { field: 'level', customField: '', operator: 'match', value: 'SEVERE' },
      { field: 'message', customField: '', operator: 'match_phrase', value: '.*Exception' },
      { field: 'message', customField: '', operator: 'match_phrase', value: '.*Error' },
      { field: 'message', customField: '', operator: 'match_phrase', value: 'at org.springframework' }
    ],
    minimumShouldMatch: 1
  })
  generatedDsl.value = ''
  manualDsl.value = ''
  pagination.page = 1
  logs.value = []
  pagination.total = 0
}

const showDetail = (row: LogEntry) => {
  selectedLog.value = row
  detailVisible.value = true
}

const handleAnalyze = async (row: MockLogEntry) => {
  // Reset state
  analyzingLog.value = row as any
  analysisError.value = null
  streamOutput.value = ''
  currentSessionId.value = ''
  chatInput.value = ''
  analysisVisible.value = true
  analysisLoading.value = true

  try {
    // 使用流式 API
    abortController.value = claudeApi.streamAnalyze(
      {
        errorMessage: row.message || '',
        stackTrace: row.stackTrace || undefined,
        projectPath: row.serviceName || undefined
      },
      {
        onSession: (sessionId) => {
          currentSessionId.value = sessionId
        },
        onOutput: (line) => {
          streamOutput.value += line + '\n'
          // 自动滚动到底部
          nextTick(() => {
            if (streamOutputRef.value) {
              streamOutputRef.value.scrollTop = streamOutputRef.value.scrollHeight
            }
          })
        },
        onDone: (status) => {
          analysisLoading.value = false
          if (status === 'completed') {
            ElMessage.success('分析完成')
          }
        },
        onError: (error) => {
          analysisLoading.value = false
          analysisError.value = error
          ElMessage.error(`分析失败: ${error}`)
        }
      }
    )
  } catch (error: any) {
    analysisLoading.value = false
    analysisError.value = error.message || '分析过程中发生错误'
    ElMessage.error(`分析失败: ${analysisError.value}`)
    console.error('Analysis failed:', error)
  }
}

// 发送聊天消息
const sendChat = async () => {
  if (!chatInput.value.trim() || !currentSessionId.value || chatLoading.value) return

  const message = chatInput.value.trim()
  chatInput.value = ''
  chatLoading.value = true

  // 添加用户消息到输出
  streamOutput.value += `\n\n---\n**You:** ${message}\n\n**Claude:** `

  try {
    await claudeApi.streamChat(
      {
        sessionId: currentSessionId.value,
        message: message
      },
      {
        onOutput: (line) => {
          streamOutput.value += line + '\n'
          nextTick(() => {
            if (streamOutputRef.value) {
              streamOutputRef.value.scrollTop = streamOutputRef.value.scrollHeight
            }
          })
        },
        onDone: () => {
          chatLoading.value = false
        },
        onError: (error) => {
          chatLoading.value = false
          ElMessage.error(`发送失败: ${error}`)
        }
      }
    )
  } catch (error: any) {
    chatLoading.value = false
    ElMessage.error(`发送失败: ${error.message}`)
  }
}

// 复制输出
const copyOutput = () => {
  navigator.clipboard.writeText(streamOutput.value)
  ElMessage.success('已复制到剪贴板')
}

const closeAnalysisDialog = () => {
  // 取消正在进行的流式请求
  if (abortController.value) {
    abortController.value()
    abortController.value = null
  }
  // 结束会话
  if (currentSessionId.value) {
    claudeApi.endSession(currentSessionId.value).catch(() => {})
  }
  analysisVisible.value = false
  analyzingLog.value = null
  streamOutput.value = ''
  currentSessionId.value = ''
}
</script>

<style scoped>
.mt-4 {
  margin-top: 16px;
}

.dsl-builder-card {
  margin-bottom: 16px;
}

.dsl-builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.condition-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.condition-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.dsl-preview {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.form-hint {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.manual-dsl-section {
  margin-top: 12px;
}

.manual-dsl-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
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
/* 流式分析样式 */
.analysis-streaming,
.analysis-complete {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stream-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 8px;
}

.streaming-icon {
  font-size: 20px;
  color: #409eff;
}

.stream-output {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
}

.stream-output.complete {
  background: #282c34;
}

.stream-output pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-input {
  margin-top: 8px;
}

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