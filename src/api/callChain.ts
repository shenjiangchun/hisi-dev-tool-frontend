import request from '@/utils/request'

export const callChainApi = {
  // 获取项目列表
  getProjects() {
    return request.get('/callchain/projects')
  },

  // 获取URI列表
  getUris(params: { project: string }) {
    return request.get('/callchain/uris', { params })
  },

  // 获取调用链数据
  getCalls(params: { project: string; uri: string }) {
    return request.get('/callchain/calls', { params })
  },

  // 搜索方法或类
  search(params: { project: string; keyword: string }) {
    return request.get('/callchain/search', { params })
  }
}