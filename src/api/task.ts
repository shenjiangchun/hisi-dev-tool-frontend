import request from '@/utils/request'
import type { CallChainTask } from '@/types/callchain'

export const taskApi = {
  /**
   * 启动调用链生成任务
   */
  startGenerate(projectName: string) {
    return request.post<CallChainTask>(`/tasks/generate/${encodeURIComponent(projectName)}`)
  },

  /**
   * 批量查询任务状态
   * @param projects 项目名称列表，为空则查询所有运行中任务
   */
  getStatus(projects?: string[]) {
    const params = projects && projects.length > 0
      ? { projects: projects.join(',') }
      : {}
    return request.get<CallChainTask[]>('/tasks/status', { params })
  },

  /**
   * 获取单个项目最新任务
   */
  getLatest(projectName: string) {
    return request.get<CallChainTask>(`/tasks/latest/${encodeURIComponent(projectName)}`)
  }
}