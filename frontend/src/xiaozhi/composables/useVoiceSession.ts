import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSpeechReport } from './useSpeechReport'
import { useVoiceWake } from './useVoiceWake'

/** 唤醒应答语，参考「小爱同学」：喊一声就回「我在」 */
export const WAKE_ACK_PHRASE = '我在，请讲。'

/** 唤醒应答播报结束后的静默期，挡掉应答声尾音回采 */
const ECHO_GUARD_MS = 800
/** 上报完一段指令后的冷却，避免同一句话被切成两段重复发送 */
const SUBMIT_COOLDOWN_MS = 1600

type VoiceSessionOptions = {
  /** 听到完整指令（停顿后自动上报） */
  onCommand: (text: string) => void
  /** 命中唤醒词、准备接收指令 */
  onWakeDetected?: () => void
  /** 收到指令、进入处理流程 */
  onCommandStart?: () => void
  wakeWords?: string[]
}

/**
 * 待机 → 唤醒 → 听指令 → 自动发送 的完整语音链路。
 *
 * 平时不被唤醒：麦克风只做本地 VAD + 唤醒词判定，
 * 只有「你好小智」才唤醒，随即播报「我在，请讲」，
 * 然后开始收领导这一整段话，停嘴即自动把识别文本交出去。
 */
export function useVoiceSession(options: VoiceSessionOptions) {
  const {
    supported: ackSupported,
    speak: playAck,
    stop: stopAck,
  } = useSpeechReport()

  const listening = ref(false)
  const hearing = ref(false)
  const capturing = ref(false)
  const recognizing = ref(false)
  const awake = ref(false)
  /** 唤醒应答「我在」播报中 */
  const ackPlaying = ref(false)
  const soundLevel = ref(0)
  const error = ref<string | null>(null)
  const mode = ref<'local-asr' | 'browser-cloud' | 'unavailable'>('unavailable')
  const supported = ref(false)

  let ackSeq = 0
  let lastSubmitAt = 0
  let echoTimer: number | null = null

  const clearEchoTimer = () => {
    if (echoTimer != null) {
      window.clearTimeout(echoTimer)
      echoTimer = null
    }
  }

  /** 应答播报中 / 刚播完 / 刚发过指令，都不接收新指令 */
  const canAcceptCommand = () => {
    if (ackPlaying.value) return false
    if (Date.now() - lastSubmitAt < SUBMIT_COOLDOWN_MS) return false
    return true
  }

  const wake = useVoiceWake({
    onWake: ({ hasFollowUp }) => {
      if (!hasFollowUp) options.onWakeDetected?.()
      if (hasFollowUp || !ackSupported.value) {
        // 一句话说完，或本地 TTS 不可用：不播「我在」，直接等指令
        return
      }
      ackSeq += 1
      const seq = ackSeq
      ackPlaying.value = true
      wake.pause()
      void playAck(WAKE_ACK_PHRASE)
        .catch(() => undefined)
        .then(() => {
          if (seq !== ackSeq) return
          // 应答声尾音可能被回采，短静默后再开麦
          clearEchoTimer()
          echoTimer = window.setTimeout(() => {
            echoTimer = null
            if (seq !== ackSeq) return
            ackPlaying.value = false
            wake.resume()
          }, ECHO_GUARD_MS)
        })
    },
    onTranscript: (text) => {
      if (!canAcceptCommand()) return
      lastSubmitAt = Date.now()
      options.onCommandStart?.()
      options.onCommand(text)
    },
    wakeWords: options.wakeWords,
  })

  // 把检测层状态同步过来，面板/头像直接用这一份
  const syncFromWake = () => {
    awake.value = wake.awaitingCommand.value
    hearing.value = wake.hearing.value
    capturing.value = wake.capturing.value
    recognizing.value = wake.recognizing.value
    soundLevel.value = wake.soundLevel.value
    error.value = wake.error.value
    mode.value = wake.mode.value
    if (wake.supported.value) supported.value = true
    if (awake.value && !ackPlaying.value) listening.value = true
  }
  syncFromWake()
  watch(
    [
      wake.awaitingCommand,
      wake.listening,
      wake.hearing,
      wake.capturing,
      wake.recognizing,
      wake.soundLevel,
      wake.error,
      wake.mode,
      wake.supported,
    ],
    syncFromWake,
  )

  const start = () => wake.start()

  const stop = () => {
    ackSeq += 1
    clearEchoTimer()
    ackPlaying.value = false
    stopAck()
    wake.stop()
  }

  /** 上层播报（汇报、提示）前调用，避免把播报声收进来 */
  const pause = () => {
    ackSeq += 1
    clearEchoTimer()
    ackPlaying.value = false
    stopAck()
    wake.pause()
    listening.value = false
  }

  const resume = () => {
    wake.resume()
    listening.value = true
  }

  const micReady = computed(
    () => supported.value && (listening.value || awake.value),
  )

  onMounted(() => {
    syncFromWake()
  })

  onUnmounted(() => {
    ackSeq += 1
    clearEchoTimer()
    stopAck()
  })

  return {
    supported,
    mode,
    listening,
    awake,
    ackPlaying,
    hearing,
    capturing,
    recognizing,
    soundLevel,
    error,
    micReady,
    start,
    stop,
    pause,
    resume,
  }
}
