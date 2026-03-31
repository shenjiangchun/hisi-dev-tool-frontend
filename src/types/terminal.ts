/**
 * 终端相关类型定义
 */

export interface TerminalOptions {
  fontSize?: number
  fontFamily?: string
  theme?: TerminalTheme
  cursorBlink?: boolean
  cursorStyle?: 'block' | 'underline' | 'bar'
  scrollback?: number
}

export interface TerminalTheme {
  foreground?: string
  background?: string
  cursor?: string
  cursorAccent?: string
  selection?: string
  black?: string
  red?: string
  green?: string
  yellow?: string
  blue?: string
  magenta?: string
  cyan?: string
  white?: string
  brightBlack?: string
  brightRed?: string
  brightGreen?: string
  brightYellow?: string
  brightBlue?: string
  brightMagenta?: string
  brightCyan?: string
  brightWhite?: string
}

export type TerminalConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface TerminalSession {
  id: string
  workingDirectory: string
  connectedAt: Date
  status: TerminalConnectionStatus
}