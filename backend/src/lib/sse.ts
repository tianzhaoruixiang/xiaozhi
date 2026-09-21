export type SseEventType =
  | 'plan_start'
  | 'plan_item'
  | 'plan_done'
  | 'agent_spawn'
  | 'agent_start'
  | 'agent_progress'
  | 'agent_done'
  | 'tool_start'
  | 'tool_done'
  | 'assistant_delta'
  | 'oral_report'
  | 'final'
  | 'error'

export interface SsePayload {
  type: SseEventType
  agentId?: string
  agentName?: string
  agentRole?: string
  summary?: string
  text?: string
  message?: string
  /** 规划总目标 */
  goal?: string
  /** 规划步骤序号（从 1 开始） */
  index?: number
  /** 规划步骤标题 */
  title?: string
  /** 规划步骤目标说明 */
  objective?: string
  /** 规划步骤总数 */
  total?: number
  /** 依赖的专家 id（并行 DAG） */
  dependsOn?: string[]
  /** 工具名 */
  toolName?: string
  /** 工具展示名 */
  toolLabel?: string
  /** 工具是否成功 */
  ok?: boolean
  /** 通知收件人 */
  recipients?: string[]
}

export function createSseStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
    cancel() {
      controller = null
    },
  })

  const send = (payload: SsePayload) => {
    if (!controller) return
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
  }

  const close = () => {
    try {
      controller?.close()
    } catch {
      // already closed
    }
    controller = null
  }

  return { stream, send, close }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
