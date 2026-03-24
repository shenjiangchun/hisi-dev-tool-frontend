<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Download, Check, CopyDocument, Loading, Cpu, FolderOpened, SuccessFilled, WarningFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { mcpApi, type McpStatus } from '@/api/mcp'

const mcpInfo = ref<Record<string, unknown> | null>(null)
const loading = ref(true)
const downloading = ref(false)
const copySuccess = ref(false)

// 操作系统检测
const isWindows = navigator.platform.toLowerCase().includes('win')

// 后端状态
const backendRunning = ref(false)
const checkingBackend = ref(false)

// MCP 安装状态
const mcpStatus = ref<McpStatus | null>(null)
const checkingStatus = ref(false)

// 安装进度
const installing = ref(false)
const installStep = ref('')
const installLogs = ref<string[]>([])
const installSuccess = ref(false)
const installError = ref('')

// MCP 目录输入
const mcpDirInput = ref('')

// 加载 MCP 信息
onMounted(async () => {
  try {
    const response = await mcpApi.getInfo()
    mcpInfo.value = response.data as Record<string, unknown>
    await checkBackend()
    await checkMcpStatus()
  } catch (error) {
    console.error('Failed to load MCP info:', error)
  } finally {
    loading.value = false
  }
})

// 检测后端
async function checkBackend() {
  checkingBackend.value = true
  try {
    const response = await fetch('/actuator/health')
    backendRunning.value = response.ok
  } catch {
    backendRunning.value = false
  } finally {
    checkingBackend.value = false
  }
}

// 检查 MCP 状态
async function checkMcpStatus() {
  checkingStatus.value = true
  try {
    const response = await mcpApi.checkStatus(mcpDirInput.value || undefined)
    mcpStatus.value = response.data
    if (response.data.mcpDir && !mcpDirInput.value) {
      mcpDirInput.value = response.data.mcpDir
    }
  } catch {
    mcpStatus.value = { installed: false, message: '检查状态失败' }
  } finally {
    checkingStatus.value = false
  }
}

// 在线安装
async function startInstall() {
  if (!mcpDirInput.value) {
    ElMessage.warning('请输入 MCP 目录路径')
    return
  }

  installing.value = true
  installStep.value = ''
  installLogs.value = []
  installSuccess.value = false
  installError.value = ''

  try {
    await mcpApi.install(mcpDirInput.value, {
      onStep: (step) => {
        installStep.value = step
        installLogs.value.push(`[步骤] ${step}`)
      },
      onInfo: (info) => {
        installLogs.value.push(`[信息] ${info}`)
      },
      onSuccess: (msg) => {
        installLogs.value.push(`[成功] ${msg}`)
      },
      onWarning: (msg) => {
        installLogs.value.push(`[警告] ${msg}`)
      },
      onError: (error) => {
        installError.value = error
        installLogs.value.push(`[错误] ${error}`)
      },
      onLog: (log) => {
        installLogs.value.push(log)
      },
      onDone: () => {
        installSuccess.value = true
        installLogs.value.push('[完成] 安装成功！')
        checkMcpStatus()
      }
    })
  } catch (error) {
    installError.value = (error as Error).message
  } finally {
    installing.value = false
  }
}

// Claude 配置
const claudeConfig = computed(() => {
  const mcpPath = isWindows
    ? 'C:\\\\Users\\\\你的用户名\\\\projects\\\\hisi-dev-tool-mcp\\\\dist\\\\index.js'
    : '/Users/你的用户名/projects/hisi-dev-tool-mcp/dist/index.js'
  return JSON.stringify({
    mcpServers: {
      "hisi-dev-tool": {
        command: "node",
        args: [mcpPath],
        env: {
          HISI_API_URL: "http://localhost:8080/api/callchain",
          HISI_LOG_API_URL: "http://localhost:8080/api/log"
        }
      }
    }
  }, null, 2)
})

// 复制文本
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copySuccess.value = true
    ElMessage.success('已复制到剪贴板')
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch {
    ElMessage.error('复制失败')
  }
}

// 下载 MCP
async function downloadMCP() {
  downloading.value = true
  try {
    const url = mcpApi.getDownloadUrl()
    const a = document.createElement('a')
    a.href = url
    a.download = 'hisi-dev-tool-mcp.zip'
    a.click()
    ElMessage.success('开始下载')
  } catch {
    ElMessage.error('下载失败')
  } finally {
    downloading.value = false
  }
}

// MCP 工具列表
const tools = [
  { name: 'find_callers', desc: '向上查找调用方' },
  { name: 'find_callees', desc: '向下查找依赖' },
  { name: 'search_methods', desc: '搜索方法' },
  { name: 'list_projects', desc: '列出项目' },
  { name: 'list_uris', desc: '列出 URI' },
  { name: 'query_error_logs', desc: '查询错误日志' },
]
</script>

<template>
  <div class="mcp-guide">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <el-icon class="is-loading" :size="48"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <!-- 主内容 -->
    <template v-else>
      <!-- 头部 -->
      <div class="header">
        <div class="header-content">
          <div class="title">
            <el-icon :size="40" color="#409EFF"><Cpu /></el-icon>
            <div>
              <h1>MCP 安装指南</h1>
              <p>一键安装 Claude MCP，让 AI 理解你的代码</p>
            </div>
          </div>
          <div class="backend-status" :class="{ running: backendRunning }">
            <el-icon v-if="checkingBackend" class="is-loading"><Loading /></el-icon>
            <el-icon v-else-if="backendRunning"><Check /></el-icon>
            <span v-else>×</span>
            <span>后端服务: {{ backendRunning ? '运行中' : '未启动' }}</span>
          </div>
        </div>
      </div>

      <!-- 安装状态卡片 -->
      <el-card class="status-card">
        <template #header>
          <div class="card-header">
            <span>MCP 安装状态</span>
            <el-button size="small" @click="checkMcpStatus" :loading="checkingStatus">
              刷新状态
            </el-button>
          </div>
        </template>

        <div v-if="mcpStatus" class="status-info">
          <div class="status-item">
            <el-icon v-if="mcpStatus.packageJsonExists" color="#67C23A"><SuccessFilled /></el-icon>
            <el-icon v-else color="#F56C6C"><CircleCloseFilled /></el-icon>
            <span>package.json</span>
          </div>
          <div class="status-item">
            <el-icon v-if="mcpStatus.nodeModulesExists" color="#67C23A"><SuccessFilled /></el-icon>
            <el-icon v-else color="#E6A23C"><WarningFilled /></el-icon>
            <span>node_modules</span>
          </div>
          <div class="status-item">
            <el-icon v-if="mcpStatus.distExists" color="#67C23A"><SuccessFilled /></el-icon>
            <el-icon v-else color="#E6A23C"><WarningFilled /></el-icon>
            <span>dist (构建产物)</span>
          </div>
          <div class="status-item">
            <el-icon v-if="mcpStatus.claudeConfigExists" color="#67C23A"><SuccessFilled /></el-icon>
            <el-icon v-else color="#E6A23C"><WarningFilled /></el-icon>
            <span>Claude 配置</span>
          </div>
        </div>

        <div v-if="mcpStatus?.installed" class="installed-badge">
          <el-tag type="success" size="large">
            <el-icon><SuccessFilled /></el-icon>
            MCP 已安装
          </el-tag>
        </div>
      </el-card>

      <!-- 在线安装 -->
      <el-card class="install-card">
        <template #header>
          <div class="card-header">
            <span>方式一：在线安装（推荐）</span>
            <el-tag type="success" size="small">实时进度</el-tag>
          </div>
        </template>

        <div class="install-steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-content">
              <strong>下载 MCP 包并解压</strong>
              <el-button type="primary" :loading="downloading" @click="downloadMCP">
                <el-icon><Download /></el-icon>
                下载 MCP
              </el-button>
            </div>
          </div>

          <div class="step">
            <div class="step-num">2</div>
            <div class="step-content">
              <strong>输入解压后的目录路径</strong>
              <div class="dir-input">
                <el-input
                  v-model="mcpDirInput"
                  placeholder="例如: C:\Users\用户名\projects\hisi-dev-tool-mcp"
                  :disabled="installing"
                >
                  <template #prepend>
                    <el-icon><FolderOpened /></el-icon>
                  </template>
                </el-input>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">3</div>
            <div class="step-content">
              <strong>点击安装按钮</strong>
              <el-button
                type="success"
                :loading="installing"
                :disabled="!mcpDirInput"
                @click="startInstall"
              >
                <el-icon><Check /></el-icon>
                {{ installing ? '安装中...' : '开始安装' }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- 安装进度 -->
        <div v-if="installing || installLogs.length > 0" class="install-progress">
          <div class="progress-header">
            <span v-if="installing" class="progress-title">
              <el-icon class="is-loading"><Loading /></el-icon>
              正在安装... {{ installStep }}
            </span>
            <span v-else-if="installSuccess" class="progress-title success">
              <el-icon><SuccessFilled /></el-icon>
              安装成功
            </span>
            <span v-else-if="installError" class="progress-title error">
              <el-icon><CircleCloseFilled /></el-icon>
              安装失败
            </span>
          </div>
          <div class="log-container">
            <div v-for="(log, index) in installLogs" :key="index" class="log-line">
              {{ log }}
            </div>
          </div>
        </div>
      </el-card>

      <!-- 手动配置 -->
      <el-card class="manual-card">
        <template #header>
          <div class="card-header">
            <span>方式二：手动配置</span>
            <el-tag type="info" size="small">高级用户</el-tag>
          </div>
        </template>

        <el-collapse>
          <el-collapse-item title="查看手动配置步骤" name="manual">
            <el-steps direction="vertical" :active="4">
              <el-step title="安装依赖并构建">
                <template #description>
                  <div class="code-block">
                    <code>cd hisi-dev-tool-mcp && npm install && npm run build</code>
                  </div>
                </template>
              </el-step>
              <el-step title="配置 Claude Desktop">
                <template #description>
                  <p>编辑配置文件：<code>{{ isWindows ? '%APPDATA%\\Claude\\claude_desktop_config.json' : '~/Library/Application Support/Claude/claude_desktop_config.json' }}</code></p>
                  <div class="code-block">
                    <el-button class="copy-btn" size="small" @click="copyText(claudeConfig)">复制</el-button>
                    <pre><code>{{ claudeConfig }}</code></pre>
                  </div>
                </template>
              </el-step>
              <el-step title="重启 Claude Desktop" />
            </el-steps>
          </el-collapse-item>
        </el-collapse>
      </el-card>

      <!-- 可用工具 -->
      <el-card class="tools-card">
        <template #header>
          <span>安装后可用工具</span>
        </template>
        <div class="tools-grid">
          <div v-for="tool in tools" :key="tool.name" class="tool-item">
            <code>{{ tool.name }}</code>
            <span>{{ tool.desc }}</span>
          </div>
        </div>
      </el-card>

      <!-- 常见问题 -->
      <el-card class="faq-card">
        <template #header>
          <span>常见问题</span>
        </template>
        <el-collapse>
          <el-collapse-item title="MCP 工具不显示？" name="1">
            <ol>
              <li>确认配置文件 JSON 格式正确</li>
              <li>确认 <code>dist/index.js</code> 文件存在</li>
              <li>重启 Claude Desktop</li>
            </ol>
          </el-collapse-item>
          <el-collapse-item title="API 调用失败？" name="2">
            <p>确保后端服务运行中：</p>
            <div class="code-block">
              <code>curl http://localhost:8080/actuator/health</code>
            </div>
          </el-collapse-item>
          <el-collapse-item title="调用链数据为空？" name="3">
            <p>需要先生成调用链数据：</p>
            <div class="code-block">
              <code>curl -X POST http://localhost:8080/api/method_chain/generate</code>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.mcp-guide {
  min-height: 100%;
  background: #f5f7fa;
  padding: 24px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #909399;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px;
  border-radius: 12px;
  color: white;
  margin-bottom: 24px;
}

.header-content {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title h1 {
  margin: 0;
  font-size: 24px;
}

.title p {
  margin: 4px 0 0;
  opacity: 0.9;
  font-size: 14px;
}

.backend-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.2);
  border-radius: 20px;
  font-size: 14px;
}

.backend-status.running {
  background: rgba(103, 194, 58, 0.3);
}

.status-card, .install-card, .manual-card, .tools-card, .faq-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.installed-badge {
  margin-top: 16px;
  text-align: center;
}

.install-steps {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px 0;
}

.step {
  display: flex;
  gap: 16px;
}

.step-num {
  width: 32px;
  height: 32px;
  background: #409EFF;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content strong {
  display: block;
  margin-bottom: 8px;
}

.dir-input {
  max-width: 500px;
}

.install-progress {
  margin-top: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.progress-header {
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.progress-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.progress-title.success {
  color: #67C23A;
}

.progress-title.error {
  color: #F56C6C;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  padding: 12px 16px;
  background: #1e1e1e;
  font-family: 'Consolas', monospace;
  font-size: 13px;
}

.log-line {
  color: #d4d4d4;
  line-height: 1.6;
  white-space: pre-wrap;
}

.log-line:has([错误]) {
  color: #f56c6c;
}

.log-line:has([成功]) {
  color: #67c23a;
}

.log-line:has([警告]) {
  color: #e6a23c;
}

.code-block {
  position: relative;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  margin: 8px 0;
}

.code-block .copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}

.code-block pre, .code-block code {
  margin: 0;
  font-family: 'Consolas', monospace;
  font-size: 13px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.tool-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.tool-item code {
  color: #409EFF;
  font-size: 13px;
}

.tool-item span {
  font-size: 12px;
  color: #909399;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }

  .status-info {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
