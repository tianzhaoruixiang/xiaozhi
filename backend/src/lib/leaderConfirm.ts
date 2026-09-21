import { randomUUID } from 'node:crypto'
import type { SsePayload } from './sse.js'
import type { HuixunNoticeInput } from '../tools/huixun.js'

export type ConfirmDecision = {
  approved: boolean
  utterance?: string
  reason?: 'click' | 'oral' | 'timeout'
}

type Pending = {
  id: string
  draft: HuixunNoticeInput
  createdAt: number
  resolve: (decision: ConfirmDecision) => void
}

const pending = new Map<string, Pending>()

const APPROVE_RE =
  /(确认发出|确认发送|可以发|同意发|发出去|发送吧|发吧|批准|准发|确认|同意|可以|好的|行吧|就这样|通过)/
const REJECT_RE = /(先不发|不要发|先别发|暂缓|暂不|取消|驳回|不发|等等|先等等)/

export function classifyConfirmUtterance(
  text: string,
): 'approve' | 'reject' | 'unknown' {
  const t = text.trim().replace(/\s+/g, '')
  if (!t) return 'unknown'
  if (REJECT_RE.test(t)) return 'reject'
  if (APPROVE_RE.test(t)) return 'approve'
  return 'unknown'
}

export function buildDispatchPreview(draft: HuixunNoticeInput): string {
  return [
    `标题：${draft.title}`,
    draft.meetingTime ? `时间：${draft.meetingTime}` : '',
    draft.location ? `地点：${draft.location}` : '',
    `收件人：${draft.recipients.join('、')}`,
    draft.agendaTitle ? `附件：${draft.agendaTitle}` : draft.agenda ? '附件：会议议程' : '',
    draft.briefingTitle
      ? `附件：${draft.briefingTitle}`
      : draft.backgroundBrief
        ? '附件：会议资料'
        : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildConfirmOral(draft: HuixunNoticeInput): string {
  const when = draft.meetingTime ? `时间${draft.meetingTime}，` : ''
  const where = draft.location ? `地点${draft.location}。` : ''
  const agenda = draft.agendaTitle || (draft.agenda ? '会议议程' : '')
  const extra = agenda ? `将一并附上${agenda}。` : ''
  return `厅长，会议通知已经拟好，标题是「${draft.title}」。${when}${where}${extra}是否确认发给全体参会人？您可以说「确认发出」，或在页面上点击确认。`
}

export function registerLeaderConfirm(draft: HuixunNoticeInput): {
  id: string
  promise: Promise<ConfirmDecision>
} {
  const id = randomUUID()
  let resolve!: (decision: ConfirmDecision) => void
  const promise = new Promise<ConfirmDecision>((res) => {
    resolve = res
  })
  pending.set(id, { id, draft, createdAt: Date.now(), resolve })
  return { id, promise }
}

export function resolveLeaderConfirm(
  id: string,
  decision: ConfirmDecision,
): boolean {
  const item = pending.get(id)
  if (!item) return false
  pending.delete(id)
  item.resolve(decision)
  return true
}

export async function awaitLeaderDispatchConfirm(options: {
  onEvent: (payload: SsePayload) => void
  agentId: string
  agentName: string
  draft: HuixunNoticeInput
  timeoutMs?: number
}): Promise<ConfirmDecision> {
  const { onEvent, agentId, agentName, draft } = options
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000
  const { id, promise } = registerLeaderConfirm(draft)
  const oral = buildConfirmOral(draft)
  const preview = buildDispatchPreview(draft)

  onEvent({
    type: 'await_confirm',
    agentId,
    agentName,
    confirmId: id,
    title: draft.title,
    meetingTime: draft.meetingTime,
    location: draft.location,
    agendaTitle: draft.agendaTitle,
    briefingTitle: draft.briefingTitle,
    recipients: draft.recipients,
    message: preview,
    text: oral,
    summary: '已拟好会议通知与议程，等候领导人确认后发出',
  })

  const heartbeat = setInterval(() => {
    onEvent({
      type: 'heartbeat',
      agentId,
      agentName,
      confirmId: id,
      summary: '仍在等候领导人确认发出',
    })
  }, 12000)

  const timer = setTimeout(() => {
    resolveLeaderConfirm(id, { approved: false, reason: 'timeout' })
  }, timeoutMs)

  try {
    const decision = await promise
    onEvent({
      type: 'confirm_resolved',
      agentId,
      agentName,
      confirmId: id,
      ok: decision.approved,
      summary: decision.approved
        ? '领导人已确认，准备发出汇讯'
        : decision.reason === 'timeout'
          ? '等候超时，通知未发出'
          : '领导人未确认，通知未发出',
    })
    return decision
  } finally {
    clearInterval(heartbeat)
    clearTimeout(timer)
    pending.delete(id)
  }
}
