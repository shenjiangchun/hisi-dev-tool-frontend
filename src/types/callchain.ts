export interface CallChainNode {
  name: string
  type: string
  children?: CallChainNode[]
}

export interface UriInfo {
  uri: string
  method: string
  callCount: number
}

export interface ProjectInfo {
  name: string
  description?: string
  language?: string
  updateTime: string
}

export interface ServiceHealth {
  name: string
  healthy: boolean
  responseTime: number
  lastCheck: string
}

export interface SystemResources {
  cpu: number
  memory: number
  disk: number
}

export interface HealthData {
  services: ServiceHealth[]
  resources: SystemResources
}

export interface ImpactResult {
  target: string
  type: string
  impactCount: number
  impactedFiles: string[]
}

export interface ProjectCloneStatus {
  name: string
  url: string
  branch: string
  status: string
  updateTime: string
}