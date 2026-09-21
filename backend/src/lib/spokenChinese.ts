/**
 * 口述用中文数字：时间、日期与其余阿拉伯数字一律读成汉字。
 */

const DIGITS = '零一二三四五六七八九'

function digitRead(n: number): string {
  return DIGITS[n] ?? String(n)
}

/** 非负整数读法（一百零一、二十、十） */
export function toChineseInteger(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n)
  const v = Math.floor(n)
  if (v < 10) return digitRead(v)
  if (v < 20) return v === 10 ? '十' : `十${digitRead(v - 10)}`
  if (v < 100) {
    const tens = Math.floor(v / 10)
    const ones = v % 10
    return `${digitRead(tens)}十${ones ? digitRead(ones) : ''}`
  }
  if (v < 1000) {
    const hundreds = Math.floor(v / 100)
    const rest = v % 100
    const head = `${digitRead(hundreds)}百`
    if (rest === 0) return head
    if (rest < 10) return `${head}零${digitRead(rest)}`
    return `${head}${toChineseInteger(rest)}`
  }
  if (v < 10000) {
    const thousands = Math.floor(v / 1000)
    const rest = v % 1000
    const head = `${digitRead(thousands)}千`
    if (rest === 0) return head
    if (rest < 100) return `${head}零${toChineseInteger(rest)}`
    return `${head}${toChineseInteger(rest)}`
  }
  const wan = Math.floor(v / 10000)
  const rest = v % 10000
  const head = `${toChineseInteger(wan)}万`
  if (rest === 0) return head
  if (rest < 1000) return `${head}零${toChineseInteger(rest)}`
  return `${head}${toChineseInteger(rest)}`
}

/** 年份、房号等逐位读：二零二六、一零一 */
export function toChineseDigits(raw: string): string {
  return raw.replace(/\d/g, (d) => digitRead(Number(d)))
}

function hourSpoken(h: number): string {
  const n = ((h % 24) + 24) % 24
  if (n === 2) return '两'
  return toChineseInteger(n)
}

function spokenClock(h: number, m: number): string {
  if (m === 0) return `${hourSpoken(h)}点整`
  if (m < 10) return `${hourSpoken(h)}点零${digitRead(m)}分`
  return `${hourSpoken(h)}点${toChineseInteger(m)}分`
}

function spokenDateParts(y?: number, mo?: number, d?: number): string {
  const bits: string[] = []
  if (y != null) bits.push(`${toChineseDigits(String(y))}年`)
  if (mo != null) bits.push(`${toChineseInteger(mo)}月`)
  if (d != null) bits.push(`${toChineseInteger(d)}日`)
  return bits.join('')
}

/**
 * 把文本里的时间、日期和阿拉伯数字改成可朗读的汉字。
 */
export function arabicToSpoken(input: string): string {
  if (!input) return input
  let t = input

  // 2026-09-22 14:30 / 2026/9/22 14:30:00
  t = t.replace(
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2})[:：](\d{2})(?:[:：]\d{2})?)?/g,
    (_m, y, mo, d, hh?: string, mm?: string) => {
      const date = spokenDateParts(Number(y), Number(mo), Number(d))
      if (hh == null) return date
      return `${date}${spokenClock(Number(hh), Number(mm))}`
    },
  )

  // 14:30、9：05
  t = t.replace(/(\d{1,2})[:：](\d{2})(?:[:：]\d{2})?/g, (_m, hh, mm) =>
    spokenClock(Number(hh), Number(mm)),
  )

  // 14点30分 / 9点05分 / 2点
  t = t.replace(/(\d{1,2})\s*点\s*(\d{1,2})\s*分?/g, (_m, hh, mm) =>
    spokenClock(Number(hh), Number(mm)),
  )
  t = t.replace(/(\d{1,2})\s*点(?!整)/g, (_m, hh) => `${hourSpoken(Number(hh))}点`)

  // 2026年9月22日 / 9月22日 / 22日
  t = t.replace(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g, (_m, y, mo, d) =>
    spokenDateParts(Number(y), Number(mo), Number(d)),
  )
  t = t.replace(/(\d{4})\s*年/g, (_m, y) => `${toChineseDigits(y)}年`)
  t = t.replace(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/g, (_m, mo, d) =>
    `${toChineseInteger(Number(mo))}月${toChineseInteger(Number(d))}日`,
  )

  // 百分之 30% / 30％
  t = t.replace(/(\d+(?:\.\d+)?)\s*[%％]/g, (_m, num) => `百分之${decimalSpoken(num)}`)

  // 3.5
  t = t.replace(/(\d+)\.(\d+)/g, (_m, a, b) => `${toChineseInteger(Number(a))}点${toChineseDigits(b)}`)

  // 三位数房号、门牌等：101 → 一零一
  t = t.replace(/(\d{3,})/g, (m) => {
    if (m.length >= 5) return toChineseDigits(m)
    if (m.length === 4) return toChineseDigits(m)
    return toChineseDigits(m)
  })

  // 其余 1–2 位整数
  t = t.replace(/\d+/g, (m) => toChineseInteger(Number(m)))

  return t
}

function decimalSpoken(num: string): string {
  const [a, b] = num.split('.')
  if (!b) return toChineseInteger(Number(a))
  return `${toChineseInteger(Number(a))}点${toChineseDigits(b)}`
}
