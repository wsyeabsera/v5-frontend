// AI Model Configurations for Vercel AI SDK

export const AI_MODELS = {
  // Anthropic Models
  'claude-sonnet': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
  },
  'claude-opus': {
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    maxTokens: 4096,
  },
  'claude-haiku': {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    maxTokens: 4096,
  },
  
  // OpenAI Models
  'gpt-4': {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    maxTokens: 4096,
  },
  'gpt-4-turbo': {
    provider: 'openai',
    model: 'gpt-4-turbo',
    maxTokens: 4096,
  },
  'gpt-3.5-turbo': {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    maxTokens: 4096,
  },
  
  // Google Models
  'gemini-pro': {
    provider: 'google',
    model: 'gemini-1.5-pro-latest',
    maxTokens: 8192,
  },
  
  // Groq Models (super fast inference)
  'groq-llama': {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 8192,
  },
  'groq-mixtral': {
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    maxTokens: 32768,
  },
  
  // Ollama Models (local inference)
  'ollama-llama3': {
    provider: 'ollama',
    model: 'llama3',
    maxTokens: 4096,
  },
  'ollama-mistral': {
    provider: 'ollama',
    model: 'mistral',
    maxTokens: 4096,
  },
  'ollama-codellama': {
    provider: 'ollama',
    model: 'codellama',
    maxTokens: 4096,
  },
} as const

export type ModelId = keyof typeof AI_MODELS
export type Provider = 'anthropic' | 'openai' | 'google' | 'groq' | 'ollama'

export function getProviderForModel(modelId: string): Provider {
  const model = AI_MODELS[modelId as ModelId]
  return model?.provider || 'anthropic'
}

export function getModelConfig(modelId: string) {
  return AI_MODELS[modelId as ModelId] || AI_MODELS['claude-sonnet']
}

