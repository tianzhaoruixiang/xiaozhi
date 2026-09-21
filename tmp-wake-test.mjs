function stripNoise(text) {
  return text
    .normalize('NFKC')
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，,。.!！？?、；;：:\-—_~`'""''（）()【】\[\]{}<>《》]/g, '')
    .toLowerCase()
}

function stripFiller(text) {
  const out = text.replace(/^[\s\u3000，,。.!！？?、；;：:\-—_~]+/u, '').trim()
  return out.replace(/^[嗯呃哦唉噢额啊](?=.)/u, '').trim()
}

function extractCommand(fullText, wakeKey) {
  const compact = stripNoise(fullText)
  if (!compact.startsWith(wakeKey)) return ''
  const escaped = [...wakeKey]
    .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\s\\u3000，,。.!！？?、；;：:\\-—_~]*')
  const rest = fullText.replace(
    new RegExp(`^[\\s\\u3000]*${escaped}[\\s\\u3000]*[，,。.!！？?、；;：:\\-—_~]*`, 'i'),
    '',
  )
  const command = stripFiller(rest)
  if (command.length >= 2) return command
  const fallback = stripFiller(compact.slice(wakeKey.length))
  return fallback.length >= 2 ? fallback : ''
}

function looseWake(compact) {
  const m = /^(你好|您好)[\u4e00-\u9fff]{0,1}(智[枢书树舒殊]|小[智至知枝纸只质])/.exec(compact)
  if (!m) return { hit: false, prefixLen: 0 }
  return { hit: true, prefixLen: m[0].length }
}

const WAKE_ALIASES = [
  '你好智枢',
  '您好智枢',
  '你好智书',
  '你好智树',
  '你好知枢',
  '你好之枢',
  '你好支枢',
  '您好智书',
  '您好智树',
  'nihaozhishu',
  'hellozhishu',
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
const WAKE_CANONICAL = ['你好智枢', '你好，智枢']

function matchWakePhrase(raw) {
  const text = raw.trim()
  if (!text) return { hit: false, command: '', wakeOnly: false }
  const compact = stripNoise(text)
  if (!compact) return { hit: false, command: '', wakeOnly: false }
  const aliases = [...WAKE_ALIASES, ...WAKE_CANONICAL.map(stripNoise)]
  const sorted = [...new Set(aliases)].sort((a, b) => b.length - a.length)
  for (const alias of sorted) {
    const key = stripNoise(alias)
    if (key.length < 4) continue
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

const cases = [
  ['你好，智枢', true, true],
  ['你好智枢', true, true],
  ['你好智枢，明天几点开会', true, false],
  ['您好智枢准备下午会议', true, false],
  ['你好晓智', true, true],
  ['你好智书准备下午会议', true, false],
  ['刚才我说了你好智枢吗', false, false],
  ['你好智', false, false],
  ['智枢智枢', false, false],
  ['今天天气怎么样', false, false],
]

let fail = 0
for (const [text, expectHit, expectWakeOnly] of cases) {
  const r = matchWakePhrase(text)
  const ok = r.hit === expectHit && (!expectHit || r.wakeOnly === expectWakeOnly)
  if (!ok) fail += 1
  console.log(ok ? 'PASS' : 'FAIL', JSON.stringify({ text, expectHit, expectWakeOnly, ...r }))
}
process.exit(fail ? 1 : 0)
