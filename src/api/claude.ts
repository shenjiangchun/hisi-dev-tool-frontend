import request from '@/utils/request'

export interface AnalyzeLogRequest {
  errorMessage: string
  stackTrace?: string
  projectPath?: string
  additionalContext?: string
}

export interface AnalyzeCodeRequest {
  code: string
  language?: string
  projectPath?: string
  additionalContext?: string
}

export interface ClaudeAnalysisResult {
  errorType: string
  rootCause: string
  affectedCode: string[]
  fixSuggestions: string[]
  confidence: number
  timestamp: string
  analysisType: string
  requestId: string
}

export const claudeApi = {
  analyzeLog(data: AnalyzeLogRequest) {
    return request.post<ClaudeAnalysisResult>('/claude/analyze', data)
  },

  analyzeCode(data: AnalyzeCodeRequest) {
    return request.post<ClaudeAnalysisResult>('/claude/analyze-code', data)
  },

  healthCheck() {
    return request.get<boolean>('/claude/health')
  }
}