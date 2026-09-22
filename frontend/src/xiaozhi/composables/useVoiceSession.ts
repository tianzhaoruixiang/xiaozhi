import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSpeechReport } from './useSpeechReport'
import { useVoiceWake } from './useVoiceWake'

/** 唤醒应答语，参考「小爱同学」：喊一声就回「我在」 */
export const WAKE_ACK_PHRASE = '我在。'

/** 唤醒应答 / 汇报播报结束后的静默期，挡掉尾音回采 */
const ECHO_GUARD_MS = 800
/** 上报完一段指令后的冷却，避免同一句话被切成两段重复发送 */
const SUBMIT_COOLDOWN_MS = 1600
/** 播报结束后继续听下一条指示的窗口 */
const FOLLOWUP_LISTEN_MS = 45000

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
 * 待机 → 唤醒词 → 听指令 → 自动发送 → 播报完成后回到待机。
 *
 * 默认不开麦、不处于听指令状态。用户点头像后麦克风才进入唤醒词检测；
 * 只有「你好智枢」才唤醒并播报「我在」，收完这一段即休眠，
 * 下一轮必须重新喊唤醒词。
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

  /** 刚发过指令的冷却期内不接收新指令 */
  const canAcceptCommand = () => Date.now() - lastSubmitAt >= SUBMIT_COOLDOWN_MS

  const wake = useVoiceWake({
    onWake: ({ hasFollowUp }) => {
      if (!hasFollowUp) options.onWakeDetected?.()
      if (hasFollowUp || !ackSupported.value) {
        return
      }
      ackSeq += 1
      const seq = ackSeq
      ackPlaying.value = true
      // 合成「我在」期间继续开麦：领导常在应答响起前就把指令说完
      void playAck(WAKE_ACK_PHRASE, {
        onStart: () => {
          if (seq !== ackSeq) return
          wake.pause()
        },
      })
        .catch(() => undefined)
        .then(() => {
          if (seq !== ackSeq) return
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
      const compact = text.replace(/[\s，,。.!！？?]/g, '')
      if (/我在|请讲/.test(compact) && compact.length <= 8) return
      if (!canAcceptCommand()) return
      if (ackPlaying.value) {
        ackSeq += 1
        clearEchoTimer()
        ackPlaying.value = false
        stopAck()
        wake.resume()
      }
      lastSubmitAt = Date.now()
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

  const listenForReply = (timeoutMs = FOLLOWUP_LISTEN_MS) => {
    wake.listenForReply(timeoutMs)
    listening.value = true
    clearEchoTimer()
    echoTimer = window.setTimeout(() => {
      echoTimer = null
      wake.resume()
    }, ECHO_GUARD_MS)
  }

  /** 结束本轮听指令，麦克风若已开则只继续检测唤醒词 */
  const standby = () => {
    ackSeq += 1
    clearEchoTimer()
    ackPlaying.value = false
    stopAck()
    wake.standby()
    listening.value = false
    wake.resume()
  }

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
    listenForReply,
    standby,
  }
}
