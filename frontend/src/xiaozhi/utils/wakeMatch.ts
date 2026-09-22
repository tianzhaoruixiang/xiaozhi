/**
 * 语音唤醒词匹配：主唤醒词「你好，智枢」；兼容 ASR 常见误听。
 *
 * 唤醒主要在句首生效（小爱同学式）：
 * - 「你好智枢」            → 唤醒，等待后续指令
 * - 「你好智枢，明天几点开会」→ 唤醒 + 指令
 * - 「刚才我说了你好智枢吗」  → 不唤醒（避免闲聊误唤醒）
 * - 「嗯你好智枢」          → 剥开语气词后唤醒
 * - 「你好智」              → 整句被截断时视为唤醒（SenseVoice 常丢掉末字）
 */

/** 对外展示用标准唤醒词 */
export const WAKE_PHRASE_DISPLAY = '你好，智枢'

const WAKE_CANONICAL = ['你好智枢', '你好，智枢'] as const

/** 精确短语 + 常见误听变体（去空白标点后匹配） */
const WAKE_ALIASES: string[] = [
  '你好智枢',
  '您好智枢',
  '嗨智枢',
  '嘿智枢',
  '喂智枢',
  '你好智书',
  '你好智树',
  '你好知枢',
  '你好之枢',
  '你好支枢',
  '您好智书',
  '您好智树',
  // SenseVoice 常见误听
  '你好知识',
  '您好知识',
  '你好指数',
  '您好指数',
  '你好芝士',
  '您好芝士',
  '你好只是',
  '您好只是',
  '你好指示',
  '你好支持',
  '你好智数',
  '你好之数',
  '你好之书',
  '你好知书',
  '你好只书',
  '你好纸书',
  '你好直书',
  '你好智叔',
  '你好枝枢',
  '你好指枢',
  '你好至枢',
  '你好执枢',
  '你好助手',
  '你好之时',
  '你好之事',
  '你好师叔',
  '你号智枢',
  '泥好智枢',
  '拟好智枢',
  'nihaozhishu',
  'nihaozhishi',
  'hellozhishu',
  // 旧唤醒词误听兼容
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

const GREET = '(你好|您好|嗨|嘿|喂|你号|泥好|拟好)'
const ZHI = '(智|知|之|只|纸|直|枝|指|至|支|执|制|治|志|自|紫|师|诗)'
const SHU = '[枢书树舒殊数识士叔事是示术述束属速持柱足时]'
const LOOSE_WAKE = new RegExp(
  `^${GREET}(啊|呀)?((${ZHI}${SHU})|芝士|知识|只是|指示|支持|助手|小[智至知枝纸只质止志])`,
)
const TRUNCATED_WAKE = new RegExp(`^${GREET}(啊|呀)?${ZHI}$`)
const LEADING_FILLER = /^(嗯+|呃+|哦+|唉+|噢+|额+|啊+|呀+|那个|那么)+/

function stripNoise(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，,。.!！？?、；;：:\-—_~`'""''（）()【】\[\]{}<>《》]/g, '')
    .toLowerCase()
}

function stripLeadingFillerCompact(compact: string): string {
  return compact.replace(LEADING_FILLER, '')
}

/** 「你好/您好 + 智枢/小智」松匹配 */
function looseWake(compact: string): { hit: boolean; prefixLen: number } {
  const m = LOOSE_WAKE.exec(compact)
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
  const idx = compact.indexOf(wakeKey)
  if (idx < 0) return ''
  let rest = fullText
  const escaped = [...wakeKey]
    .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\s\\u3000，,。.!！？?、；;：:\\-—_~]*')
  rest = rest.replace(
    new RegExp(`^[\\s\\u3000]*${escaped}[\\s\\u3000]*[，,。.!！？?、；;：:\\-—_~]*`, 'i'),
    '',
  )
  if (idx > 0) {
    rest = stripNoise(fullText).slice(idx + wakeKey.length)
  }
  const command = stripFiller(rest)
  if (command.length >= 2) return command
  const fallback = stripFiller(compact.slice(idx + wakeKey.length))
  return fallback.length >= 2 ? fallback : ''
}

function miss(): WakeMatch {
  return { hit: false, command: '', wakeOnly: false }
}

function hitFromKey(text: string, compact: string, key: string): WakeMatch | null {
  if (key.length < 3) return null
  if (!compact.startsWith(key)) return null
  const command = extractCommand(text, key)
  return { hit: true, command, wakeOnly: command.length < 2 }
}

export type WakeMatch = {
  hit: boolean
  /** 去掉唤醒词后的指令正文 */
  command: string
  /** 是否整句几乎只有唤醒词 */
  wakeOnly: boolean
}

function matchAgainst(text: string, compact: string, aliases: string[]): WakeMatch {
  const sorted = [...new Set(aliases)].sort((a, b) => b.length - a.length)
  for (const alias of sorted) {
    const key = stripNoise(alias)
    const found = hitFromKey(text, compact, key)
    if (found) return found
  }

  const loose = looseWake(compact)
  if (loose.hit) {
    const command = extractCommand(text, compact.slice(0, loose.prefixLen))
    return { hit: true, command, wakeOnly: command.length < 2 }
  }

  // 整句只有被截断的唤醒词（末字被 ASR 吃掉）
  if (compact.length <= 5 && TRUNCATED_WAKE.test(compact)) {
    return { hit: true, command: '', wakeOnly: true }
  }

  return miss()
}

/**
 * 判断识别文本是否命中唤醒；命中时返回剥离后的指令。
 */
export function matchWakePhrase(
  raw: string,
  extraWords: string[] = [],
): WakeMatch {
  const text = raw.trim()
  if (!text) return miss()

  const compact = stripNoise(text)
  if (!compact) return miss()

  const aliases = [
    ...WAKE_ALIASES,
    ...extraWords.map(stripNoise).filter(Boolean),
    ...WAKE_CANONICAL.map(stripNoise),
  ]

  const direct = matchAgainst(text, compact, aliases)
  if (direct.hit) return direct

  const stripped = stripLeadingFillerCompact(compact)
  if (stripped && stripped !== compact) {
    const afterFiller = matchAgainst(text, stripped, aliases)
    if (afterFiller.hit) return afterFiller
  }

  // 短句前面黏了「喂/那个」时，仍按句首唤醒处理
  const probe = stripped || compact
  if (probe.length <= 8) {
    const sorted = [...new Set(aliases)].sort((a, b) => b.length - a.length)
    for (const alias of sorted) {
      const key = stripNoise(alias)
      if (key.length < 4) continue
      const at = probe.indexOf(key)
      if (at <= 0) continue
      const prefix = probe.slice(0, at)
      if (!/^(喂|嗨|嘿|那个)$/.test(prefix)) continue
      const command = extractCommand(text, key)
      return { hit: true, command, wakeOnly: command.length < 2 }
    }
  }

  return miss()
}

export const DEFAULT_WAKE_WORDS = [WAKE_PHRASE_DISPLAY, '你好智枢']
