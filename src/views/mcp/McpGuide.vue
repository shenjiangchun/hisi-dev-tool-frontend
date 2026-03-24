<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Download, Check, CopyDocument, Loading, Cpu } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { mcpApi, type McpInfo } from '@/api/mcp'

const mcpInfo = ref<McpInfo | null>(null)
const loading = ref(true)
const downloading = ref(false)
const copySuccess = ref(false)

// 操作系统检测
const isWindows = navigator.platform.toLowerCase().includes('win')

// 后端状态
const backendRunning = ref(false)
const checkingBackend = ref(false)

// 加载 MCP 信息
onMounted(async () => {
  try {
    const response = await mcpApi.getInfo()
    mcpInfo.value = response.data
    await checkBackend()
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

// 一键安装脚本
const installScript = computed(() => {
  if (isWindows) {
    return `@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

REM 设置日志文件
set "LOG_FILE=%TEMP%\\mcp-install-log.txt"
echo ========== MCP 安装日志 ========== > "%LOG_FILE%"
echo 时间: %date% %time% >> "%LOG_FILE%"
echo ================================= >> "%LOG_FILE%"

echo.
echo  ========================================================
echo          HiSi DevTool MCP 一键安装脚本
echo  ========================================================
echo.

REM 检查 Node.js
echo [1/6] 检查 Node.js 环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [错误] 未找到 Node.js，请先安装 Node.js 18+
    echo         下载地址: https://nodejs.org/
    echo.
    echo [错误] 未找到 Node.js >> "%LOG_FILE%"
    goto :error_exit
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo        Node.js 版本: %NODE_VER%

REM 获取脚本所在目录（MCP 目录）
echo.
echo [2/6] 检查安装目录...
set "MCP_DIR=%~dp0"
set "MCP_DIR=%MCP_DIR:~0,-1%"
echo        安装目录: %MCP_DIR%

REM 检查 package.json 是否存在
if not exist "%MCP_DIR%\\package.json" (
    echo.
    echo  [错误] 未找到 package.json
    echo         请确保将此脚本放在解压后的 MCP 目录中运行
    echo         目录结构应该是:
    echo           hisi-dev-tool-mcp/
    echo           ├── package.json
    echo           ├── src/
    echo           ├── skills/
    echo           └── install-mcp.bat
    echo.
    echo [错误] 未找到 package.json >> "%LOG_FILE%"
    goto :error_exit
)
echo        找到 package.json

REM 设置其他路径
set "SKILLS_DIR=%USERPROFILE%\\.claude\\skills"
set "CLAUDE_CONFIG=%APPDATA%\\Claude\\claude_desktop_config.json"

REM 创建必要目录
echo.
echo [3/6] 创建必要目录...
if not exist "%SKILLS_DIR%" (
    mkdir "%SKILLS_DIR%"
    echo        创建 Skills 目录: %SKILLS_DIR%
) else (
    echo        Skills 目录已存在
)

REM 切换到 MCP 目录
cd /d "%MCP_DIR%"

REM 安装依赖
echo.
echo [4/6] 安装 npm 依赖...
echo        这可能需要几分钟，请耐心等待...
echo.
call npm install --registry=https://registry.npmmirror.com 2>&1 | tee -a "%LOG_FILE%"
if %errorlevel% neq 0 (
    echo.
    echo  [错误] npm install 失败
    echo         请检查网络连接或尝试手动执行: npm install
    echo.
    echo [错误] npm install 失败 >> "%LOG_FILE%"
    goto :error_exit
)
echo.
echo        依赖安装完成

REM 构建
echo.
echo [5/6] 构建 MCP Server...
call npm run build 2>&1 | tee -a "%LOG_FILE%"
if %errorlevel% neq 0 (
    echo.
    echo  [错误] npm run build 失败
    echo         请检查是否有 TypeScript 编译错误
    echo.
    echo [错误] npm run build 失败 >> "%LOG_FILE%"
    goto :error_exit
)
echo        构建完成

REM 安装 Skills
echo.
echo [6/6] 安装 Skills...
if exist "%MCP_DIR%\\skills" (
    xcopy /E /Y /Q "%MCP_DIR%\\skills\\*" "%SKILLS_DIR%\\" >nul
    echo        Skills 已复制到: %SKILLS_DIR%
) else (
    echo        [警告] 未找到 skills 目录，跳过
)

REM 配置 Claude Desktop
echo.
echo  ========================================================
echo                    配置 Claude Desktop
echo  ========================================================
echo.

if not exist "%APPDATA%\\Claude" mkdir "%APPDATA%\\Claude"

REM 生成配置文件路径（使用正斜杠）
set "MCP_PATH=%MCP_DIR%\\dist\\index.js"
set "MCP_PATH=%MCP_PATH:\\=/%"

REM 写入配置文件
echo 正在生成配置文件...
(
echo {
echo   "mcpServers": {
echo     "hisi-dev-tool": {
echo       "command": "node",
echo       "args": ["%MCP_PATH%"],
echo       "env": {
echo         "HISI_API_URL": "http://localhost:8080/api/callchain",
echo         "HISI_LOG_API_URL": "http://localhost:8080/api/log"
echo       }
echo     }
echo   }
echo }
) > "%CLAUDE_CONFIG%"

echo        配置文件已创建: %CLAUDE_CONFIG%
echo.

REM 显示完成信息
echo  ========================================================
echo                     安装成功!
echo  ========================================================
echo.
echo  接下来的步骤:
echo.
echo  1. 重启 Claude Desktop（如果正在运行）
echo  2. 确保 hisi-dev-tool 后端服务正在运行
echo     (访问 http://localhost:8080/api/claude/health 检查)
echo  3. 在 Claude Desktop 中测试:
echo     输入 "帮我分析调用链" 或 "查询错误日志"
echo.
echo  安装日志已保存到: %LOG_FILE%
echo.
echo  ========================================================
echo.
goto :end

:error_exit
echo.
echo  ========================================================
echo                     安装失败!
echo  ========================================================
echo.
echo  请查看上方错误信息，或查看日志文件:
echo  %LOG_FILE%
echo.
echo  常见问题:
echo  1. Node.js 未安装 - 从 https://nodejs.org/ 下载安装
echo  2. 网络问题 - 检查网络连接，或配置 npm 代理
echo  3. 权限问题 - 右键以管理员身份运行此脚本
echo.

:end
echo 按任意键关闭此窗口...
pause >nul`
  } else {
    return `#!/bin/bash

# 设置日志文件
LOG_FILE="/tmp/mcp-install-log.txt"
echo "========== MCP 安装日志 ==========" > "$LOG_FILE"
echo "时间: $(date)" >> "$LOG_FILE"
echo "==================================" >> "$LOG_FILE"

echo ""
echo "========================================================"
echo "        HiSi DevTool MCP 一键安装脚本"
echo "========================================================"
echo ""

# 检查 Node.js
echo "[1/6] 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo ""
    echo " [错误] 未找到 Node.js，请先安装 Node.js 18+"
    echo "        下载地址: https://nodejs.org/"
    echo ""
    echo "[错误] 未找到 Node.js" >> "$LOG_FILE"
    exit 1
fi
echo "       Node.js 版本: $(node -v)"

# 获取脚本所在目录
echo ""
echo "[2/6] 检查安装目录..."
MCP_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "       安装目录: $MCP_DIR"

# 检查 package.json
if [ ! -f "$MCP_DIR/package.json" ]; then
    echo ""
    echo " [错误] 未找到 package.json"
    echo "        请确保将此脚本放在解压后的 MCP 目录中运行"
    echo ""
    echo "[错误] 未找到 package.json" >> "$LOG_FILE"
    exit 1
fi
echo "       找到 package.json"

# 设置路径
SKILLS_DIR="$HOME/.claude/skills"
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# 创建目录
echo ""
echo "[3/6] 创建必要目录..."
mkdir -p "$SKILLS_DIR"
echo "       Skills 目录: $SKILLS_DIR"

# 切换目录
cd "$MCP_DIR"

# 安装依赖
echo ""
echo "[4/6] 安装 npm 依赖..."
echo "       这可能需要几分钟，请耐心等待..."
echo ""
npm install --registry=https://registry.npmmirror.com 2>&1 | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo ""
    echo " [错误] npm install 失败"
    echo "        请检查网络连接或尝试手动执行: npm install"
    echo ""
    echo "[错误] npm install 失败" >> "$LOG_FILE"
    exit 1
fi
echo ""
echo "       依赖安装完成"

# 构建
echo ""
echo "[5/6] 构建 MCP Server..."
npm run build 2>&1 | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo ""
    echo " [错误] npm run build 失败"
    echo "        请检查是否有 TypeScript 编译错误"
    echo ""
    echo "[错误] npm run build 失败" >> "$LOG_FILE"
    exit 1
fi
echo "       构建完成"

# 安装 Skills
echo ""
echo "[6/6] 安装 Skills..."
if [ -d "$MCP_DIR/skills" ]; then
    cp -r "$MCP_DIR/skills/"* "$SKILLS_DIR/"
    echo "       Skills 已复制到: $SKILLS_DIR"
else
    echo "       [警告] 未找到 skills 目录，跳过"
fi

# 配置 Claude Desktop
echo ""
echo "========================================================"
echo "                 配置 Claude Desktop"
echo "========================================================"
echo ""

mkdir -p "$(dirname "$CLAUDE_CONFIG")"

# 写入配置
MCP_PATH="$MCP_DIR/dist/index.js"
cat > "$CLAUDE_CONFIG" << EOF
{
  "mcpServers": {
    "hisi-dev-tool": {
      "command": "node",
      "args": ["$MCP_PATH"],
      "env": {
        "HISI_API_URL": "http://localhost:8080/api/callchain",
        "HISI_LOG_API_URL": "http://localhost:8080/api/log"
      }
    }
  }
}
EOF

echo "       配置文件已创建: $CLAUDE_CONFIG"
echo ""

# 完成
echo "========================================================"
echo "                    安装成功!"
echo "========================================================"
echo ""
echo "接下来的步骤:"
echo ""
echo "1. 重启 Claude Desktop（如果正在运行）"
echo "2. 确保 hisi-dev-tool 后端服务正在运行"
echo "   (访问 http://localhost:8080/api/claude/health 检查)"
echo "3. 在 Claude Desktop 中测试:"
echo "   输入 \"帮我分析调用链\" 或 \"查询错误日志\""
echo ""
echo "安装日志已保存到: $LOG_FILE"
echo ""
echo "========================================================"
`
  }
})
  } else {
    return `#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       HiSi DevTool MCP 一键安装脚本                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[✗] 未找到 Node.js，请先安装 Node.js 18+"
    echo "    下载地址: https://nodejs.org/"
    exit 1
fi
echo "[✓] Node.js 已安装: $(node -v)"

# 设置路径
MCP_DIR="$HOME/projects/hisi-dev-tool-mcp"
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
SKILLS_DIR="$HOME/.claude/skills"

# 创建目录
mkdir -p "$HOME/projects"
mkdir -p "$SKILLS_DIR"

# 检查 MCP 目录
if [ -d "$MCP_DIR" ]; then
    echo "[!] MCP 目录已存在: $MCP_DIR"
    cd "$MCP_DIR"
else
    echo "[i] 请将此脚本放在 hisi-dev-tool-mcp 目录中运行"
    echo "    或手动下载 MCP 包后重试"
    exit 1
fi

# 安装依赖
echo ""
echo "[*] 正在安装依赖..."
npm install --registry=https://registry.npmmirror.com || { echo "[✗] 安装依赖失败"; exit 1; }
echo "[✓] 依赖安装完成"

# 构建
echo ""
echo "[*] 正在构建 MCP Server..."
npm run build || { echo "[✗] 构建失败"; exit 1; }
echo "[✓] 构建完成"

# 安装 Skills
echo ""
echo "[*] 正在安装 Skills..."
if [ -d "skills" ]; then
    cp -r skills/* "$SKILLS_DIR/"
    echo "[✓] Skills 已安装到: $SKILLS_DIR"
else
    echo "[!] 未找到 skills 目录，跳过"
fi

# 配置 Claude Desktop
echo ""
echo "[*] 正在配置 Claude Desktop..."
mkdir -p "$(dirname "$CLAUDE_CONFIG")"

MCP_PATH="$MCP_DIR/dist/index.js"
CONFIG_CONTENT=$(cat <<EOF
{
  "mcpServers": {
    "hisi-dev-tool": {
      "command": "node",
      "args": ["$MCP_PATH"],
      "env": {
        "HISI_API_URL": "http://localhost:8080/api/callchain",
        "HISI_LOG_API_URL": "http://localhost:8080/api/log"
      }
    }
  }
}
EOF
)

if [ -f "$CLAUDE_CONFIG" ]; then
    echo "[!] 配置文件已存在，请手动添加以下配置:"
    echo ""
    echo "$CONFIG_CONTENT"
    echo ""
else
    echo "$CONFIG_CONTENT" > "$CLAUDE_CONFIG"
    echo "[✓] 配置文件已创建: $CLAUDE_CONFIG"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    安装完成!                             ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  1. 重启 Claude Desktop                                  ║"
echo "║  2. 确保 hisi-dev-tool 后端服务正在运行                  ║"
echo "║  3. 在 Claude 中测试: \"帮我分析调用链\"                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""`
  }
})

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

// 下载脚本
function downloadScript() {
  const filename = isWindows ? 'install-mcp.bat' : 'install-mcp.sh'
  const blob = new Blob([installScript.value], { type: 'text/plain' })
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

      <!-- 一键安装 -->
      <el-card class="install-card">
        <template #header>
          <div class="card-header">
            <span>方式一：一键安装脚本（推荐）</span>
            <el-tag type="success" size="small">自动配置</el-tag>
          </div>
        </template>

        <div class="install-steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-content">
              <strong>下载 MCP 包</strong>
              <el-button type="primary" :loading="downloading" @click="downloadMCP">
                <el-icon><Download /></el-icon>
                下载 MCP
              </el-button>
            </div>
          </div>

          <div class="step">
            <div class="step-num">2</div>
            <div class="step-content">
              <strong>解压并运行安装脚本</strong>
              <p class="hint">解压后，将安装脚本放入解压目录并运行</p>
              <div class="script-actions">
                <el-button type="primary" @click="downloadScript">
                  <el-icon><Download /></el-icon>
                  下载安装脚本
                </el-button>
                <el-button @click="copyText(installScript)">
                  <el-icon><CopyDocument /></el-icon>
                  复制脚本内容
                </el-button>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">3</div>
            <div class="step-content">
              <strong>重启 Claude Desktop</strong>
              <p class="hint">关闭并重新打开 Claude Desktop</p>
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

.install-card, .manual-card, .tools-card, .faq-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
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

.hint {
  color: #909399;
  font-size: 13px;
  margin: 0 0 12px;
}

.script-actions {
  display: flex;
  gap: 12px;
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

  .script-actions {
    flex-direction: column;
  }
}
</style>
