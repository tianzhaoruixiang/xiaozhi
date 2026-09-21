export const QWEN_TTS_MODEL = 'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice'
export const QWEN_TTS_VOICE = 'vivian'

const DEFAULT_SPEECH_BASE = 'http://127.0.0.1:8091'

/** 百炼云端音色 → 开源 CustomVoice 预设女声 */
const VOICE_ALIASES: Record<string, string> = {
  'yuxiaoyun_v3.1': 'vivian',
  yuxiaoyun: 'vivian',
}

export function getQwenTtsConfig() {
  const model = (process.env.TTS_MODEL || QWEN_TTS_MODEL).trim() || QWEN_TTS_MODEL
  const voiceRaw = (process.env.TTS_VOICE || QWEN_TTS_VOICE).trim() || QWEN_TTS_VOICE
  const voice = VOICE_ALIASES[voiceRaw.toLowerCase()] || voiceRaw
  const base = (
    process.env.TTS_SPEECH_URL ||
    process.env.VLLM_OMNI_URL ||
    DEFAULT_SPEECH_BASE
  ).replace(/\/$/, '')
  return { model, voice, base, voiceRaw }
}

function resolveVoice(voice?: string) {
  const raw = (voice || getQwenTtsConfig().voice).trim()
  return VOICE_ALIASES[raw.toLowerCase()] || raw || QWEN_TTS_VOICE
}

export async function synthesizeQwenSpeech(options: {
  text: string
  voice?: string
  rate?: number
}): Promise<Buffer> {
  const { model, base } = getQwenTtsConfig()
  const voice = resolveVoice(options.voice)
  const speed =
    typeof options.rate === 'number' && Number.isFinite(options.rate)
      ? Math.min(4, Math.max(0.25, options.rate))
      : 1

  const res = await fetch(`${base}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: options.text,
      voice,
      language: 'Chinese',
      task_type: 'CustomVoice',
      response_format: 'wav',
      speed,
    }),
  })

  const type = res.headers.get('content-type') || ''
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail.slice(0, 300) || `vLLM-Omni TTS HTTP ${res.status}`)
  }
  if (type.includes('application/json')) {
    const payload = (await res.json()) as { error?: { message?: string }; message?: string }
    throw new Error(payload.error?.message || payload.message || 'vLLM-Omni TTS 返回 JSON 错误')
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 100) throw new Error('vLLM-Omni TTS 音频为空')
  return buf
}

export async function qwenTtsHealth() {
  const cfg = getQwenTtsConfig()
  try {
    const res = await fetch(`${cfg.base}/v1/models`, { signal: AbortSignal.timeout(4000) })
    const ok = res.ok
    return {
      ok,
      engine: 'vllm-omni',
      model: cfg.model,
      voice: cfg.voice,
      upstream: cfg.base,
      error: ok ? undefined : `健康检查 HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      ok: false,
      engine: 'vllm-omni',
      model: cfg.model,
      voice: cfg.voice,
      upstream: cfg.base,
      error: err instanceof Error ? err.message : 'vLLM-Omni 不可达',
    }
  }
}
