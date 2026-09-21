import { onMounted, onUnmounted, ref } from 'vue'
import {
  DEFAULT_WAKE_WORDS,
  matchWakePhrase,
  stripFiller,
} from '../utils/wakeMatch'

type WakeCallbacks = {
  /** 命中唤醒词时触发；hasFollowUp=true 表示一句话里同时带着指令 */
  onWake: (info: { hasFollowUp: boolean }) => void
  /** 一段话说完（检测到停顿）后触发，交给上层发送 */
  onTranscript?: (text: string) => void
  wakeWords?: string[]
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

/** 上报的一段话最短时长（防止噪声触发 ASR） */
const MIN_UTTERANCE_SEC = 0.22
/** 松匹配命中后，极短时间内的碎片不再当指令（ASR 把唤醒词拆成多句时兜底） */
const FRAGMENT_GUARD_MS = 1400
/** 唤醒后无人说话，回到待机 */
const AWAKE_TIMEOUT_MS = 12000
/** 最短指令长度（「开」「好」这类噪声直接丢弃） */
const MIN_COMMAND_LEN = 2

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function isSecureContextNow(): boolean {
  if (typeof window === 'undefined') return false
  if (window.isSecureContext) return true
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

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

function resampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  const targetRate = 16000
  if (inputRate === targetRate) return input
  const duration = input.length / inputRate
  const newLen = Math.max(1, Math.round(duration * targetRate))
  const out = new Float32Array(newLen)
  const scale = input.length / newLen
  for (let i = 0; i < newLen; i += 1) {
    const src = i * scale
    const i0 = Math.floor(src)
    const i1 = Math.min(input.length - 1, i0 + 1)
    const t = src - i0
    out[i] = (input[i0] ?? 0) * (1 - t) + (input[i1] ?? 0) * t
  }
  return out
}

function rms(frame: Float32Array): number {
  let sum = 0
  for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i]
  return Math.sqrt(sum / Math.max(1, frame.length))
}

/**
 * 语音唤醒 + 一段话收音。
 *
 * 平时待机：持续做本地 VAD，只有识别文本以「你好智枢」开头才算唤醒，
 * 其它声音（聊天、噪声、电视）一律丢弃，不会进入识别/发送流程。
 *
 * 唤醒后：进入「等着听指令」状态，领导一停嘴（约 0.4s 静音）
 * 就自动把这一整段送 ASR 并回调 onTranscript，不再需要点按发送。
 *
 * 一句话同时说「你好智枢 + 指令」时直接给指令，不播「我在」。
 */
export function useVoiceWake(callbacks: WakeCallbacks) {
  const supported = ref(false)
  const listening = ref(false)
  const recognizing = ref(false)
  /** 已唤醒、等待领导口述指令 */
  const awaitingCommand = ref(false)
  /** 当前是否检测到说话（收音中） */
  const capturing = ref(false)
  /** 0~1 周边声强（平滑后），驱动头像呼吸 */
  const soundLevel = ref(0)
  /** 是否听到周边声音 */
  const hearing = ref(false)
  const error = ref<string | null>(null)
  const mode = ref<'local-asr' | 'browser-cloud' | 'unavailable'>('unavailable')
  const wakeWords = callbacks.wakeWords?.length
    ? callbacks.wakeWords
    : DEFAULT_WAKE_WORDS

  let shouldRun = false
  let armedTimer: number | null = null
  let levelSmooth = 0
  let levelDecayTimer: number | null = null
  /** 松匹配命中时间戳，用于抑制 ASR 拆句造成的碎片误发 */
  let pendingWakeAt = 0

  // —— 本地持续聆听 ——
  let mediaStream: MediaStream | null = null
  let audioCtx: AudioContext | null = null
  let processor: ScriptProcessorNode | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let muteGain: GainNode | null = null
  let inputRate = 16000
  let speechChunks: Float32Array[] = []
  let inSpeech = false
  let silenceFrames = 0
  let speechFrames = 0
  let pausedForTts = false
  let recognizeBusy = false

  // —— 浏览器回退 ——
  let recognition: SpeechRecognitionLike | null = null
  let restartTimer: number | null = null

  const clearArmedTimer = () => {
    if (armedTimer != null) {
      window.clearTimeout(armedTimer)
      armedTimer = null
    }
  }

  const disarm = () => {
    clearArmedTimer()
    pendingWakeAt = 0
    awaitingCommand.value = false
  }

  /** 唤醒命中：进入等指令状态，并通知上层播「我在」 */
  const arm = (hasFollowUp: boolean) => {
    awaitingCommand.value = true
    clearArmedTimer()
    armedTimer = window.setTimeout(() => {
      awaitingCommand.value = false
    }, AWAKE_TIMEOUT_MS)
    callbacks.onWake({ hasFollowUp })
  }

  /** 不经过唤醒词，直接听下一句（用于确认发出） */
  const listenForReply = (timeoutMs = 45000) => {
    awaitingCommand.value = true
    clearArmedTimer()
    armedTimer = window.setTimeout(() => {
      awaitingCommand.value = false
    }, timeoutMs)
  }

  const handleRecognizedText = (raw: string) => {
    const text = raw.trim()
    if (!text) return

    const matched = matchWakePhrase(text, wakeWords)
    const fromWakeAt = pendingWakeAt
    pendingWakeAt = 0

    if (awaitingCommand.value) {
      // 已唤醒：再喊一次唤醒词只当作重申，不算指令
      if (matched.hit && matched.wakeOnly) {
        const stripped = stripFiller(text)
        if (stripped !== text || text.length <= 6) return
      }
      const command = (matched.hit ? matched.command : text).trim()
      if (command.length < MIN_COMMAND_LEN) return
      disarm()
      callbacks.onTranscript?.(command)
      return
    }

    if (!matched.hit) return

    // 松匹配只认出半句「你好小」，多半是 ASR 把唤醒词拆开了：
    // 让后续碎片进入等指令状态，而不是把它当成一句指令发出去
    if (matched.wakeOnly) {
      const guard =
        fromWakeAt > 0 && Date.now() - fromWakeAt < FRAGMENT_GUARD_MS
      pendingWakeAt = guard ? fromWakeAt : Date.now()
      arm(false)
      return
    }

    // 一句话里「唤醒词 + 指令」
    disarm()
    callbacks.onWake({ hasFollowUp: true })
    callbacks.onTranscript?.(matched.command)
  }

  const updateSoundLevel = (level: number) => {
    // 归一化：环境噪声约 0.005~0.02，说话约 0.03+
    const normalized = Math.min(1, Math.max(0, (level - 0.004) / 0.06))
    levelSmooth = levelSmooth * 0.62 + normalized * 0.38
    soundLevel.value = levelSmooth
    hearing.value = levelSmooth > 0.08
  }

  const decaySoundLevel = () => {
    if (levelDecayTimer != null) return
    levelDecayTimer = window.setInterval(() => {
      if (!pausedForTts && shouldRun && mode.value === 'local-asr') {
        // 有实时帧时由 onaudioprocess 更新
        return
      }
      levelSmooth *= 0.85
      if (levelSmooth < 0.02) {
        levelSmooth = 0
        soundLevel.value = 0
        hearing.value = false
        if (levelDecayTimer != null) {
          window.clearInterval(levelDecayTimer)
          levelDecayTimer = null
        }
        return
      }
      soundLevel.value = levelSmooth
      hearing.value = levelSmooth > 0.08
    }, 50)
  }

  const checkLocalAsr = async () => {
    try {
      const res = await fetch('/api/tts/asr/health')
      if (!res.ok) return false
      const data = (await res.json()) as { ok?: boolean; ready?: boolean }
      return Boolean(data.ok && data.ready)
    } catch {
      return false
    }
  }

  /** 送去识别前先冻结状态：识别期间若被暂停（TTS 开始播报）则丢弃结果 */
  const recognizeUtterance = async (samples: Float32Array, rate: number) => {
    if (recognizeBusy || samples.length < rate * MIN_UTTERANCE_SEC) return
    const armedWhileCapture = awaitingCommand.value
    recognizeBusy = true
    recognizing.value = true
    try {
      const wav = encodeWav(resampleTo16k(samples, rate), 16000)
      const form = new FormData()
      form.append('file', wav, 'wake.wav')
      const res = await fetch('/api/tts/asr', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`识别失败 ${res.status}`)
      const data = (await res.json()) as { text?: string }
      const text = (data.text || '').trim()
      if (!text) return
      // 这段声音是唤醒应答（或汇报）自己的回声，丢掉
      if (pausedForTts) return
      if (armedWhileCapture && !awaitingCommand.value) return
      error.value = null
      handleRecognizedText(text)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '本地唤醒识别失败'
    } finally {
      recognizing.value = false
      recognizeBusy = false
    }
  }

  const stopLocalCapture = async () => {
    try {
      processor?.disconnect()
      source?.disconnect()
      muteGain?.disconnect()
      await audioCtx?.close()
    } catch {
      // ignore
    }
    processor = null
    source = null
    muteGain = null
    audioCtx = null
    mediaStream?.getTracks().forEach((t) => t.stop())
    mediaStream = null
    speechChunks = []
    inSpeech = false
    capturing.value = false
    silenceFrames = 0
    speechFrames = 0
  }

  const startLocal = async () => {
    if (!isSecureContextNow()) {
      error.value = '语音需在 localhost 或 HTTPS 下使用'
      mode.value = 'unavailable'
      supported.value = false
      return false
    }
    const ready = await checkLocalAsr()
    if (!ready) return false

    await stopLocalCapture()
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      audioCtx = new AudioContext()
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => undefined)
      }
      inputRate = audioCtx.sampleRate
      source = audioCtx.createMediaStreamSource(mediaStream)
      processor = audioCtx.createScriptProcessor(4096, 1, 1)
      muteGain = audioCtx.createGain()
      muteGain.gain.value = 0

      // 约 85ms/帧 @48k。待命稍长以免误切；已唤醒后加快收尾。
      const silenceNeedIdle = Math.max(5, Math.round((0.55 * inputRate) / 4096))
      const silenceNeedArmed = Math.max(4, Math.round((0.4 * inputRate) / 4096))
      const speechNeed = Math.max(2, Math.round((0.22 * inputRate) / 4096))
      const maxSpeechSec = 12
      let noiseFloor = 0.006

      const flushUtterance = (chunks: Float32Array[]) => {
        const total = chunks.reduce((n, c) => n + c.length, 0)
        if (total < inputRate * MIN_UTTERANCE_SEC) return
        const merged = new Float32Array(total)
        let off = 0
        for (const c of chunks) {
          merged.set(c, off)
          off += c.length
        }
        void recognizeUtterance(merged, inputRate)
      }

      processor.onaudioprocess = (ev) => {
        if (!shouldRun || pausedForTts) {
          decaySoundLevel()
          return
        }
        const input = ev.inputBuffer.getChannelData(0)
        if (recognizeBusy) {
          // 识别中继续攒帧 + 更新声强，避免领导接着说的前半句被丢掉
          updateSoundLevel(rms(input))
          if (speechChunks.length < 400) speechChunks.push(new Float32Array(input))
          return
        }
        const level = rms(input)
        updateSoundLevel(level)

        if (!inSpeech) {
          noiseFloor = noiseFloor * 0.97 + level * 0.03
          const energyOn = Math.max(0.01, noiseFloor * 3.4)
          if (level >= energyOn) {
            speechFrames += 1
            speechChunks.push(new Float32Array(input))
            if (speechFrames >= speechNeed) {
              inSpeech = true
              capturing.value = true
              silenceFrames = 0
            }
          } else {
            speechFrames = 0
            speechChunks = []
          }
          return
        }

        speechChunks.push(new Float32Array(input))
        const energyOff = Math.max(0.007, noiseFloor * 1.9)
        if (level < energyOff) silenceFrames += 1
        else silenceFrames = 0

        const totalSamples = speechChunks.reduce((n, c) => n + c.length, 0)
        const tooLong = totalSamples >= inputRate * maxSpeechSec
        const silenceNeed = awaitingCommand.value ? silenceNeedArmed : silenceNeedIdle
        if (silenceFrames >= silenceNeed || tooLong) {
          const chunks = speechChunks
          speechChunks = []
          inSpeech = false
          capturing.value = false
          silenceFrames = 0
          speechFrames = 0
          flushUtterance(chunks)
        }
      }

      source.connect(processor)
      processor.connect(muteGain)
      muteGain.connect(audioCtx.destination)

      mode.value = 'local-asr'
      supported.value = true
      listening.value = true
      error.value = null
      return true
    } catch {
      error.value = '无法打开麦克风，请在浏览器地址栏允许麦克风权限'
      await stopLocalCapture()
      return false
    }
  }

  // —— 浏览器云端回退 ——
  const clearRestart = () => {
    if (restartTimer != null) {
      window.clearTimeout(restartTimer)
      restartTimer = null
    }
  }

  const startBrowser = () => {
    const Ctor = getRecognitionCtor()
    if (!Ctor || !isSecureContextNow()) return false

    mode.value = 'browser-cloud'
    supported.value = true
    if (recognition) return true

    recognition = new Ctor()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal && !pausedForTts) handleRecognizedText(result[0].transcript)
      }
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldRun = false
        supported.value = false
        error.value = '麦克风权限被拒绝'
      } else if (event.error === 'network') {
        error.value = '浏览器云端识别不可用，正在尝试本地唤醒…'
      }
    }
    recognition.onend = () => {
      listening.value = false
      recognition = null
      if (shouldRun && mode.value === 'browser-cloud') {
        clearRestart()
        restartTimer = window.setTimeout(() => {
          if (shouldRun) startBrowser()
        }, 500)
      }
    }

    try {
      recognition.start()
      listening.value = true
      return true
    } catch {
      return false
    }
  }

  const stopBrowser = () => {
    clearRestart()
    try {
      recognition?.abort()
    } catch {
      // ignore
    }
    recognition = null
  }

  const start = async () => {
    shouldRun = true
    pausedForTts = false
    stopBrowser()

    const localOk = await startLocal()
    if (localOk) return

    // 本地 ASR 不可用时再试浏览器
    if (startBrowser()) {
      error.value = '本地语音识别未就绪，已回退浏览器唤醒（内网可能失败）'
      return
    }

    mode.value = 'unavailable'
    supported.value = false
    listening.value = false
    if (!error.value) {
      error.value = '语音唤醒不可用：请确认本地 ASR 已启动，并允许麦克风权限'
    }
  }

  const stop = () => {
    shouldRun = false
    pausedForTts = false
    disarm()
    clearRestart()
    stopBrowser()
    void stopLocalCapture()
    listening.value = false
    recognizing.value = false
    capturing.value = false
    hearing.value = false
    soundLevel.value = 0
    levelSmooth = 0
    if (levelDecayTimer != null) {
      window.clearInterval(levelDecayTimer)
      levelDecayTimer = null
    }
  }

  /** TTS 播报时暂停采集，避免把播报声当指令 */
  const pause = () => {
    pausedForTts = true
    listening.value = false
    capturing.value = false
    decaySoundLevel()
  }

  const resume = () => {
    if (!shouldRun) return
    pausedForTts = false
    if (levelDecayTimer != null) {
      window.clearInterval(levelDecayTimer)
      levelDecayTimer = null
    }
    if (mode.value === 'local-asr' && mediaStream) {
      listening.value = true
      return
    }
    void start()
  }

  onMounted(() => {
    void start()
  })

  onUnmounted(() => stop())

  return {
    supported,
    listening,
    recognizing,
    awaitingCommand,
    capturing,
    soundLevel,
    hearing,
    error,
    mode,
    start,
    stop,
    pause,
    resume,
    listenForReply,
    isSecureContext: isSecureContextNow,
  }
}
