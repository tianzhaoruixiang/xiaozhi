import { Hono } from 'hono'
import { getQwenTtsConfig, qwenTtsHealth, synthesizeQwenSpeech } from '../lib/qwenTts.js'
import { arabicToSpoken } from '../lib/spokenChinese.js'

const ASR_URL = (process.env.TTS_URL || 'http://127.0.0.1:8090').replace(/\/$/, '')

export const ttsRoute = new Hono()

ttsRoute.get('/health', async (c) => {
  const data = await qwenTtsHealth()
  return c.json(data, data.ok ? 200 : 503)
})

ttsRoute.get('/asr/health', async (c) => {
  try {
    const res = await fetch(`${ASR_URL}/asr/health`)
    const data = await res.json()
    return c.json(data, res.ok ? 200 : 503)
  } catch (err) {
    return c.json(
      {
        ok: false,
        ready: false,
        error: err instanceof Error ? err.message : 'ASR 不可达',
      },
      503,
    )
  }
})

/** 代理本机 sherpa-onnx MeloTTS，返回 wav */
ttsRoute.post('/speak', async (c) => {
  let body: {
    text?: string
    speed?: number
    speaker_id?: number
    voice_prompt?: string
    seed?: number
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: '无效 JSON' }, 400)
  }
  const text = arabicToSpoken(body.text?.trim() || '')
  if (!text) return c.json({ error: 'text 不能为空' }, 400)

  const rate =
    typeof body.speed === 'number' && Number.isFinite(body.speed)
      ? Math.min(2, Math.max(0.5, body.speed))
      : undefined

  try {
    const buf = await synthesizeQwenSpeech({
      text,
      voice: body.voice_prompt,
      rate,
    })
    const { model } = getQwenTtsConfig()
    const isMp3 = buf[0] === 0xff || buf.toString('ascii', 0, 3) === 'ID3'
    return c.newResponse(buf, {
      headers: {
        'Content-Type': isMp3 ? 'audio/mpeg' : 'audio/wav',
        'Cache-Control': 'no-store',
        'X-TTS-Engine': model,
      },
    })
  } catch (err) {
    return c.json(
      {
        error: err instanceof Error ? err.message : 'TTS 服务不可用',
      },
      502,
    )
  }
})

/** 代理本地离线 ASR */
ttsRoute.post('/asr', async (c) => {
  try {
    const form = await c.req.formData()
    const upstream = new FormData()
    const file = form.get('file')
    if (!file) return c.json({ error: '缺少 file' }, 400)
    upstream.append('file', file)

    const res = await fetch(`${ASR_URL}/asr`, {
      method: 'POST',
      body: upstream,
    })
    const data = await res.json().catch(async () => ({
      error: await res.text(),
    }))
    return c.json(data, res.ok ? 200 : 502)
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'ASR 服务不可用',
      },
      503,
    )
  }
})
