import request from '@/utils/request'

export interface GenerateTextRequest {
  userInput: string
}

export interface GenerateTextResponse {
  result: string
}

export const llmApi = {
  generateText(prompt: string) {
    return request.post<string>('/llm/generate', { userInput: prompt })
  }
}