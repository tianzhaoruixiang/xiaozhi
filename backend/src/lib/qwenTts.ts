export const LOCAL_TTS_MODEL = 'edge-tts'
export const LOCAL_TTS_VOICE = 'zh-CN-XiaoxiaoNeural'

const DEFAULT_SPEECH_BASE = 'http://127.0.0.1:8090'

export function getQwenTtsConfig() {
  const model = (process.env.TTS_MODEL || LOCAL_TTS_MODEL).trim() || LOCAL_TTS_MODEL
  const voice = (process.env.TTS_VOICE || LOCAL_TTS_VOICE).trim() || LOCAL_TTS_VOICE
  const base = (
    process.env.TTS_SPEECH_URL ||
    process.env.TTS_URL ||
    DEFAULT_SPEECH_BASE
  ).replace(/\/$/, '')
  const taskType = (
    process.env.TTS_TASK_TYPE ||
    (model.toLowerCase().includes('voicedesign') ? 'VoiceDesign' : 'CustomVoice')
  ).trim()
  const language = (process.env.TTS_LANGUAGE || 'Auto').trim() || 'Auto'
  const instructions = (process.env.TTS_INSTRUCTIONS || '').trim()
  return { model, voice, base, voiceRaw: voice, taskType, language, instructions }
}

function isQwenModel(model: string) {
  return /qwen3?-tts|voicedesign|customvoice/i.test(model)
}

export async function synthesizeQwenSpeech(options: {
  text: string
  voice?: string
  rate?: number
}): Promise<Buffer> {
  const cfg = getQwenTtsConfig()
  const speed =
    typeof options.rate === 'number' && Number.isFinite(options.rate)
      ? Math.min(4, Math.max(0.25, options.rate))
      : 1

  const payload = isQwenModel(cfg.model)
    ? {
        model: cfg.model,
        input: options.text,
        text: options.text,
        voice: options.voice || cfg.voice,
        response_format: 'wav',
        speed,
        task_type: cfg.taskType,
        language: cfg.language,
        ...(cfg.instructions ? { instructions: cfg.instructions } : {}),
      }
    : {
        model: cfg.model,
        input: options.text,
        text: options.text,
        speaker_id: (options.voice || cfg.voice || '').toLowerCase().startsWith('en')
          ? 0
          : Number.parseInt(process.env.TTS_SPEAKER_ID || '1', 10) || 1,
        voice: options.voice || cfg.voice,
        response_format: 'mp3',
        speed,
      }

  const res = await fetch(`${cfg.base}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const type = res.headers.get('content-type') || ''
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail.slice(0, 300) || `本地 TTS HTTP ${res.status}`)
  }
  if (type.includes('application/json')) {
    const payloadJson = (await res.json()) as { error?: { message?: string }; message?: string }
    throw new Error(payloadJson.error?.message || payloadJson.message || '本地 TTS 返回 JSON 错误')
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 100) throw new Error('本地 TTS 音频为空')
  return buf
}

export async function qwenTtsHealth() {
  const cfg = getQwenTtsConfig()
  const engine = isQwenModel(cfg.model) ? 'qwen3-tts' : cfg.model || 'edge-tts'
  try {
    const healthRes = await fetch(`${cfg.base}/health`, { signal: AbortSignal.timeout(4000) }).catch(
      () => null,
    )
    if (healthRes?.ok) {
      const data = (await healthRes.json().catch(() => ({}))) as {
        ok?: boolean
        engine?: string
        error?: string
      }
      const ok = data.ok !== false
      return {
        ok,
        engine: data.engine || engine,
        model: cfg.model,
        voice: cfg.voice,
        taskType: cfg.taskType,
        language: cfg.language,
        upstream: cfg.base,
        error: ok ? undefined : data.error,
      }
    }

    const modelsRes = await fetch(`${cfg.base}/v1/models`, { signal: AbortSignal.timeout(4000) })
    const ok = modelsRes.ok
    return {
      ok,
      engine,
      model: cfg.model,
      voice: cfg.voice,
      taskType: cfg.taskType,
      language: cfg.language,
      upstream: cfg.base,
      error: ok ? undefined : `健康检查 HTTP ${modelsRes.status}`,
    }
  } catch (err) {
    return {
      ok: false,
      engine,
      model: cfg.model,
      voice: cfg.voice,
      taskType: cfg.taskType,
      language: cfg.language,
      upstream: cfg.base,
      error: err instanceof Error ? err.message : 'TTS 不可达',
    }
  }
}
