/**
 * 终端 WebSocket API
 * 管理与后端 PTY 进程的实时通信
 */

import type { TerminalConnectionStatus } from '@/types/terminal'

export interface TerminalCallbacks {
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: string) => void
  onData?: (data: string) => void
  onStatusChange?: (status: TerminalConnectionStatus) => void
}

export interface TerminalConnection {
  send: (data: string) => void
  close: () => void
  getStatus: () => TerminalConnectionStatus
}

const WS_ENDPOINT = '/ws/terminal'

export function createTerminalConnection(callbacks: TerminalCallbacks): TerminalConnection {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const wsUrl = `${protocol}//${host}${WS_ENDPOINT}`

  let status: TerminalConnectionStatus = 'disconnected'
  let socket: WebSocket | null = null

  const updateStatus = (newStatus: TerminalConnectionStatus) => {
    status = newStatus
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

      socket.onclose = (event) => {
        updateStatus('disconnected')
        callbacks.onClose?.()
      }

      socket.onerror = (event) => {
        updateStatus('error')
        callbacks.onError?.('WebSocket connection error')
      }

      socket.onmessage = (event) => {
        if (typeof event.data === 'string') {
          callbacks.onData?.(event.data)
        }
      }
    } catch (error) {
      updateStatus('error')
      callbacks.onError?.(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  const send = (data: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data)
    }
  }

  const close = () => {
    if (socket) {
      socket.close()
      socket = null
    }
    updateStatus('disconnected')
  }

  const getStatus = (): TerminalConnectionStatus => status

  // Start connection
  connect()

  return { send, close, getStatus }
}