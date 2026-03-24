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
  },

  // 获取类名列表
  getClasses(params?: { project?: string }) {
    return request.get('/callchain/classes', { params })
  },

  // 获取类中的方法列表
  getMethods(params: { className: string; project?: string }) {
    return request.get('/callchain/methods', { params })
  },

  // 获取上游调用链（谁调用了此方法）
  getCallers(params: { method: string; maxDepth?: number; project?: string }) {
    return request.get('/callchain/callers', { params })
  },

  // 获取下游调用链（此方法调用了谁）
  getCallees(params: { method: string; maxDepth?: number; project?: string }) {
    return request.get('/callchain/callees', { params })
  },

  // 获取多方法依赖图
  getMethodGraph(params: {
    methods: string[]
    direction: 'upstream' | 'downstream'
    maxDepth?: number
    projectDir?: string
  }) {
    return request.post('/callchain/method-graph', params)
  },

  // 调用链分析
  analyzeCallChain(params: {
    projectName: string
    uri: string
    projectDir?: string
  }) {
    return request.post('/callchain/analyze', params, {
      headers: { Accept: 'text/event-stream' }
    })
  },

  // 获取分析结果列表
  getAnalysisList(projectName: string) {
    return request.get('/callchain/analysis', { params: { projectName } })
  },

  // 删除项目的所有分析结果
  deleteProjectAnalysis(projectName: string) {
    return request.delete(`/callchain/analysis/project/${projectName}`)
  }
}