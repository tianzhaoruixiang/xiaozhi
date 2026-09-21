import { Hono } from 'hono'

const TTS_URL = (process.env.TTS_URL || 'http://127.0.0.1:8090').replace(/\/$/, '')

export const ttsRoute = new Hono()

ttsRoute.get('/health', async (c) => {
  try {
    const res = await fetch(`${TTS_URL}/health`)
    const data = await res.json()
    return c.json({ ok: res.ok, upstream: data })
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'TTS 不可达',
      },
      503,
    )
  }
})

ttsRoute.get('/asr/health', async (c) => {
  try {
    const res = await fetch(`${TTS_URL}/asr/health`)
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

/** 代理本地神经 TTS，返回 wav */
ttsRoute.post('/speak', async (c) => {
  let body: { text?: string; speed?: number; speaker_id?: number }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: '无效 JSON' }, 400)
  }
  const text = body.text?.trim()
  if (!text) return c.json({ error: 'text 不能为空' }, 400)

  try {
    const res = await fetch(`${TTS_URL}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        speed: body.speed,
        speaker_id: body.speaker_id,
      }),
    })
    if (!res.ok) {
      const msg = await res.text()
      return c.json({ error: msg || 'TTS 合成失败' }, 502)
    }
    const buf = await res.arrayBuffer()
    return c.newResponse(buf, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return c.json(
      {
        error: err instanceof Error ? err.message : 'TTS 服务不可用',
      },
      503,
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

    const res = await fetch(`${TTS_URL}/asr`, {
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
