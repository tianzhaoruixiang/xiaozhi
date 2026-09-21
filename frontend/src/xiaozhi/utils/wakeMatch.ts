/**
 * 语音唤醒词匹配：主唤醒词「你好，小智」；兼容 ASR 常见误听。
 *
 * 唤醒只在句首生效（小爱同学式）：
 * - 「你好小智」            → 唤醒，等待后续指令
 * - 「你好小智，明天几点开会」→ 唤醒 + 指令
 * - 「刚才我说了你好小智吗」  → 不唤醒（避免闲聊误唤醒）
 * - 「你好小」              → 视为被截断的半句，不算唤醒，避免 ASR 拆句导致误触发
 */

/** 对外展示用标准唤醒词 */
export const WAKE_PHRASE_DISPLAY = '你好，小智'

const WAKE_CANONICAL = ['你好小智', '你好，小智'] as const

/** 精确短语 + 常见误听变体（去空白标点后匹配） */
const WAKE_ALIASES: string[] = [
  '你好小智',
  '您好小智',
  '你好晓智',
  '你好小至',
  '你好小知',
  '你好小枝',
  '你好小纸',
  '你好小只',
  '您好小至',
  '您好小知',
  '您好晓智',
  'nihaoxiaozhi',
  'helloxiaozhi',
]

function stripNoise(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，,。.!！？?、；;：:\-—_~`'""''（）()【】\[\]{}<>《》]/g, '')
    .toLowerCase()
}

/** 「你好/您好 + 可选字 + 小X」松匹配，仅句首 */
function looseWake(compact: string): { hit: boolean; prefixLen: number } {
  const m = /^(你好|您好)[\u4e00-\u9fff]{0,1}小[智至知枝纸只质]/.exec(compact)
  if (!m) return { hit: false, prefixLen: 0 }
  return { hit: true, prefixLen: m[0].length }
}

/** 去掉指令开头的标点与语气词/停顿词 */
export function stripFiller(text: string): string {
  const out = text
    .replace(/^[\s\u3000，,。.!！？?、；;：:\-—_~]+/u, '')
    .trim()
  // 「嗯明天开会」这类：单字语气词后还有内容才剥，避免把「明天」的「明」吃掉
  return out.replace(/^[嗯呃哦唉噢额啊](?=.)/u, '').trim()
}

/** 从原文中剥掉唤醒词，返回指令正文 */
function extractCommand(fullText: string, wakeKey: string): string {
  const compact = stripNoise(fullText)
  if (!compact.startsWith(wakeKey)) return ''
  let rest = fullText
  // 原文可能带标点，用正则容错地去掉句首那段唤醒词
  const escaped = [...wakeKey]
    .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\s\\u3000，,。.!！？?、；;：:\\-—_~]*')
  rest = rest.replace(new RegExp(`^[\\s\\u3000]*${escaped}[\\s\\u3000]*[，,。.!！？?、；;：:\\-—_~]*`, 'i'), '')
  const command = stripFiller(rest)
  if (command.length >= 2) return command
  const fallback = stripFiller(compact.slice(wakeKey.length))
  return fallback.length >= 2 ? fallback : ''
}

export type WakeMatch = {
  hit: boolean
  /** 去掉唤醒词后的指令正文 */
  command: string
  /** 是否整句几乎只有唤醒词 */
  wakeOnly: boolean
}

/**
 * 判断识别文本是否命中唤醒；命中时返回剥离后的指令。
 */
export function matchWakePhrase(
  raw: string,
  extraWords: string[] = [],
): WakeMatch {
  const text = raw.trim()
  if (!text) return { hit: false, command: '', wakeOnly: false }

  const compact = stripNoise(text)
  if (!compact) return { hit: false, command: '', wakeOnly: false }

  const aliases = [
    ...WAKE_ALIASES,
    ...extraWords.map(stripNoise).filter(Boolean),
    ...WAKE_CANONICAL.map(stripNoise),
  ]

  const sorted = [...new Set(aliases)].sort((a, b) => b.length - a.length)
  for (const alias of sorted) {
    const key = stripNoise(alias)
    if (key.length < 4) continue
    // 必须整句以唤醒词开头；句中出现一律不唤醒
    if (!compact.startsWith(key)) continue
    const command = extractCommand(text, key)
    return { hit: true, command, wakeOnly: command.length < 2 }
  }

  const loose = looseWake(compact)
  if (loose.hit) {
    const command = extractCommand(text, compact.slice(0, loose.prefixLen))
    return { hit: true, command, wakeOnly: command.length < 2 }
  }

  return { hit: false, command: '', wakeOnly: false }
}

export const DEFAULT_WAKE_WORDS = [WAKE_PHRASE_DISPLAY, '你好小智']
