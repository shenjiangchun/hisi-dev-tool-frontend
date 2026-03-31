/**
 * 终端 WebSocket API
 * 管理与后端 PTY 进程的实时通信
 */

import { ref } from 'vue'
import type { TerminalConnectionStatus, TerminalClientMessage, TerminalServerMessage } from '@/types/terminal'

export interface TerminalCallbacks {
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: string) => void
  onOutput?: (data: string) => void
  onSessionInfo?: (claudeSessionId: string) => void
  onReady?: () => void
  onStatusChange?: (status: TerminalConnectionStatus) => void
}

export interface TerminalConnection {
  send: (message: TerminalClientMessage) => void
  close: () => void
  getStatus: () => TerminalConnectionStatus
}

const WS_ENDPOINT = '/ws/terminal'

export function createTerminalConnection(callbacks: TerminalCallbacks): TerminalConnection {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const wsUrl = `${protocol}//${host}${WS_ENDPOINT}`

  const status = ref<TerminalConnectionStatus>('disconnected')
  let socket: WebSocket | null = null

  const updateStatus = (newStatus: TerminalConnectionStatus) => {
    status.value = newStatus
    callbacks.onStatusChange?.(newStatus)
  }

  const connect = () => {
    updateStatus('connecting')

    try {
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        updateStatus('connected')
        callbacks.onOpen?.()
      }

      socket.onclose = () => {
        updateStatus('disconnected')
        callbacks.onClose?.()
      }

      socket.onerror = () => {
        updateStatus('error')
        callbacks.onError?.('WebSocket connection error')
      }

      socket.onmessage = (event: MessageEvent) => {
        try {
          const msg: TerminalServerMessage = JSON.parse(event.data)
          switch (msg.type) {
            case 'output':
              callbacks.onOutput?.(msg.data || '')
              break
            case 'session_info':
              callbacks.onSessionInfo?.(msg.claudeSessionId || '')
              break
            case 'ready':
              callbacks.onReady?.()
              break
            case 'error':
              callbacks.onError?.(msg.data || 'Unknown error')
              break
          }
        } catch (e) {
          // If not JSON, treat as raw text output
          if (typeof event.data === 'string') {
            callbacks.onOutput?.(event.data)
          }
        }
      }
    } catch (error) {
      updateStatus('error')
      callbacks.onError?.(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  const send = (message: TerminalClientMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }

  const close = () => {
    if (socket) {
      socket.close()
      socket = null
    }
    updateStatus('disconnected')
  }

  const getStatus = (): TerminalConnectionStatus => status.value

  // Start connection
  connect()

  return { send, close, getStatus }
}