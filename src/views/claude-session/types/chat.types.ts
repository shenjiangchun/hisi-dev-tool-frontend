/**
 * Type definitions for vue-element-plus-x components
 * These are based on the package's type definitions
 */

/**
 * Bubble props from vue-element-plus-x
 */
export interface BubbleProps {
  placement?: 'start' | 'end'
  avatar?: string
  loading?: boolean
  shape?: 'round' | 'corner'
  variant?: 'filled' | 'borderless' | 'outlined' | 'shadow'
  maxWidth?: string
  avatarSize?: string
  avatarGap?: string
  avatarShape?: 'circle' | 'square'
  avatarSrcSet?: string
  avatarAlt?: string
  avatarFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  noStyle?: boolean
  isFog?: boolean
  typing?: boolean
  content?: string
  isMarkdown?: boolean
}

/**
 * BubbleListItemProps extends BubbleProps
 */
export interface BubbleListItemProps extends BubbleProps {
  key?: string | number
}

/**
 * Prompts items props
 */
export interface PromptsItemsProps {
  key: string | number
  label?: string
  icon?: import('vue').VNode
  description?: string
  disabled?: boolean
  itemStyle?: import('vue').CSSProperties
  itemHoverStyle?: import('vue').CSSProperties
  itemActiveStyle?: import('vue').CSSProperties
  children?: PromptsItemsProps[]
}

/**
 * Chat message structure for our application
 * Extends BubbleListItemProps with additional role property for our needs
 */
export interface ChatMessage extends BubbleListItemProps {
  key: string | number
  role: 'user' | 'assistant'
  content: string
}

/**
 * Quick action button configuration
 */
export interface QuickAction {
  key: string
  name: string
  icon: string
  prompt: string
}

/**
 * File upload result
 */
export interface FileUploadResult {
  success: boolean
  filename: string
  content: string
  error?: string
}