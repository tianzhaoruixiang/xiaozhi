import { onUnmounted, ref } from 'vue'

/** 将 Float32 PCM 编码为 WAV（16bit mono） */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * 本地 ASR 按住说话：浏览器采音 → 后端 sherpa-onnx 离线识别。
 * 不依赖 Google 云端语音。
 */
export function useLocalVoiceInput(options?: {
  onText?: (text: string) => void
}) {
  const available = ref(false)
  const recording = ref(false)
  const recognizing = ref(false)
  const error = ref<string | null>(null)

  let mediaStream: MediaStream | null = null
  let audioCtx: AudioContext | null = null
  let processor: ScriptProcessorNode | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let chunks: Float32Array[] = []
  let inputRate = 16000

  const check = async () => {
    try {
      const res = await fetch('/api/tts/asr/health')
      if (!res.ok) {
        available.value = false
        return false
      }
      const data = (await res.json()) as { ok?: boolean; ready?: boolean }
      available.value = Boolean(data.ok && data.ready)
      return available.value
    } catch {
      available.value = false
      return false
    }
  }

  const startHold = async () => {
    error.value = null
    if (recording.value) return
    const ok = available.value || (await check())
    if (!ok) {
      error.value =
        '本地语音识别未就绪。请部署 ASR 模型后重试，或检查 /api/tts/asr/health'
      return
    }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      audioCtx = new AudioContext()
      inputRate = audioCtx.sampleRate
      source = audioCtx.createMediaStreamSource(mediaStream)
      // 4096 buffer；已废弃但仍广泛可用，内网兼容性好
      processor = audioCtx.createScriptProcessor(4096, 1, 1)
      chunks = []
      processor.onaudioprocess = (ev) => {
        const input = ev.inputBuffer.getChannelData(0)
        chunks.push(new Float32Array(input))
      }
      source.connect(processor)
      processor.connect(audioCtx.destination)
      recording.value = true
    } catch {
      error.value = '无法打开麦克风，请检查浏览器权限'
      await stopHold(false)
    }
  }

  const stopHold = async (recognize = true) => {
    recording.value = false
    try {
      processor?.disconnect()
      source?.disconnect()
      await audioCtx?.close()
    } catch {
      // ignore
    }
    processor = null
    source = null
    audioCtx = null
    mediaStream?.getTracks().forEach((t) => t.stop())
    mediaStream = null

    if (!recognize) {
      chunks = []
      return
    }
    if (!chunks.length) {
      error.value = '没有录到声音，请按住再说一次'
      return
    }

    const total = chunks.reduce((n, c) => n + c.length, 0)
    const merged = new Float32Array(total)
    let off = 0
    for (const c of chunks) {
      merged.set(c, off)
      off += c.length
    }
    chunks = []

    // 线性重采样到 16k，比取整抽取更保辅音
    const targetRate = 16000
    const duration = merged.length / inputRate
    const newLen = Math.max(1, Math.round(duration * targetRate))
    const resampled = new Float32Array(newLen)
    const scale = merged.length / newLen
    for (let i = 0; i < newLen; i += 1) {
      const src = i * scale
      const i0 = Math.floor(src)
      const i1 = Math.min(merged.length - 1, i0 + 1)
      const t = src - i0
      resampled[i] = (merged[i0] ?? 0) * (1 - t) + (merged[i1] ?? 0) * t
    }

    recognizing.value = true
    try {
      const wav = encodeWav(resampled, targetRate)
      const form = new FormData()
      form.append('file', wav, 'hold.wav')
      const res = await fetch('/api/tts/asr', { method: 'POST', body: form })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(detail || `识别失败 ${res.status}`)
      }
      const data = (await res.json()) as { text?: string }
      const text = (data.text || '').trim()
      if (!text) {
        error.value = '未识别出有效内容，请再说一次'
        return
      }
      error.value = null
      options?.onText?.(text)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '本地识别失败'
    } finally {
      recognizing.value = false
    }
  }

  onUnmounted(() => {
    void stopHold(false)
  })

  return {
    available,
    recording,
    recognizing,
    error,
    check,
    startHold,
    stopHold,
  }
}
