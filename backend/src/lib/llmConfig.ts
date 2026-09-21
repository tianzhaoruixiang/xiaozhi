export type LlmProvider = 'openai' | 'claude'

export function getLlmProvider(): LlmProvider {
  const raw = (process.env.LLM_PROVIDER || 'openai').toLowerCase().trim()
  return raw === 'claude' ? 'claude' : 'openai'
}

export function getOpenAIConfig() {
  const baseURL = (
    process.env.OPENAI_BASE_URL ||
    process.env.OPENAI_API_BASE ||
    'http://127.0.0.1:11434/v1'
  ).replace(/\/+$/, '')

  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY ||
    'local'

  const model =
    process.env.OPENAI_MODEL ||
    process.env.LLM_MODEL ||
    'qwen2.5:7b'

  return { baseURL, apiKey, model }
}
