import { computed, ref } from 'vue'
import type {
  AssistantState,
  ChatMessage,
  CollabStep,
  SsePayload,
  TaskPlan,
} from '../types/assistant'
import type { PlanItem } from '../data/mockPlans'
import { classifyConfirmUtterance } from '../utils/confirmUtterance'
import { arabicToSpoken } from '../utils/spokenChinese'

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyPlan(): TaskPlan {
  return {
    phase: 'idle',
    goal: '',
    statusText: '',
    items: [],
    total: 0,
  }
}

/** 默认开场白（领导台的语音唤醒引导） */
export const DEFAULT_WELCOME =
  '您好，我是智枢，您的领导助手。请说「你好，智枢」唤醒我，再说出您的指示。问今日安排可直接聊；要准备会议、预定或通知时，我会调度专家协同办理。'

export function useAssistantChat(options?: { welcome?: boolean }) {
  const open = ref(false)
  const state = ref<AssistantState>('idle')
  /** welcome 传 false 时不带默认开场白（如任务执行页直接进入执行） */
  const messages = ref<ChatMessage[]>(
    options?.welcome === false
      ? []
      : [
          {
            id: 'welcome',
            role: 'system',
            content: DEFAULT_WELCOME,
          },
        ],
  )
  const streaming = ref(false)
  const error = ref<string | null>(null)

  const pendingConfirm = computed(() => {
    for (let i = messages.value.length - 1; i >= 0; i -= 1) {
      const msg = messages.value[i]
      if (msg.dispatchConfirm?.status === 'pending') {
        return { messageId: msg.id, confirm: msg.dispatchConfirm }
      }
    }
    return null
  })

  const confirmDispatch = async (approved: boolean, utterance?: string) => {
    const pending = pendingConfirm.value
    if (!pending) return
    pending.confirm.status = approved ? 'approved' : 'rejected'
    error.value = null
    try {
      const response = await fetch('/api/chat/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmId: pending.confirm.id,
          approved,
          utterance,
        }),
      })
      if (!response.ok) {
        pending.confirm.status = 'pending'
        const detail = await response.text()
        throw new Error(detail || `确认失败（${response.status}）`)
      }
    } catch (err) {
      pending.confirm.status = 'pending'
      error.value = err instanceof Error ? err.message : '无法提交确认'
    }
  }

  const setOpen = (value: boolean) => {
    open.value = value
  }

  const toggle = () => {
    open.value = !open.value
  }

  const ensurePlan = (msg: ChatMessage): TaskPlan => {
    if (!msg.taskPlan) msg.taskPlan = emptyPlan()
    return msg.taskPlan
  }

  const ensureStep = (steps: CollabStep[], agentId: string, extra?: Partial<CollabStep>): CollabStep => {
    let step = steps.find((s) => s.id === agentId)
    if (!step) {
      step = {
        id: agentId,
        name: extra?.name ?? (agentId === 'xiaozhi' ? '智枢' : agentId),
        role: extra?.role ?? (agentId === 'xiaozhi' ? '领导助手 · 编排监督与口述汇报' : '专业专家'),
        status: 'queued',
        title: extra?.title,
        objective: extra?.objective,
        justSpawned: true,
      }
      steps.push(step)
      window.setTimeout(() => {
        if (step) step.justSpawned = false
      }, 900)
    } else {
      if (extra?.name) step.name = extra.name
      if (extra?.role) step.role = extra.role
      if (extra?.title) step.title = extra.title
      if (extra?.objective) step.objective = extra.objective
    }
    return step
  }

  const send = async (
    text: string,
    plans: PlanItem[],
    orchestration?: { team?: string; workflow?: string; mode?: string },
    options?: { enableOralReport?: boolean },
  ) => {
    const content = text.trim()
    if (!content) return

    if (pendingConfirm.value) {
      messages.value.push({
        id: uid('user'),
        role: 'user',
        content,
      })
      const kind = classifyConfirmUtterance(content)
      if (kind === 'unknown') {
        error.value = '请口头说「确认发出」或「先不发」，也可点击页面上的确认按钮。'
        return
      }
      await confirmDispatch(kind === 'approve', content)
      return
    }

    if (streaming.value) return
    const enableOral = options?.enableOralReport !== false

    open.value = true
    error.value = null
    streaming.value = true
    state.value = 'thinking'

    messages.value.push({
      id: uid('user'),
      role: 'user',
      content,
    })

    const assistantId = uid('assistant')
    const steps: CollabStep[] = []
    messages.value.push({
      id: assistantId,
      role: 'assistant',
      content: '',
      steps,
      taskPlan: emptyPlan(),
    })

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          plans,
          team: orchestration?.team,
          workflow: orchestration?.workflow,
          mode: orchestration?.mode,
          enableOralReport: enableOral,
        }),
      })

      if (!response.ok || !response.body) {
        const detail = await response.text()
        throw new Error(detail || `请求失败（${response.status}）`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const applyEvent = (payload: SsePayload) => {
        const msg = messages.value.find((m) => m.id === assistantId)
        if (!msg) return
        const plan = ensurePlan(msg)

        switch (payload.type) {
          case 'plan_start': {
            plan.phase = 'planning'
            plan.statusText = payload.message ?? '正在生成多智能体协同任务规划…'
            plan.items = []
            plan.goal = ''
            break
          }
          case 'plan_done': {
            plan.phase = 'ready'
            if (payload.goal) plan.goal = payload.goal
            if (payload.total) plan.total = payload.total
            plan.statusText =
              payload.message ?? '任务规划已生成，正在揭示执行步骤…'
            break
          }
          case 'plan_item': {
            plan.phase = 'ready'
            if (payload.total) plan.total = payload.total
            const index = payload.index ?? plan.items.length + 1
            const exists = plan.items.find(
              (i) => i.agentId === payload.agentId || i.index === index,
            )
            if (!exists) {
              plan.items.push({
                index,
                agentId: payload.agentId ?? `task-${index}`,
                agentName: payload.agentName ?? '智能体',
                agentRole: payload.agentRole ?? '',
                title: payload.title ?? `步骤 ${index}`,
                objective: payload.objective ?? '',
                revealed: true,
                dependsOn: payload.dependsOn ?? [],
              })
            } else if (payload.dependsOn) {
              exists.dependsOn = payload.dependsOn
            }
            const parallelHint = plan.items.some(
              (a) =>
                (a.dependsOn?.length ?? 0) === 0 ||
                plan.items.some(
                  (b) =>
                    a.agentId !== b.agentId &&
                    JSON.stringify([...(a.dependsOn ?? [])].sort()) ===
                      JSON.stringify([...(b.dependsOn ?? [])].sort()),
                ),
            )
            plan.statusText = parallelHint
              ? `已规划 ${plan.items.length}/${plan.total || plan.items.length} 项（含并行）`
              : `已规划 ${plan.items.length}/${plan.total || plan.items.length} 项任务`
            break
          }
          case 'agent_spawn': {
            plan.phase = 'executing'
            plan.statusText = `${payload.agentName ?? '智能体'} 登场`
            if (!payload.agentId) break
            ensureStep(msg.steps ?? steps, payload.agentId, {
              name: payload.agentName,
              role: payload.agentRole,
              title: payload.title,
              objective: payload.objective,
            })
            break
          }
          case 'agent_start': {
            plan.phase = 'executing'
            if (!payload.agentId) break
            const step = ensureStep(msg.steps ?? steps, payload.agentId, {
              name: payload.agentName,
              role: payload.agentRole,
              title: payload.title,
              objective: payload.objective,
            })
            step.status = 'running'
            if (payload.summary) {
              if (!step.logs) step.logs = []
              step.logs.push(payload.summary)
            }
            break
          }
          case 'agent_progress': {
            if (!payload.agentId) break
            const step = ensureStep(msg.steps ?? steps, payload.agentId)
            step.status = 'running'
            if (payload.summary) {
              if (!step.logs) step.logs = []
              const last = step.logs[step.logs.length - 1]
              if (last !== payload.summary) step.logs.push(payload.summary)
            }
            break
          }
          case 'agent_done': {
            if (!payload.agentId) break
            const step = ensureStep(msg.steps ?? steps, payload.agentId)
            step.status = 'done'
            if (payload.summary) {
              step.summary = payload.summary
              if (!step.logs) step.logs = []
              if (step.logs[step.logs.length - 1] !== '任务完成') {
                step.logs.push('任务完成')
              }
            }
            break
          }
          case 'tool_start': {
            if (!payload.agentId) break
            const step = ensureStep(msg.steps ?? steps, payload.agentId, {
              name: payload.agentName,
            })
            step.status = 'running'
            if (!step.tools) step.tools = []
            if (!step.logs) step.logs = []
            const toolLabel = payload.toolLabel ?? payload.toolName ?? '工具调用'
            step.logs.push(`开始调用：${toolLabel}${payload.summary ? ` · ${payload.summary}` : ''}`)
            step.tools.push({
              id: uid('tool'),
              toolName: payload.toolName ?? 'tool',
              toolLabel,
              status: 'running',
              summary: payload.summary ?? '工具执行中…',
              recipients: payload.recipients,
            })
            break
          }
          case 'tool_done': {
            if (!payload.agentId) break
            const step = ensureStep(msg.steps ?? steps, payload.agentId)
            if (!step.tools) step.tools = []
            if (!step.logs) step.logs = []
            const last =
              [...step.tools]
                .reverse()
                .find(
                  (t) =>
                    t.status === 'running' &&
                    (!payload.toolName || t.toolName === payload.toolName),
                ) ?? null
            if (last) {
              last.status = payload.ok === false ? 'error' : 'done'
              last.summary = payload.summary ?? last.summary
              if (payload.recipients) last.recipients = payload.recipients
              step.logs.push(
                `${last.status === 'error' ? '调用失败' : '调用完成'}：${last.toolLabel}${payload.summary ? ` · ${payload.summary}` : ''}`,
              )
            } else {
              const toolLabel = payload.toolLabel ?? payload.toolName ?? '工具调用'
              step.tools.push({
                id: uid('tool'),
                toolName: payload.toolName ?? 'tool',
                toolLabel,
                status: payload.ok === false ? 'error' : 'done',
                summary: payload.summary ?? '工具已完成',
                recipients: payload.recipients,
              })
              step.logs.push(
                `${payload.ok === false ? '调用失败' : '调用完成'}：${toolLabel}${payload.summary ? ` · ${payload.summary}` : ''}`,
              )
            }
            break
          }
          case 'assistant_delta': {
            state.value = 'speaking'
            msg.content += payload.text ?? ''
            break
          }
          case 'await_confirm': {
            plan.phase = 'awaiting_confirm'
            plan.statusText = payload.summary ?? '等候您确认后发出通知'
            if (payload.agentId) {
              const step = ensureStep(msg.steps ?? steps, payload.agentId, {
                name: payload.agentName,
              })
              step.status = 'awaiting'
              if (payload.summary) {
                if (!step.logs) step.logs = []
                step.logs.push(payload.summary)
              }
            }
            if (payload.confirmId) {
              msg.dispatchConfirm = {
                id: payload.confirmId,
                status: 'pending',
                title: payload.title ?? '会议通知',
                preview: payload.message,
                meetingTime: payload.meetingTime,
                location: payload.location,
                agendaTitle: payload.agendaTitle,
                briefingTitle: payload.briefingTitle,
                recipients: payload.recipients,
                oral: payload.text ? arabicToSpoken(payload.text) : undefined,
              }
            }
            break
          }
          case 'confirm_resolved': {
            if (msg.dispatchConfirm && payload.confirmId === msg.dispatchConfirm.id) {
              msg.dispatchConfirm.status = payload.ok ? 'approved' : 'rejected'
            }
            plan.phase = payload.ok ? 'executing' : 'executing'
            plan.statusText = payload.summary ?? plan.statusText
            if (payload.agentId) {
              const step = ensureStep(msg.steps ?? steps, payload.agentId)
              step.status = payload.ok ? 'running' : 'done'
              if (payload.summary) {
                if (!step.logs) step.logs = []
                step.logs.push(payload.summary)
                if (!payload.ok) step.summary = payload.summary
              }
            }
            break
          }
          case 'heartbeat':
            break
          case 'oral_report': {
            if (!enableOral) break
            state.value = 'speaking'
            plan.phase = 'done'
            plan.statusText = '智枢正在向领导语音汇报'
            if (payload.text) msg.oralReport = arabicToSpoken(payload.text)
            break
          }
          case 'final': {
            state.value = 'speaking'
            plan.phase = 'done'
            plan.statusText = enableOral && plan.statusText.includes('语音')
              ? plan.statusText
              : enableOral
                ? '多智能体协同完成，准备语音汇报'
                : '多智能体协同完成'
            if (payload.text) {
              msg.content = enableOral
                ? payload.text
                : payload.text
                    .replace(/\n*【口述汇报】[\s\S]*$/g, '')
                    .replace(/\n*##\s*口述汇报[\s\S]*$/gi, '')
                    .trim()
            }
            // 若后端未单独下发 oral_report，尝试从正文提取（仅领导台）
            if (enableOral && !msg.oralReport && payload.text) {
              const section = payload.text.match(/【口述汇报】\s*([\s\S]*)$/)?.[1]
              if (section) {
                msg.oralReport = arabicToSpoken(
                  section.replace(/[#*`]/g, '').replace(/\n+/g, ' ').trim(),
                )
              }
            }
            break
          }
          case 'error': {
            error.value = payload.message ?? '协作过程出现错误'
            break
          }
          default:
            break
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          const line = chunk.split('\n').find((l) => l.startsWith('data:'))
          if (!line) continue
          const json = line.slice(5).trim()
          if (!json) continue
          try {
            applyEvent(JSON.parse(json) as SsePayload)
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : '无法连接智能助手服务'
      const msg = messages.value.find((m) => m.id === assistantId)
      if (msg && !msg.content) {
        msg.content = '抱歉，当前无法完成多智能体协作，请检查后端与 API Key。'
      }
    } finally {
      streaming.value = false
      const latest = messages.value.find((m) => m.id === assistantId)
      // 若有口述汇报，留给 TTS 流程切换 speaking → idle
      if (!latest?.oralReport) {
        state.value = 'idle'
      }
    }
  }

  return {
    open,
    state,
    messages,
    streaming,
    error,
    pendingConfirm,
    setOpen,
    toggle,
    send,
    confirmDispatch,
  }
}
