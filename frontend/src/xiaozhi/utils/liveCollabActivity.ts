import type { CollabStep } from '../types/assistant'

export type LiveActivityKind = 'tool' | 'think'

export interface LiveActivity {
  key: string
  kind: LiveActivityKind
  agentName: string
  title: string
  text: string
}

const isToolLog = (line: string) =>
  /^(开始调用|调用完成|调用失败|任务完成)/.test(line)

const clip = (text: string, max = 96) => {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/** 当前执行中的工具调用 + 近期思考，供小智气泡轮播 */
export function liveCollabActivities(steps: CollabStep[]): LiveActivity[] {
  const live = steps.filter((s) => s.status === 'running' || s.status === 'awaiting')
  const pool = live.length ? live : steps.slice(-2)
  const items: LiveActivity[] = []

  for (const step of pool) {
    for (const tool of step.tools ?? []) {
      if (tool.status !== 'running') continue
      items.push({
        key: `${step.id}-tool-${tool.id}`,
        kind: 'tool',
        agentName: step.name,
        title: tool.toolLabel,
        text: clip(tool.summary || `正在调用 ${tool.toolLabel}`),
      })
    }

    const thinkLogs = (step.logs ?? []).filter((line) => !isToolLog(line))
    for (const [offset, line] of thinkLogs.slice(-2).entries()) {
      const idx = thinkLogs.length - 2 + offset
      items.push({
        key: `${step.id}-think-${Math.max(0, idx)}`,
        kind: 'think',
        agentName: step.name,
        title: '思考',
        text: clip(line),
      })
    }

    if (step.summary && (step.status === 'running' || step.status === 'awaiting')) {
      items.push({
        key: `${step.id}-draft`,
        kind: 'think',
        agentName: step.name,
        title: '思考',
        text: clip(step.summary),
      })
    }
  }

  const seen = new Set<string>()
  return items.filter((item) => {
    const sig = `${item.kind}:${item.agentName}:${item.text}`
    if (seen.has(sig)) return false
    seen.add(sig)
    return true
  })
}
