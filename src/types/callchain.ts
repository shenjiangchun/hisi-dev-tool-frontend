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

export interface GitRepositoryInfo {
  name: string
  path: string
  branch: string
  remoteUrl?: string
  clean: boolean
  source: 'scanned' | 'cloned'
  lastCommitMessage?: string
  lastCommitDate?: string
  // Legacy fields for backward compatibility
  url?: string
  status?: string
  updateTime?: string
}

// Backward compatibility alias
export type ProjectCloneStatus = GitRepositoryInfo