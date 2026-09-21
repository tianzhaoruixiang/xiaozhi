import { getOpenAIConfig } from './llmConfig.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null }
    delta?: { content?: string | null }
    finish_reason?: string | null
  }>
  error?: { message?: string }
}

function resolveTimeoutMs(): number {
  const raw = Number(process.env.LLM_TIMEOUT_MS || 60000)
  return Number.isFinite(raw) && raw > 5000 ? raw : 60000
}

export async function chatCompletion(options: {
  messages: ChatMessage[]
  temperature?: number
  onDelta?: (text: string) => void
  /** 覆盖默认超时（毫秒） */
  timeoutMs?: number
}): Promise<string> {
  const { baseURL, apiKey, model } = getOpenAIConfig()
  const stream = Boolean(options.onDelta)
  const url = `${baseURL}/chat/completions`
  const timeoutMs = options.timeoutMs ?? resolveTimeoutMs()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.4,
        stream,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(
        `OpenAI 兼容接口调用失败（${response.status}）${detail ? `: ${detail.slice(0, 300)}` : ''} @ ${url}`,
      )
    }

    if (!stream) {
      const data = (await response.json()) as ChatCompletionResponse
      if (data.error?.message) {
        throw new Error(data.error.message)
      }
      const text = data.choices?.[0]?.message?.content?.trim() ?? ''
      if (!text) throw new Error('模型返回为空')
      return text
    }

    if (!response.body) {
      throw new Error('流式响应缺少 body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n')
      buffer = parts.pop() ?? ''

      for (const line of parts) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const json = JSON.parse(payload) as ChatCompletionResponse
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            full += delta
            options.onDelta?.(delta)
          }
        } catch {
          // ignore partial json
        }
      }
    }

    // 部分网关在 stream=true 时仍返回整包 JSON
    if (!full.trim()) {
      try {
        const maybe = JSON.parse(buffer || '') as ChatCompletionResponse
        const text = maybe.choices?.[0]?.message?.content?.trim() ?? ''
        if (text) return text
      } catch {
        // ignore
      }
      throw new Error('流式模型返回为空')
    }
    return full.trim()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`模型调用超时（>${timeoutMs}ms）@ ${url}`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
