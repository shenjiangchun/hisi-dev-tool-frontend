<template>
  <div class="claude-terminal-page">
    <div class="terminal-wrapper">
      <div class="terminal-header">
        <div class="terminal-title">
          <el-icon><Monitor /></el-icon>
          <span>Claude CLI Terminal</span>
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
    </div>
    <div class="quick-actions">
      <span class="actions-label">快捷命令：</span>
      <el-button v-for="action in quickActions" :key="action.command" size="small" @click="executeCommand(action.command)">
        {{ action.label }}
      </el-button>
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
import type { TerminalConnectionStatus } from '@/types/terminal'
import { ElMessage } from 'element-plus'

const terminalContainerRef = ref<HTMLElement | null>(null)
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
const connectionStatus = ref<TerminalConnectionStatus>('disconnected')
let terminalConnection: ReturnType<typeof createTerminalConnection> | null = null

const quickActions = [
  { label: '/help', command: '/help' },
  { label: '/plugin', command: '/plugin' },
  { label: '/config', command: '/config' },
  { label: '/clear', command: '/clear' },
]

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

  terminal.onData((data) => {
    terminalConnection?.send(data)
  })

  terminalConnection = createTerminalConnection({
    onOpen: () => ElMessage.success('终端连接成功'),
    onClose: () => ElMessage.warning('终端连接已断开'),
    onError: (error) => ElMessage.error(`终端连接错误: ${error}`),
    onData: (data) => terminal?.write(data),
    onStatusChange: (status) => { connectionStatus.value = status },
  })
}

function executeCommand(command: string) {
  terminalConnection?.send(command + '\r')
}

function handleReconnect() {
  terminalConnection?.close()
  initTerminal()
}

function handleClear() {
  terminal?.clear()
}

function fitTerminal() {
  fitAddon?.fit()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  initTerminal()
  if (terminalContainerRef.value) {
    resizeObserver = new ResizeObserver(fitTerminal)
    resizeObserver.observe(terminalContainerRef.value)
  }
  window.addEventListener('resize', fitTerminal)
})

onUnmounted(() => {
  terminalConnection?.close()
  terminal?.dispose()
  resizeObserver?.disconnect()
  window.removeEventListener('resize', fitTerminal)
})
</script>

<style scoped>
.claude-terminal-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a1a;
  padding: 16px;
}
.terminal-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  background: #1E1E1E;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d2d;
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