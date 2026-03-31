<template>
  <div class="claude-workspace">
    <SessionList
      @new-session="handleNewSession"
      @select-session="handleSelectSession"
    />
    <div class="terminal-wrapper">
      <div class="terminal-header">
        <div class="terminal-title">
          <el-icon><Monitor /></el-icon>
          <span>{{ currentSessionTitle }}</span>
        </div>
        <div class="terminal-status">
          <el-tag :type="statusTagType" size="small">{{ statusText }}</el-tag>
          <el-button-group size="small">
            <el-button @click="handleReconnect" :disabled="connectionStatus === 'connected'">
              <el-icon><RefreshRight /></el-icon>重连
            </el-button>
            <el-button @click="handleClear">
              <el-icon><Delete /></el-icon>清屏
            </el-button>
          </el-button-group>
        </div>
      </div>
      <div class="terminal-container" ref="terminalContainerRef"></div>
      <div class="quick-actions">
        <span class="actions-label">快捷命令：</span>
        <el-button v-for="action in quickActions" :key="action.command" size="small" @click="executeCommand(action.command)">
          {{ action.label }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { Monitor, RefreshRight, Delete } from '@element-plus/icons-vue'
import { createTerminalConnection } from '@/api/terminal'
import type { TerminalConnectionStatus, TerminalClientMessage } from '@/types/terminal'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import SessionList from './components/SessionList.vue'

const workspaceStore = useWorkspaceStore()

const terminalContainerRef = ref<HTMLElement | null>(null)
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let onDataDisposable: { dispose: () => void } | null = null
const connectionStatus = ref<TerminalConnectionStatus>('disconnected')
let terminalConnection: ReturnType<typeof createTerminalConnection> | null = null

const quickActions = [
  { label: '/help', command: '/help' },
  { label: '/plugin', command: '/plugin' },
  { label: '/config', command: '/config' },
  { label: '/clear', command: '/clear' },
]

const currentSessionTitle = computed(() => {
  return workspaceStore.currentSession?.title || 'Claude CLI Terminal'
})

const statusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    case 'disconnected': return '已断开'
    case 'error': return '连接错误'
    default: return '未知'
  }
})

const statusTagType = computed(() => {
  switch (connectionStatus.value) {
    case 'connected': return 'success'
    case 'connecting': return 'warning'
    case 'disconnected': return 'info'
    case 'error': return 'danger'
    default: return 'info'
  }
})

function initTerminal() {
  // Dispose existing terminal first to prevent memory leak
  if (terminal) {
    terminal.dispose()
    terminal = null
  }
  if (!terminalContainerRef.value) return

  terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    convertEol: true,
    scrollback: 5000,
    theme: {
      foreground: '#ECECEC',
      background: '#1E1E1E',
      cursor: '#FFFFFF',
      cursorAccent: '#1E1E1E',
      selectionBackground: 'rgba(100, 100, 100, 0.5)',
    },
    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
    fontSize: 14,
    lineHeight: 1.4,
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())
  terminal.open(terminalContainerRef.value)
  fitTerminal()

  onDataDisposable = terminal.onData((data) => {
    terminalConnection?.send({ action: 'input', data })
  })
}

function connectTerminal(action: 'start' | 'resume', claudeSessionId?: string) {
  connectionStatus.value = 'connecting'

  terminalConnection = createTerminalConnection({
    onOpen: () => {
      connectionStatus.value = 'connected'
      ElMessage.success('终端连接成功')
    },
    onClose: () => {
      connectionStatus.value = 'disconnected'
      ElMessage.warning('终端连接已断开')
    },
    onError: (error) => {
      connectionStatus.value = 'error'
      ElMessage.error(`终端连接错误: ${error}`)
    },
    onOutput: (data) => terminal?.write(data),
    onSessionInfo: (claudeSessionId) => {
      if (workspaceStore.currentSessionId) {
        workspaceStore.bindClaudeSession(workspaceStore.currentSessionId, claudeSessionId)
      }
    },
    onReady: () => {
      // Send start or resume action
      const message: TerminalClientMessage = { action }
      if (claudeSessionId) {
        message.claudeSessionId = claudeSessionId
      }
      terminalConnection?.send(message)

      // Send initial prompt if present (only for new sessions)
      if (action === 'start' && workspaceStore.currentSession?.initialPrompt) {
        setTimeout(() => {
          terminalConnection?.send({
            action: 'input',
            data: workspaceStore.currentSession!.initialPrompt + '\n'
          })
        }, 500)
      }
    }
  })
}

function handleNewSession() {
  // Disconnect current connection
  terminalConnection?.close()
  terminal?.clear()

  // Create new session via store and connect
  workspaceStore.createSession().then(() => {
    initTerminal()
    connectTerminal('start')
  })
}

function handleSelectSession(sessionId: string) {
  workspaceStore.selectSession(sessionId)
  const session = workspaceStore.sessions.find(s => s.id === sessionId)

  // Disconnect current connection
  terminalConnection?.close()
  terminal?.clear()

  // Reinitialize terminal if needed
  if (!terminal) {
    initTerminal()
  }

  if (session?.claudeSessionId) {
    connectTerminal('resume', session.claudeSessionId)
  } else {
    connectTerminal('start')
  }
}

function executeCommand(command: string) {
  terminalConnection?.send({ action: 'input', data: command + '\n' })
}

function handleReconnect() {
  terminalConnection?.close()
  terminal?.clear()

  const session = workspaceStore.currentSession
  if (session?.claudeSessionId) {
    connectTerminal('resume', session.claudeSessionId)
  } else {
    connectTerminal('start')
  }
}

function handleClear() {
  terminal?.clear()
}

function fitTerminal() {
  fitAddon?.fit()
}

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  // Load existing sessions
  await workspaceStore.loadSessions('active')

  // Initialize terminal
  initTerminal()

  // Setup resize observer
  if (terminalContainerRef.value) {
    resizeObserver = new ResizeObserver(fitTerminal)
    resizeObserver.observe(terminalContainerRef.value)
  }
  window.addEventListener('resize', fitTerminal)

  // If there's already a current session, connect to it
  if (workspaceStore.currentSession?.claudeSessionId) {
    connectTerminal('resume', workspaceStore.currentSession.claudeSessionId)
  } else if (workspaceStore.activeSessions.length > 0) {
    // Select the first active session
    const firstSession = workspaceStore.activeSessions[0]
    workspaceStore.selectSession(firstSession.id)
    if (firstSession.claudeSessionId) {
      connectTerminal('resume', firstSession.claudeSessionId)
    } else {
      connectTerminal('start')
    }
  } else {
    // No existing sessions, start a new one
    connectTerminal('start')
  }
})

onUnmounted(() => {
  terminalConnection?.close()
  onDataDisposable?.dispose()
  terminal?.dispose()
  resizeObserver?.disconnect()
  window.removeEventListener('resize', fitTerminal)
})
</script>

<style scoped>
.claude-workspace {
  display: flex;
  height: 100%;
  background: #1a1a1a;
}
.terminal-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 16px;
}
.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d2d;
  border-radius: 12px 12px 0 0;
  border-bottom: 1px solid #404040;
}
.terminal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e0e0e0;
  font-weight: 500;
}
.terminal-status {
  display: flex;
  align-items: center;
  gap: 12px;
}
.terminal-container {
  flex: 1;
  padding: 8px;
  min-height: 400px;
  background: #1E1E1E;
  border-radius: 0 0 12px 12px;
}
.quick-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #2d2d2d;
  border-radius: 8px;
  margin-top: 12px;
}
.actions-label {
  color: #909399;
  font-size: 13px;
}
</style>