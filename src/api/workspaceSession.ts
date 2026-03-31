import request from '@/utils/request'
import type { ClaudeWorkspaceSession } from '@/types/terminal'

export interface CreateSessionRequest {
  scene?: string
  initialPrompt?: string
  workingDirectory?: string
}

export interface UpdateSessionRequest {
  title?: string
  status?: string
}

export const workspaceSessionApi = {
  /**
   * 获取工作空间会话列表
   */
  list(status?: string) {
    return request.get<ClaudeWorkspaceSession[]>('/api/workspace-sessions', { params: { status } })
  },

  /**
   * 获取单个工作空间会话
   */
  get(id: string) {
    return request.get<ClaudeWorkspaceSession>(`/api/workspace-sessions/${id}`)
  },

  /**
   * 创建工作空间会话
   */
  create(data: CreateSessionRequest) {
    return request.post<ClaudeWorkspaceSession>('/api/workspace-sessions', data)
  },

  /**
   * 更新工作空间会话
   */
  update(id: string, data: UpdateSessionRequest) {
    return request.put<ClaudeWorkspaceSession>(`/api/workspace-sessions/${id}`, data)
  },

  /**
   * 删除工作空间会话
   */
  delete(id: string) {
    return request.delete(`/api/workspace-sessions/${id}`)
  },

  /**
   * 归档工作空间会话
   */
  archive(id: string) {
    return request.post<ClaudeWorkspaceSession>(`/api/workspace-sessions/${id}/archive`)
  },

  /**
   * 绑定 Claude 会话 ID
   */
  bindClaudeSession(id: string, claudeSessionId: string) {
    return request.post<ClaudeWorkspaceSession>(`/api/workspace-sessions/${id}/bind-claude-session`, null, {
      params: { claudeSessionId }
    })
  }
}