import request from '@/utils/request'
import type { CallChainTask } from '@/types/callchain'

// Response types - axios interceptor returns response.data directly
type ApiTaskResponse = CallChainTask
type ApiTaskListResponse = CallChainTask[]

export const taskApi = {
  /**
   * 启动调用链生成任务
   */
  startGenerate(projectName: string): Promise<ApiTaskResponse> {
    return request.post(`/tasks/generate/${encodeURIComponent(projectName)}`)
  },

  /**
   * 批量查询任务状态
   * @param projects 项目名称列表，为空则查询所有运行中任务
   */
  getStatus(projects?: string[]): Promise<ApiTaskListResponse> {
    const params = projects && projects.length > 0
      ? { projects: projects.join(',') }
      : {}
    return request.get('/tasks/status', { params })
  },

  /**
   * 获取单个项目最新任务
   */
  getLatest(projectName: string): Promise<ApiTaskResponse> {
    return request.get(`/tasks/latest/${encodeURIComponent(projectName)}`)
  }
}