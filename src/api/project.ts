import request from '@/utils/request'

export const projectApi = {
  // 获取项目列表
  getProjects() {
    return request.get('/projects/list')
  },

  // 克隆项目
  clone(data: { url: string; branch?: string; directory?: string }) {
    return request.post('/projects/clone', data)
  },

  // 拉取更新
  pull(name: string) {
    return request.post(`/projects/pull/${encodeURIComponent(name)}`)
  },

  // 删除项目
  delete(name: string) {
    return request.delete(`/projects/${encodeURIComponent(name)}`)
  },

  // 获取项目状态
  getStatus(name: string) {
    return request.get('/projects/status', { params: { name } })
  }
}