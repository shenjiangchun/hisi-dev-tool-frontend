<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import {
  Download,
  Document,
  Cpu,
  Check,
  CopyDocument,
  ArrowRight,
  Warning,
  FolderOpened,
  Monitor,
  Loading,
  CircleClose,
  CircleCheck
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { mcpApi, type McpInfo } from '@/api/mcp'

// MCP 信息
const mcpInfo = ref<McpInfo | null>(null)
const loading = ref(true)

// 当前步骤
const currentStep = ref(0)

// 复制状态
const copySuccess = ref<string | null>(null)

// 操作系统检测
const isWindows = navigator.platform.toLowerCase().includes('win')
const isMac = navigator.platform.toLowerCase().includes('mac')

// 下载状态
const downloading = ref(false)

// 每一步的完成状态（简化版，仅追踪自动检测项）
interface StepStatus {
  backendRunning: boolean
  mcpDownloaded: boolean
}

const stepStatus = reactive<StepStatus>({
  backendRunning: false,
  mcpDownloaded: false
})

// 环境检测状态
const envChecking = reactive({
  nodejs: false,
  backend: false
})

// 每一步的提示清单
const stepChecklists: {
  title: string
  description: string
  items: { label: string; autoCheck?: boolean }[]
}[] = [
  // 步骤 0: 检查环境
  {
    title: '检查环境',
    description: '验证 Node.js 和 Claude Desktop',
    items: [
      { label: '安装 Node.js 18+' },
      { label: '安装 Claude Desktop' },
      { label: '启动后端服务', autoCheck: true }
    ]
  },
  // 步骤 1: 下载 MCP
  {
    title: '下载 MCP',
    description: '获取 MCP 安装包',
    items: [
      { label: '下载并解压 MCP 安装包' },
      { label: '运行安装脚本' }
    ]
  },
  // 步骤 2: 安装配置
  {
    title: '安装配置',
    description: '配置 Claude Desktop',
    items: [
      { label: '打开配置文件目录' },
      { label: '添加 MCP 配置' },
      { label: '重启 Claude Desktop' }
    ]
  },
  // 步骤 3: 安装 Skills
  {
    title: '安装 Skills',
    description: '安装 Claude Code Skills',
    items: [
      { label: '下载或复制安装脚本' },
      { label: '运行脚本安装 Skills' }
    ]
  },
  // 步骤 4: 验证安装
  {
    title: '验证安装',
    description: '测试 MCP 是否正常工作',
    items: [
      { label: '在 Claude Code 中测试命令' }
    ]
  }
]

// 安装步骤
const installSteps = computed(() => stepChecklists.map(s => ({
  title: s.title,
  description: s.description
})))

// MCP 功能列表
const mcpFeatures = computed(() => {
  if (!mcpInfo.value) return []
  return [
    {
      icon: '🔗',
      title: '调用链分析',
      tools: mcpInfo.value.tools.filter(t => ['find_callers', 'find_callees', 'get_call_chain', 'search_methods'].includes(t.name)).map(t => t.name),
      description: '向上查找 URI 入口，向下分析方法依赖'
    },
    {
      icon: '📋',
      title: '日志查询',
      tools: mcpInfo.value.tools.filter(t => ['query_error_logs', 'query_logs', 'get_log_detail'].includes(t.name)).map(t => t.name),
      description: '错误日志自动查询，堆栈信息分析'
    },
    {
      icon: '📝',
      title: '接口分析',
      tools: mcpInfo.value.tools.filter(t => ['analyze_interface', 'generate_interface_doc', 'check_code_standards'].includes(t.name)).map(t => t.name),
      description: '接口文档生成，代码规范检查'
    }
  ]
})

// 使用案例
const useCases = [
  {
    title: '问题自动定位',
    skill: 'problem-diagnosis',
    input: '系统报错了，帮我看看',
    output: '自动查询错误日志 → 分析堆栈 → 定位问题代码 → 给出修复建议'
  },
  {
    title: '影响分析',
    skill: 'impact-analysis',
    input: '修改 UserService.getUser 方法会影响哪些 API？',
    output: '查找所有调用该方法的 URI 入口 → 展示完整调用链 → 评估影响范围'
  },
  {
    title: '接口文档生成',
    skill: 'interface-analysis',
    input: '分析 /api/users 接口的实现逻辑',
    output: '获取调用链 → 列出所有方法 → 生成文档 → 检查代码规范'
  }
]

// 配置模板
const configTemplate = computed(() => {
  const mcpPath = isWindows
    ? 'C:/Users/你的用户名/projects/hisi-dev-tool-mcp/dist/index.js'
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

// 安装脚本
const installScript = computed(() => {
  if (isWindows) {
    return `@echo off
echo === HiSi DevTool MCP 安装脚本 ===
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)
echo [OK] Node.js 已安装

REM 安装依赖
echo.
echo 正在安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 安装依赖失败
    pause
    exit /b 1
)
echo [OK] 依赖安装完成

REM 构建
echo.
echo 正在构建...
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 构建失败
    pause
    exit /b 1
)
echo [OK] 构建完成

REM 安装 Skills
echo.
echo 正在安装 Skills...
call install-skills.bat
echo [OK] Skills 安装完成

echo.
echo === 安装完成 ===
echo 请按照文档配置 Claude Desktop
pause`
  } else {
    return `#!/bin/bash
echo "=== HiSi DevTool MCP 安装脚本 ==="
echo

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi
echo "[OK] Node.js 已安装"

# 安装依赖
echo
echo "正在安装依赖..."
npm install || { echo "[错误] 安装依赖失败"; exit 1; }
echo "[OK] 依赖安装完成"

# 构建
echo
echo "正在构建..."
npm run build || { echo "[错误] 构建失败"; exit 1; }
echo "[OK] 构建完成"

# 安装 Skills
echo
echo "正在安装 Skills..."
chmod +x install-skills.sh
./install-skills.sh
echo "[OK] Skills 安装完成"

echo
echo "=== 安装完成 ==="
echo "请按照文档配置 Claude Desktop"`
  }
})

// 加载 MCP 信息
onMounted(async () => {
  try {
    const response = await mcpApi.getInfo()
    mcpInfo.value = response.data

    // 自动检测环境
    await checkEnvironment()
  } catch (error) {
    console.error('Failed to load MCP info:', error)
  } finally {
    loading.value = false
  }
})

// 检测环境
async function checkEnvironment() {
  // 检测 Node.js (通过用户确认)
  // 由于浏览器无法直接检测本地环境，我们默认标记为需要用户确认

  // 检测后端服务
  envChecking.backend = true
  try {
    const response = await fetch('/actuator/health')
    if (response.ok) {
      stepStatus.backendRunning = true
    }
  } catch {
    stepStatus.backendRunning = false
  }
  envChecking.backend = false
}

// 复制文本
async function copyText(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copySuccess.value = key
    ElMessage.success('已复制到剪贴板')
    setTimeout(() => {
      copySuccess.value = null
    }, 2000)
  } catch {
    ElMessage.error('复制失败')
  }
}

// 下载文件
function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('下载完成')
}

// 下载 MCP
async function downloadMCP() {
  downloading.value = true
  try {
    const url = mcpApi.getDownloadUrl()
    const a = document.createElement('a')
    a.href = url
    a.download = 'hisi-dev-tool-mcp-v1.2.0.zip'
    a.click()
    ElMessage.success('开始下载 MCP 安装包')
    stepStatus.mcpDownloaded = true
  } catch (error) {
    ElMessage.error('下载失败')
  } finally {
    downloading.value = false
  }
}

// 获取 Claude 配置文件路径
const claudeConfigPath = computed(() => {
  if (isWindows) {
    return '%APPDATA%\\Claude\\claude_desktop_config.json'
  } else if (isMac) {
    return '~/Library/Application Support/Claude/claude_desktop_config.json'
  }
  return '~/.config/claude/claude_desktop_config.json'
})

// Skills 路径
const skillsPath = computed(() => {
  if (isWindows) {
    return '%USERPROFILE%\\.claude\\skills\\'
  }
  return '~/.claude/skills/'
})

// 打开外部链接
function openUrl(url: string) {
  window.open(url, '_blank')
}
</script>

<template>
  <div class="mcp-guide-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="48"><Loading /></el-icon>
      <p>加载 MCP 信息...</p>
    </div>

    <!-- 主内容 -->
    <template v-else>
    <!-- 头部 -->
    <div class="guide-header">
      <div class="header-content">
        <div class="logo-section">
          <el-icon :size="48" color="#409EFF"><Cpu /></el-icon>
          <div class="title-section">
            <h1>MCP 使用指南</h1>
            <p>Model Context Protocol - 让 AI 助手理解你的代码</p>
          </div>
        </div>
        <div class="download-section">
          <el-button
            type="primary"
            size="large"
            :icon="Download"
            :loading="downloading"
            @click="downloadMCP"
          >
            {{ downloading ? '正在打包...' : '下载 MCP 安装包' }}
          </el-button>
          <p class="version-info">版本: v1.2.0 | 支持 Windows/macOS/Linux</p>
        </div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="guide-content">
      <!-- 快速导航 -->
      <div class="quick-nav">
        <el-card v-for="(feature, index) in mcpFeatures" :key="index" class="feature-card">
          <template #header>
            <div class="feature-header">
              <span class="feature-icon">{{ feature.icon }}</span>
              <span>{{ feature.title }}</span>
            </div>
          </template>
          <p>{{ feature.description }}</p>
          <div class="tool-tags">
            <el-tag v-for="tool in feature.tools" :key="tool" size="small" type="info">
              {{ tool }}
            </el-tag>
          </div>
        </el-card>
      </div>

      <!-- 安装步骤 -->
      <el-card class="section-card">
        <template #header>
          <div class="section-header">
            <el-icon :size="24"><FolderOpened /></el-icon>
            <h2>安装步骤</h2>
          </div>
        </template>

        <el-steps :active="currentStep" finish-status="success" align-center>
          <el-step
            v-for="(step, index) in installSteps"
            :key="index"
            :title="step.title"
            :description="step.description"
            :status="index < currentStep ? 'success' : index === currentStep ? 'process' : 'wait'"
          />
        </el-steps>

        <!-- 当前步骤提示清单 -->
        <div class="step-checklist">
          <div class="checklist-header">
            <span>本步骤要点</span>
          </div>
          <div class="checklist-items">
            <div
              v-for="(item, index) in stepChecklists[currentStep].items"
              :key="index"
              class="checklist-item"
            >
              <el-icon :size="18" color="#409EFF"><Check /></el-icon>
              <span class="item-label">
                {{ item.label }}
                <el-tag v-if="item.autoCheck" size="small" type="success">自动检测</el-tag>
              </span>
            </div>
          </div>
        </div>

        <div class="step-buttons">
          <el-button :disabled="currentStep === 0" @click="currentStep--">上一步</el-button>
          <el-button
            v-if="currentStep < installSteps.length - 1"
            type="primary"
            @click="currentStep++"
          >
            下一步
          </el-button>
          <el-button
            v-else
            type="success"
            @click="currentStep = 0"
          >
            重新开始
          </el-button>
        </div>

        <!-- 步骤详情 -->
        <div class="step-details">
          <!-- 步骤 1: 环境检查 -->
          <div v-show="currentStep === 0" class="step-content">
            <h3><el-icon><Check /></el-icon> 环境要求</h3>
            <el-alert type="info" :closable="false" show-icon>
              <template #title>
                <span>检测到您的操作系统: <strong>{{ isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux' }}</strong></span>
              </template>
            </el-alert>

            <div class="requirement-list">
              <div class="requirement-item">
                <el-icon color="#409EFF"><Monitor /></el-icon>
                <div class="req-info">
                  <strong>Node.js 18+</strong>
                  <p>运行 MCP 必需，请在终端运行 <code>node -v</code> 检查版本</p>
                </div>
                <el-button size="small" @click="openUrl('https://nodejs.org/')">
                  下载 Node.js
                </el-button>
              </div>

              <div class="requirement-item">
                <el-icon color="#409EFF"><Monitor /></el-icon>
                <div class="req-info">
                  <strong>Claude Desktop</strong>
                  <p>用于配置 MCP Server，请在开始菜单搜索 Claude</p>
                </div>
                <el-button size="small" @click="openUrl('https://claude.ai/download')">
                  下载 Claude
                </el-button>
              </div>

              <div class="requirement-item" :class="{ success: stepStatus.backendRunning, error: !stepStatus.backendRunning }">
                <el-icon :color="stepStatus.backendRunning ? '#67C23A' : '#F56C6C'">
                  <CircleCheck v-if="stepStatus.backendRunning" />
                  <Loading v-else-if="envChecking.backend" class="is-loading" />
                  <CircleClose v-else />
                </el-icon>
                <div class="req-info">
                  <strong>后端服务</strong>
                  <p>本地运行在 http://localhost:8080</p>
                </div>
                <el-tag v-if="stepStatus.backendRunning" type="success" size="small">
                  <el-icon><CircleCheck /></el-icon> 运行中
                </el-tag>
                <el-tag v-else type="danger" size="small">未启动</el-tag>
              </div>
            </div>

            <el-alert v-if="!stepStatus.backendRunning" type="warning" :closable="false" show-icon class="mt-4">
              <template #title>
                后端服务未启动，请先启动后端服务：<code>mvn spring-boot:run</code>
              </template>
            </el-alert>
          </div>

          <!-- 步骤 2: 下载 MCP -->
          <div v-show="currentStep === 1" class="step-content">
            <h3><el-icon><Download /></el-icon> 下载 MCP 安装包</h3>

            <div class="download-options">
              <el-card
                shadow="hover"
                class="download-card"
                :class="{ downloaded: stepStatus.mcpDownloaded }"
                @click="downloadMCP"
              >
                <div class="download-icon">
                  <el-icon :size="48" :color="stepStatus.mcpDownloaded ? '#67C23A' : '#409EFF'">
                    <CircleCheck v-if="stepStatus.mcpDownloaded" />
                    <Download v-else />
                  </el-icon>
                </div>
                <h4>MCP Server</h4>
                <p>包含所有工具和 Skills</p>
                <el-button
                  :type="stepStatus.mcpDownloaded ? 'success' : 'primary'"
                  :loading="downloading"
                >
                  {{ stepStatus.mcpDownloaded ? '已下载' : downloading ? '打包中...' : '立即下载' }}
                </el-button>
              </el-card>
            </div>

            <el-alert type="info" :closable="false" show-icon class="mt-4">
              <template #title>
                <p><strong>下载后操作：</strong></p>
                <ol class="download-steps">
                  <li>解压 ZIP 文件到目标目录（如 <code>{{ isWindows ? 'C:\\projects\\hisi-dev-tool-mcp' : '~/projects/hisi-dev-tool-mcp' }}</code>）</li>
                  <li>进入解压目录，运行 <code>{{ isWindows ? 'install-mcp.bat' : './install-mcp.sh' }}</code></li>
                </ol>
              </template>
            </el-alert>
          </div>

          <!-- 步骤 3: 配置 Claude Desktop -->
          <div v-show="currentStep === 2" class="step-content">
            <h3><el-icon><Document /></el-icon> 配置 Claude Desktop</h3>

            <el-steps direction="vertical" :active="3">
              <el-step title="打开配置文件">
                <template #description>
                  <p>配置文件位置: <code>{{ claudeConfigPath }}</code></p>
                  <el-button size="small" :icon="CopyDocument" @click="copyText(claudeConfigPath, 'path')">
                    复制路径
                  </el-button>
                </template>
              </el-step>

              <el-step title="添加 MCP 配置">
                <template #description>
                  <p>将以下配置添加到 <code>claude_desktop_config.json</code> 文件中:</p>
                  <div class="code-block">
                    <el-button class="copy-btn" size="small" :icon="CopyDocument" @click="copyText(configTemplate, 'config')">
                      复制
                    </el-button>
                    <pre><code>{{ configTemplate }}</code></pre>
                  </div>
                  <el-alert type="warning" :closable="false" show-icon class="mt-3">
                    <template #title>
                      <strong>重要：</strong>请将 <code>args</code> 中的路径修改为您实际的 MCP 安装路径
                    </template>
                  </el-alert>
                </template>
              </el-step>

              <el-step title="重启 Claude Desktop">
                <template #description>
                  <p>保存配置文件后，<strong>关闭并重新打开 Claude Desktop</strong> 使配置生效</p>
                </template>
              </el-step>
            </el-steps>
          </div>

          <!-- 步骤 4: 安装 Skills -->
          <div v-show="currentStep === 3" class="step-content">
            <h3><el-icon><Document /></el-icon> 安装 Skills</h3>

            <p>Skills 是 Claude Code 的"大脑"，指导 Claude 何时、如何使用 MCP 工具。</p>

            <div class="install-script-section">
              <div class="script-header">
                <span>安装脚本</span>
                <div>
                  <el-button size="small" :icon="Download" @click="downloadFile(installScript, isWindows ? 'install-mcp.bat' : 'install-mcp.sh')">
                    下载脚本
                  </el-button>
                  <el-button size="small" :icon="CopyDocument" @click="copyText(installScript, 'script')">
                    复制
                  </el-button>
                </div>
              </div>
              <div class="code-block">
                <pre><code>{{ installScript }}</code></pre>
              </div>
            </div>

            <el-alert type="info" :closable="false" show-icon class="mt-4">
              <template #title>
                <p><strong>操作步骤：</strong></p>
                <ol class="download-steps">
                  <li>在 MCP 解压目录下运行脚本：<code>{{ isWindows ? 'install-mcp.bat' : './install-mcp.sh' }}</code></li>
                  <li>Skills 将安装到: <code>{{ skillsPath }}</code></li>
                </ol>
              </template>
            </el-alert>

            <div class="skills-list mt-4">
              <h4>将安装的 Skills:</h4>
              <el-row :gutter="12">
                <el-col :span="12" v-for="skill in ['problem-diagnosis', 'call-chain-analysis', 'impact-analysis', 'interface-analysis']" :key="skill">
                  <el-card shadow="never" class="skill-card">
                    <el-icon color="#409EFF"><Document /></el-icon>
                    <span>{{ skill }}.md</span>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </div>

          <!-- 步骤 5: 验证安装 -->
          <div v-show="currentStep === 4" class="step-content">
            <h3><el-icon><Check /></el-icon> 验证安装</h3>

            <el-result icon="success" title="配置完成!" sub-title="请在 Claude Code 中使用以下命令测试 MCP 是否正常工作">
              <template #extra>
                <div class="test-cases">
                  <el-card v-for="(useCase, index) in useCases" :key="index" class="test-case-card">
                    <template #header>
                      <div class="case-header">
                        <el-tag>{{ useCase.skill }}</el-tag>
                        <span>{{ useCase.title }}</span>
                      </div>
                    </template>
                    <div class="case-content">
                      <div class="case-input">
                        <strong>输入:</strong>
                        <code>{{ useCase.input }}</code>
                      </div>
                      <el-icon><ArrowRight /></el-icon>
                      <div class="case-output">
                        <strong>输出:</strong>
                        <span>{{ useCase.output }}</span>
                      </div>
                    </div>
                  </el-card>
                </div>
              </template>
            </el-result>
          </div>
        </div>
      </el-card>

      <!-- 使用案例 -->
      <el-card class="section-card">
        <template #header>
          <div class="section-header">
            <el-icon :size="24"><Monitor /></el-icon>
            <h2>使用案例</h2>
          </div>
        </template>

        <el-tabs>
          <el-tab-pane v-for="(useCase, index) in useCases" :key="index" :label="useCase.title">
            <div class="use-case-detail">
              <el-steps direction="vertical" :active="4">
                <el-step title="触发 Skill">
                  <template #description>
                    <p>在 Claude Code 中输入:</p>
                    <div class="code-block inline">
                      <code>{{ useCase.input }}</code>
                      <el-button size="small" :icon="CopyDocument" @click="copyText(useCase.input, `case-${index}`)" />
                    </div>
                  </template>
                </el-step>
                <el-step title="MCP 自动调用">
                  <template #description>
                    <p>Claude 会自动识别并调用相关的 MCP 工具</p>
                  </template>
                </el-step>
                <el-step title="获取结果">
                  <template #description>
                    <p>{{ useCase.output }}</p>
                  </template>
                </el-step>
                <el-step title="继续对话">
                  <template #description>
                    <p>基于分析结果，继续与 Claude 对话以获取更详细的帮助</p>
                  </template>
                </el-step>
              </el-steps>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>

      <!-- 常见问题 -->
      <el-card class="section-card">
        <template #header>
          <div class="section-header">
            <el-icon :size="24"><Warning /></el-icon>
            <h2>常见问题</h2>
          </div>
        </template>

        <el-collapse>
          <el-collapse-item title="MCP 工具不显示怎么办?" name="1">
            <ol>
              <li>检查 Claude Desktop 配置文件路径是否正确</li>
              <li>确认 JSON 格式正确（无多余逗号）</li>
              <li>确认 <code>dist/index.js</code> 文件存在</li>
              <li>确认已重启 Claude Desktop</li>
            </ol>
          </el-collapse-item>

          <el-collapse-item title="API 调用失败怎么办?" name="2">
            <p>检查后端服务是否运行:</p>
            <div class="code-block inline">
              <code>curl http://localhost:8080/actuator/health</code>
            </div>
            <p class="mt-2">期望返回: <code>{"status":"UP"}</code></p>
          </el-collapse-item>

          <el-collapse-item title="Skills 未生效怎么办?" name="3">
            <p>检查 Skills 目录:</p>
            <div class="code-block inline">
              <code>ls {{ skillsPath }}</code>
            </div>
            <p class="mt-2">应看到以下文件:</p>
            <ul>
              <li v-for="skill in ['problem-diagnosis.md', 'call-chain-analysis.md', 'impact-analysis.md', 'interface-analysis.md']" :key="skill">
                {{ skill }}
              </li>
            </ul>
          </el-collapse-item>

          <el-collapse-item title="调用链数据为空怎么办?" name="4">
            <p>需要先生成调用链数据:</p>
            <div class="code-block inline">
              <code>curl -X POST "http://localhost:8080/api/method_chain/generate"</code>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-card>

      <!-- 工具参考 -->
      <el-card class="section-card">
        <template #header>
          <div class="section-header">
            <el-icon :size="24"><Document /></el-icon>
            <h2>MCP 工具参考</h2>
          </div>
        </template>

        <el-table :data="[
          { name: 'find_callers', params: 'method', desc: '向上查找 URI 入口' },
          { name: 'find_callees', params: 'method, max_depth', desc: '向下查找调用链' },
          { name: 'search_methods', params: 'keyword', desc: '搜索方法' },
          { name: 'get_call_chain', params: 'uri', desc: '获取 URI 调用链' },
          { name: 'list_projects', params: '-', desc: '列出项目' },
          { name: 'list_uris', params: 'project', desc: '列出 URI' },
          { name: 'query_error_logs', params: 'time_range, size', desc: '查询错误日志' },
          { name: 'query_logs', params: 'dsl_query', desc: '自定义日志查询' },
          { name: 'analyze_interface', params: 'uri', desc: '接口完整分析' },
          { name: 'generate_interface_doc', params: 'uri, doc_format', desc: '生成接口文档' },
          { name: 'check_code_standards', params: 'uri, check_types', desc: '代码规范检查' },
        ]" stripe>
          <el-table-column prop="name" label="工具名称" width="200">
            <template #default="{ row }">
              <code>{{ row.name }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="params" label="参数" width="200">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ row.params }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="desc" label="说明" />
        </el-table>
      </el-card>
    </div>
    </template>
  </div>
</template>

<style scoped>
.mcp-guide-container {
  min-height: 100%;
  background: #f5f7fa;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #909399;
}

.loading-container p {
  margin-top: 16px;
}

.guide-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px;
  color: white;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.title-section h1 {
  margin: 0;
  font-size: 28px;
}

.title-section p {
  margin: 8px 0 0;
  opacity: 0.9;
}

.download-section {
  text-align: center;
}

.version-info {
  margin: 10px 0 0;
  font-size: 12px;
  opacity: 0.8;
}

.guide-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.quick-nav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.feature-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-icon {
  font-size: 24px;
}

.tool-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 12px;
}

.section-card {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-header h2 {
  margin: 0;
}

/* 步骤清单样式 */
.step-checklist {
  margin: 20px 0;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.checklist-header {
  margin-bottom: 12px;
  font-weight: 500;
  color: #606266;
}

.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  transition: all 0.3s;
}

.checklist-item.completed {
  background: #f0f9eb;
}

.checklist-item .el-icon {
  flex-shrink: 0;
}

.checklist-item.completed .el-icon {
  color: #67C23A;
}

.checklist-item:not(.completed) .el-icon {
  color: #909399;
}

.item-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.incomplete-alert {
  margin: 16px 0;
}

/* 完成状态样式 */
.requirement-item.completed {
  background: #f0f9eb;
  border-color: #67C23A;
}

.download-card.completed {
  border-color: #67C23A;
  background: #f0f9eb;
}

.skill-card.completed {
  background: #f0f9eb;
  border-color: #67C23A;
}

.confirm-install {
  text-align: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.step-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 24px 0;
}

.step-details {
  margin-top: 32px;
  padding: 24px;
  background: #fafafa;
  border-radius: 8px;
}

.step-content h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.requirement-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.req-info {
  flex: 1;
}

.req-info strong {
  display: block;
}

.req-info p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
}

.download-options {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.download-card {
  flex: 1;
  text-align: center;
  cursor: pointer;
}

.download-card:hover {
  border-color: #409EFF;
}

.download-icon {
  margin-bottom: 16px;
}

.download-card h4 {
  margin: 0 0 8px;
}

.download-card p {
  margin: 0 0 16px;
  color: #909399;
  font-size: 14px;
}

.code-block {
  position: relative;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

.code-block .copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}

.code-block pre {
  margin: 0;
}

.code-block code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.code-block.inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.code-block.inline code {
  background: transparent;
  padding: 0;
}

.install-script-section {
  margin-top: 20px;
}

.script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.skills-list h4 {
  margin-bottom: 12px;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.test-cases {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.test-case-card {
  margin-bottom: 0;
}

.case-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.case-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.case-input code {
  display: block;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 4px;
}

.case-output span {
  display: block;
  margin-top: 4px;
  color: #67C23A;
}

.use-case-detail {
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    text-align: center;
  }

  .quick-nav {
    grid-template-columns: 1fr;
  }

  .download-options {
    flex-direction: column;
  }
}
</style>