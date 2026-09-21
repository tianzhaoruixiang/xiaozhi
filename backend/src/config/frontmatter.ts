/**
 * 简易 YAML frontmatter 解析（覆盖 Claude Code agents 常用标量/数组字段）
 */
export function parseFrontmatter(raw: string): {
  data: Record<string, unknown>
  body: string
} {
  const text = raw.replace(/^\uFEFF/, '')
  if (!text.startsWith('---')) {
    return { data: {}, body: text.trim() }
  }
  const end = text.indexOf('\n---', 3)
  if (end < 0) {
    return { data: {}, body: text.trim() }
  }
  const fm = text.slice(3, end).replace(/^\r?\n/, '')
  const body = text.slice(end + 4).replace(/^\r?\n/, '').trim()
  return { data: parseSimpleYaml(fm), body }
}

function parseSimpleYaml(src: string): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  const lines = src.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) {
      i += 1
      continue
    }
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!m) {
      i += 1
      continue
    }
    const key = m[1]
    const rest = m[2].trim()
    if (rest === '' || rest === '|' || rest === '>') {
      // 多行块：缩进内容
      const block: string[] = []
      i += 1
      while (i < lines.length) {
        const next = lines[i]
        if (/^\S/.test(next) && next.trim() !== '') break
        block.push(next.replace(/^\s{2}/, ''))
        i += 1
      }
      data[key] = block.join('\n').trim()
      continue
    }
    if (rest.startsWith('[') && rest.endsWith(']')) {
      data[key] = rest
        .slice(1, -1)
        .split(',')
        .map((s) => unquote(s.trim()))
        .filter(Boolean)
      i += 1
      continue
    }
    // 列表项紧随其后
    if (rest === '') {
      i += 1
      continue
    }
    // 检查下一行是否为 - item
    if (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
      const arr: string[] = []
      i += 1
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        arr.push(unquote(lines[i].replace(/^\s+-\s+/, '').trim()))
        i += 1
      }
      data[key] = arr
      continue
    }
    data[key] = coerce(unquote(rest))
    i += 1
  }
  return data
}

function unquote(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1)
  }
  return s
}

function coerce(s: string): string | number | boolean {
  if (s === 'true') return true
  if (s === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  return s
}
