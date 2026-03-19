import request from '@/utils/request'

export interface AppConfig {
  key: string
  value: string
  description: string
  updatedAt?: string
  updatedBy?: string
}

export interface UpdateConfigRequest {
  key: string
  value: string
  updatedBy?: string
}

export const configApi = {
  // 获取配置
  getConfig(key: string) {
    return request.get<AppConfig>('/config', { params: { key } })
  },

  // 更新配置
  updateConfig(data: UpdateConfigRequest) {
    return request.put<AppConfig>('/config', data)
  },

  // 获取 PROJECT_DIR
  getProjectDir() {
    return request.get<AppConfig>('/config/project-dir')
  },

  // 更新 PROJECT_DIR
  updateProjectDir(value: string, updatedBy?: string) {
    return this.updateConfig({
      key: 'PROJECT_DIR',
      value,
      updatedBy
    })
  }
}