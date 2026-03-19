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

/**
 * Git repository information for display in repository tables.
 * Used for both scanned repositories and cloned projects.
 */
export interface GitRepositoryInfo {
  /** Repository name (folder name) */
  name: string
  /** Full filesystem path to the repository */
  path: string
  /** Current branch name (e.g., 'master', 'main', 'develop') */
  branch: string
  /** Remote origin URL if configured */
  remoteUrl?: string
  /** True if working directory has no uncommitted changes */
  clean: boolean
  /** How this repository was discovered */
  source: 'scanned' | 'cloned'
  /** Short message of the most recent commit */
  lastCommitMessage?: string
  /** ISO 8601 date string of the most recent commit */
  lastCommitDate?: string

  // Legacy fields for backward compatibility with older API responses
  url?: string
  status?: string
  updateTime?: string
}

/**
 * @deprecated Use GitRepositoryInfo instead.
 * This alias exists for backward compatibility with existing code.
 */
export type ProjectCloneStatus = GitRepositoryInfo