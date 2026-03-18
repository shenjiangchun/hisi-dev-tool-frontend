export interface LogEntry {
  id: string
  level: string
  message: string
  timestamp: string
  appId?: string
  traceId?: string
  spanId?: string
}

export interface LogQueryDto {
  appId: string
  logLevel?: string
  keyword?: string
  startTime?: Date | null
  endTime?: Date | null
  page?: number
  pageSize?: number
}

export interface LogAnalyzeRequest {
  logIds: string[]
  userId?: string
}

export interface AnalyzeTaskResponse {
  taskId: number
  status: string
}