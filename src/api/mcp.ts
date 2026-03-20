import axios from 'axios'

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
    const response = await axios.get('/api/mcp/info')
    return response
  },

  /**
   * 获取下载 URL
   */
  getDownloadUrl(): string {
    return `${axios.defaults.baseURL}/api/mcp/download`
  },

  /**
   * 获取配置模板
   */
  async getConfigTemplate(): Promise<{ data: Record<string, unknown> }> {
    const response = await axios.get('/api/mcp/config-template')
    return response
  },

  /**
   * 获取安装脚本
   */
  async getInstallScripts(): Promise<{ data: InstallScripts }> {
    const response = await axios.get('/api/mcp/install-script')
    return response
  }
}