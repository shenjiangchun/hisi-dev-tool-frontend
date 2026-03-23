import request from '@/utils/request'

export interface McpInfo {
  version: string
  name: string
  description: string
  tools: McpTool[]
  skills: McpSkill[]
}

export interface McpTool {
  name: string
  description: string
  params: string[]
}

export interface McpSkill {
  name: string
  title: string
  trigger: string
}

export interface InstallScripts {
  windows: string
  unix: string
}

export const mcpApi = {
  /**
   * 获取 MCP 信息
   */
  async getInfo(): Promise<{ data: McpInfo }> {
    return request.get('/mcp/info')
  },

  /**
   * 获取下载 URL
   */
  getDownloadUrl(): string {
    // 使用相对路径，通过 Vite proxy 代理到后端
    return '/api/mcp/download'
  },

  /**
   * 获取配置模板
   */
  async getConfigTemplate(): Promise<{ data: Record<string, unknown> }> {
    return request.get('/mcp/config-template')
  },

  /**
   * 获取安装脚本
   */
  async getInstallScripts(): Promise<{ data: InstallScripts }> {
    return request.get('/mcp/install-script')
  }
}