export const LOCAL_TTS_MODEL = 'kokoro-int8-multi-lang-v1_1'
export const LOCAL_TTS_VOICE = 'zf_001'

const DEFAULT_SPEECH_BASE = 'http://127.0.0.1:8090'

export function getQwenTtsConfig() {
  const model = (process.env.TTS_MODEL || LOCAL_TTS_MODEL).trim() || LOCAL_TTS_MODEL
  const voice = (process.env.TTS_VOICE || LOCAL_TTS_VOICE).trim() || LOCAL_TTS_VOICE
  const base = (
    process.env.TTS_SPEECH_URL ||
    process.env.TTS_URL ||
    DEFAULT_SPEECH_BASE
  ).replace(/\/$/, '')
  return { model, voice, base, voiceRaw: voice }
}

export async function synthesizeQwenSpeech(options: {
  text: string
  voice?: string
  rate?: number
}): Promise<Buffer> {
  const { model, base } = getQwenTtsConfig()
  const speed =
    typeof options.rate === 'number' && Number.isFinite(options.rate)
      ? Math.min(4, Math.max(0.25, options.rate))
      : 1
  const speakerId = (options.voice || '').toLowerCase().startsWith('en') ? 0 : 3

  const res = await fetch(`${base}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: options.text,
      text: options.text,
      speaker_id: speakerId,
      response_format: 'wav',
      speed,
    }),
  })

  const type = res.headers.get('content-type') || ''
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail.slice(0, 300) || `本地 TTS HTTP ${res.status}`)
  }
  if (type.includes('application/json')) {
    const payload = (await res.json()) as { error?: { message?: string }; message?: string }
    throw new Error(payload.error?.message || payload.message || '本地 TTS 返回 JSON 错误')
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 100) throw new Error('本地 TTS 音频为空')
  return buf
}

export async function qwenTtsHealth() {
  const cfg = getQwenTtsConfig()
  try {
    const res = await fetch(`${cfg.base}/health`, { signal: AbortSignal.timeout(4000) })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; engine?: string; error?: string }
    const ok = res.ok && data.ok !== false
    return {
      ok,
      engine: data.engine || 'kokoro-int8-multi-lang-v1_1',
      model: cfg.model,
      voice: cfg.voice,
      upstream: cfg.base,
      error: ok ? undefined : data.error || `健康检查 HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      ok: false,
      engine: 'kokoro-int8-multi-lang-v1_1',
      model: cfg.model,
      voice: cfg.voice,
      upstream: cfg.base,
      error: err instanceof Error ? err.message : 'TTS 不可达',
    }
  }
}
