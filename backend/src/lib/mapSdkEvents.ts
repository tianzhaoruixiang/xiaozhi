import type { SsePayload } from './sse.js'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null
}

function pickAgentId(message: UnknownRecord): string | undefined {
  const candidates = [
    message.agent_id,
    message.agentId,
    message.subagent_type,
    message.name,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c) return c
  }

  const toolInput = asRecord(message.input) ?? asRecord(message.tool_input)
  if (toolInput) {
    const nested = [toolInput.subagent_type, toolInput.agent, toolInput.name]
    for (const c of nested) {
      if (typeof c === 'string' && c) return c
    }
  }
  return undefined
}

function extractText(message: UnknownRecord): string {
  if (typeof message.result === 'string') return message.result
  if (typeof message.text === 'string') return message.text
  if (typeof message.summary === 'string') return message.summary
  if (typeof message.content === 'string') return message.content

  const content = message.content
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        const b = asRecord(block)
        if (!b) return ''
        if (typeof b.text === 'string') return b.text
        return ''
      })
      .filter(Boolean)
      .join('')
  }
  return ''
}

export type SdkEventMapper = ((message: unknown) => void) & {
  finishPlan: () => void
}

export function createSdkEventMapper(
  emit: (payload: SsePayload) => void,
  state: { finalText: string },
  meta?: {
    displayNames?: Record<string, string>
    roles?: Record<string, string>
  },
): SdkEventMapper {
  const invoked = new Map<string, { index: number; title: string }>()
  let planClosed = false
  const displayNames = meta?.displayNames ?? {}
  const roles = meta?.roles ?? {}

  const labelOf = (id: string) => displayNames[id] ?? id
  const roleOf = (id: string) => roles[id] ?? '专业专家'

  const noteExpertInvoke = (rawId: string, description?: string) => {
    const id = rawId.trim()
    if (!id || invoked.has(id)) return
    const index = invoked.size + 1
    const title =
      (description && description.slice(0, 48)) || roleOf(id) || `调用 ${id}`

    invoked.set(id, { index, title })

    emit({
      type: 'plan_item',
      index,
      total: Math.max(index, invoked.size),
      agentId: id,
      agentName: labelOf(id),
      agentRole: roleOf(id),
      title,
      objective: description ?? title,
      goal: '智枢动态调度专家',
    })

    emit({
      type: 'agent_spawn',
      agentId: id,
      agentName: labelOf(id),
      agentRole: roleOf(id),
      title,
      objective: description,
      summary: `动态登场：${labelOf(id)}`,
    })

    emit({
      type: 'agent_start',
      agentId: id,
      agentName: labelOf(id),
      agentRole: roleOf(id),
      title,
      summary: '开始执行…',
    })
  }

  const mapper = (message: unknown): void => {
    const msg = asRecord(message)
    if (!msg) return

    const type = String(msg.type ?? msg.event ?? '')
    const agentId = pickAgentId(msg)
    const agentName = agentId ? labelOf(agentId) : undefined

    if (type.includes('task_progress') || type === 'progress') {
      if (agentId) {
        emit({
          type: 'agent_progress',
          agentId,
          agentName,
          summary: extractText(msg) || '推进中…',
        })
      }
      return
    }

    if (
      type === 'tool_use' ||
      type.includes('tool_use') ||
      (type === 'assistant' && Array.isArray(msg.content))
    ) {
      const content = Array.isArray(msg.content) ? msg.content : [msg]
      for (const block of content) {
        const b = asRecord(block)
        if (!b) continue
        const blockType = String(b.type ?? '')
        const name = String(b.name ?? '')
        if (blockType === 'tool_use' && (name === 'Agent' || name === 'Task')) {
          const input = asRecord(b.input)
          const raw =
            (typeof input?.subagent_type === 'string' && input.subagent_type) ||
            agentId ||
            ''
          const desc =
            typeof input?.description === 'string' ? input.description : undefined
          if (raw) noteExpertInvoke(raw, desc)
        }
        if (blockType === 'text' && typeof b.text === 'string' && b.text) {
          if (msg.parent_tool_use_id || msg.parentToolUseId) {
            const parentAgent = agentId ?? 'agent'
            emit({
              type: 'agent_progress',
              agentId: parentAgent,
              agentName: labelOf(parentAgent),
              summary: b.text.slice(0, 180),
            })
          } else {
            state.finalText += b.text
            emit({ type: 'assistant_delta', text: b.text })
          }
        }
      }
      return
    }

    if (type === 'assistant' || type === 'message') {
      const text = extractText(msg)
      if (!text) return
      if (msg.parent_tool_use_id || msg.parentToolUseId) {
        const id = agentId ?? 'agent'
        emit({
          type: 'agent_progress',
          agentId: id,
          agentName: labelOf(id),
          summary: text.slice(0, 180),
        })
      } else {
        state.finalText += text
        emit({ type: 'assistant_delta', text })
      }
      return
    }

    if (type === 'result' || 'result' in msg) {
      const text = extractText(msg)
      if (text) {
        state.finalText = text
        emit({ type: 'final', text })
      }
      if (agentId) {
        emit({
          type: 'agent_done',
          agentId,
          agentName,
          summary: text.slice(0, 180) || '已完成',
        })
      }
    }
  }

  const finishPlan = () => {
    if (planClosed) return
    planClosed = true
    emit({
      type: 'plan_done',
      goal: '智枢动态调度专家',
      total: invoked.size,
      message:
        invoked.size > 0
          ? `本轮实际调用 ${invoked.size} 位专家：${[...invoked.keys()].join(' → ')}`
          : '本轮未触发子专家（智枢直接答复）',
    })
  }

  return Object.assign(mapper, { finishPlan })
}

/** @deprecated */
export function mapSdkMessage(
  message: unknown,
  emit: (payload: SsePayload) => void,
  state: { finalText: string },
): void {
  createSdkEventMapper(emit, state)(message)
}
