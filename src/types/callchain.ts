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