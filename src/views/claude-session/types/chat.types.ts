import type { BubbleListItem } from 'vue-element-plus-x'

/**
 * Element Plus X 兼容的消息格式
 */
export interface ChatMessage extends BubbleListItem {
  key: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

/**
 * 快捷按钮配置
 */
export interface QuickAction {
  key: string
  name: string
  icon: string
  prompt: string
}

/**
 * 文件上传结果
 */
export interface FileUploadResult {
  success: boolean
  filename: string
  content: string
  error?: string
}