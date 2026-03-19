import request from '@/utils/request'

export interface GitStatus {
  branch: string
  clean: boolean
  ahead: number
  behind: number
  modified: string[]
  untracked: string[]
}

export interface GitLog {
  commitId: string
  message: string
  author: string
  date: string
}

export const gitApi = {
  // 获取 Git 状态
  getStatus(path: string) {
    return request.get<GitStatus>('/git/status', { params: { path } })
  },

  // 切换分支
  checkout(path: string, branch: string) {
    return request.post('/git/checkout', { path, branch })
  },

  // 拉取最新代码
  pull(path: string) {
    return request.post('/git/pull', { path })
  },

  // 获取提交日志
  getLogs(path: string, limit: number = 10) {
    return request.get<GitLog[]>('/git/logs', { params: { path, limit } })
  }
}