import { onUnmounted, ref } from 'vue'
import { arabicToSpoken } from '../utils/spokenChinese'

/** 按句切分，保证首句尽快开播 */
function splitSpeakUnits(text: string): string[] {
  const raw = text
    .split(/(?<=[。！？!?；;])/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (raw.length <= 1) return raw.length ? raw : [text]

  const units: string[] = []
  let buf = ''
  for (const part of raw) {
    buf = buf ? `${buf}${part}` : part
    // 首句尽量短；后续合并过短碎片，减少请求次数
    if (units.length === 0 || buf.length >= 18 || /[。！？!?]$/.test(buf)) {
      units.push(buf)
      buf = ''
    }
  }
  if (buf) {
    if (units.length) units[units.length - 1] = `${units[units.length - 1]}${buf}`
    else units.push(buf)
  }
  return units
}

/**
 * 微软神经女声（edge-tts / Xiaoxiao）。
 * 分句流水线：首句合成完即播，边播边预取下一句，缩短「写完 → 开声」等待。
 */
export function useSpeechReport() {
  const speaking = ref(false)
  const supported = ref(true)
  const error = ref<string | null>(null)
  const engine = ref<'local' | 'browser' | 'none' | 'idle'>('idle')

  let audioEl: HTMLAudioElement | null = null
  let objectUrl: string | null = null
  let speakSeq = 0
  let browserUtter: SpeechSynthesisUtterance | null = null

  const pickVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
    const voices = window.speechSynthesis.getVoices()
    return (
      voices.find((v) => /zh-CN|zh_CN|Chinese|中文|普通话/.test(`${v.lang} ${v.name}`)) ||
      voices.find((v) => v.lang.startsWith('zh')) ||
      null
    )
  }

  const stop = () => {
    speakSeq += 1
    if (audioEl) {
      audioEl.onplay = null
      audioEl.onended = null
      audioEl.onerror = null
      try {
        audioEl.pause()
      } catch {
        // ignore
      }
      audioEl.removeAttribute('src')
      audioEl.load()
      audioEl = null
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = null
    }
    browserUtter = null
    try {
      window.speechSynthesis?.cancel()
    } catch {
      // ignore
    }
    speaking.value = false
  }

  const speakBrowser = (
    clean: string,
    seq: number,
    onStart?: () => void,
  ): Promise<void> => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      error.value = '当前环境无可用语音引擎'
      engine.value = 'none'
      supported.value = false
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      if (seq !== speakSeq) {
        resolve()
        return
      }

      engine.value = 'browser'
      const utter = new SpeechSynthesisUtterance(clean)
      browserUtter = utter
      utter.lang = 'zh-CN'
      utter.rate = 0.95
      utter.pitch = 1.02
      const voice = pickVoice()
      if (voice) utter.voice = voice

      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        if (browserUtter === utter) browserUtter = null
        if (seq === speakSeq) speaking.value = false
        resolve()
      }

      utter.onstart = () => {
        if (seq !== speakSeq) {
          window.speechSynthesis.cancel()
          finish()
          return
        }
        speaking.value = true
        onStart?.()
      }
      utter.onend = finish
      utter.onerror = finish

      const runOnce = () => {
        if (seq !== speakSeq || finished) return
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utter)
      }

      if (window.speechSynthesis.getVoices().length === 0) {
        const onVoices = () => {
          window.speechSynthesis.onvoiceschanged = null
          runOnce()
        }
        window.speechSynthesis.onvoiceschanged = onVoices
        window.setTimeout(() => {
          if (window.speechSynthesis.getVoices().length > 0) {
            window.speechSynthesis.onvoiceschanged = null
            runOnce()
          }
        }, 300)
      } else {
        runOnce()
      }
    })
  }

  const fetchWav = async (text: string, seq: number): Promise<Blob> => {
    const res = await fetch('/api/tts/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speed: 0.92 }),
    })
    if (seq !== speakSeq) throw new Error('aborted')
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(detail || `TTS HTTP ${res.status}`)
    }
    const type = res.headers.get('content-type') || ''
    if (!type.includes('audio')) throw new Error('TTS 未返回音频')
    const blob = await res.blob()
    if (blob.size < 100) throw new Error('TTS 音频为空')
    return blob
  }

  const playBlob = (
    blob: Blob,
    seq: number,
    onStart?: () => void,
  ): Promise<'ok' | 'fail'> => {
    try {
      window.speechSynthesis?.cancel()
    } catch {
      // ignore
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = URL.createObjectURL(blob)
    const audio = new Audio(objectUrl)
    audioEl = audio
    engine.value = 'local'
    error.value = null

    let started = false
    return new Promise((resolve, reject) => {
      audio.onplay = () => {
        started = true
        if (seq !== speakSeq) {
          audio.pause()
          resolve('fail')
          return
        }
        speaking.value = true
        onStart?.()
      }
      audio.onended = () => {
        resolve(started ? 'ok' : 'fail')
      }
      audio.onerror = () => {
        if (started) resolve('ok')
        else reject(new Error('音频播放失败'))
      }
      void audio.play().catch((err) => {
        if (started) resolve('ok')
        else reject(err)
      })
    })
  }

  /** 整段合成（短文或回退） */
  const speakLocalFull = async (
    clean: string,
    seq: number,
    onStart?: () => void,
  ): Promise<'ok' | 'fail'> => {
    const payload = arabicToSpoken(clean.length > 500 ? `${clean.slice(0, 500)}……` : clean)
    const blob = await fetchWav(payload, seq)
    if (seq !== speakSeq) return 'fail'
    return playBlob(blob, seq, onStart)
  }

  /** 分句：首句先播，边播边预取 */
  const speakLocalPipelined = async (
    clean: string,
    seq: number,
    onStart?: () => void,
  ): Promise<'ok' | 'fail'> => {
    const units = splitSpeakUnits(clean.length > 500 ? `${clean.slice(0, 500)}……` : clean)
    if (units.length <= 1) return speakLocalFull(clean, seq, onStart)

    let nextFetch = fetchWav(units[0], seq)
    let anyOk = false
    let started = false
    const markStart = () => {
      if (started) return
      started = true
      onStart?.()
    }

    for (let i = 0; i < units.length; i += 1) {
      if (seq !== speakSeq) return anyOk ? 'ok' : 'fail'
      const blob = await nextFetch
      if (seq !== speakSeq) return anyOk ? 'ok' : 'fail'
      if (i + 1 < units.length) {
        nextFetch = fetchWav(units[i + 1], seq)
      }
      const result = await playBlob(blob, seq, markStart)
      if (result === 'ok') anyOk = true
      else if (!anyOk) return 'fail'
      if (seq !== speakSeq) return anyOk ? 'ok' : 'fail'
    }

    if (seq === speakSeq) speaking.value = false
    return anyOk ? 'ok' : 'fail'
  }

  const speak = async (text: string, options?: { onStart?: () => void }): Promise<void> => {
    const clean = arabicToSpoken(
      text.replace(/[#*`>_]/g, '').replace(/\s+/g, ' ').trim(),
    )
    if (!clean) return

    stop()
    const seq = speakSeq
    const onStart = options?.onStart

    try {
      const result = await speakLocalPipelined(clean, seq, onStart)
      if (seq !== speakSeq) return
      if (result === 'ok') return
    } catch (err) {
      if (seq !== speakSeq) return
      if (speaking.value && engine.value === 'local') return
      const tip = err instanceof Error ? err.message : '未知错误'
      error.value = `云端语音失败，已切换系统音色（${tip.slice(0, 80)}）`
    }

    if (seq !== speakSeq) return
    if (speaking.value && engine.value === 'local') return

    await speakBrowser(clean, seq, onStart)
  }

  onUnmounted(() => stop())

  return { speaking, supported, error, engine, speak, stop }
}
