import { query } from '@anthropic-ai/claude-agent-sdk'
import { chatCompletion } from './openaiCompatible.js'
import { getLlmProvider } from './llmConfig.js'
import type { PlanItem } from '../agents/prompts.js'
import { formatPlansContext, XIAOZHI_SYSTEM, CHAIRMAN_LEADER_REPLY } from '../agents/prompts.js'
import { createSdkEventMapper } from './mapSdkEvents.js'
import type { SsePayload } from './sse.js'
import { sleep } from './sse.js'
import { classifyIntent } from './intentRouter.js'
import { arabicToSpoken } from './spokenChinese.js'
import { cleanOralText } from './oralReport.js'

function nowText(): string {
  const raw = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return arabicToSpoken(raw)
}

function buildDirectSystem(
  kind: 'direct' | 'schedule_query',
  briefReply?: boolean,
): string {
  const brief = briefReply !== false ? `\n\n${CHAIRMAN_LEADER_REPLY}` : ''
  if (kind === 'schedule_query') {
    return `${XIAOZHI_SYSTEM}

当前是「今日安排问询」：根据【今日工作安排】回答领导，口语、可朗读。
不要预定会议室、不要发通知。不要编造计划外事项。${brief}`
  }

  return `${XIAOZHI_SYSTEM}

当前是「普通问题」模式：你必须针对领导本轮具体问题作答，禁止答非所问。
硬性要求：
1. 问几点/日期/现在时间 → 只依据【当前系统时间】回答，不要汇报今日工作安排
2. 问别的常识/确认/闲聊 → 直接答该问题
3. 仅当领导明确问今日安排/重点事项时，才引用【今日工作安排】
4. 不要调度会议室、通知、日程写入等专项动作
5. 口吻恭敬、口语、便于朗读；不要 Markdown 标题与代码块
6. 若需读出时间，必须用汉字（「凌晨一点五十七分」），禁止阿拉伯数字${brief}`
}

/**
 * 普通问题 / 日程问询：智枢直接执行（优先 Claude Code，否则 OpenAI 兼容）。
 * 不再写死「汇报今日重点」。
 */
export async function runXiaozhiDirect(options: {
  message: string
  plans?: PlanItem[]
  enableOralReport?: boolean
  briefReply?: boolean
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  const intent = classifyIntent(options.message)
  const kind = intent === 'schedule_query' ? 'schedule_query' : 'direct'
  const onEvent = options.onEvent
  const plansText = formatPlansContext(options.plans)
  const clock = nowText()
  const contextBlock = `【当前系统时间】\n${clock}\n\n【今日工作安排】\n${plansText}\n\n【领导问题】\n${options.message}`

  onEvent({
    type: 'plan_start',
    message:
      kind === 'schedule_query'
        ? '智枢正在整理今日安排…'
        : '智枢正在调度执行您的问题…',
  })
  await sleep(100)

  onEvent({
    type: 'agent_progress',
    agentId: 'xiaozhi',
    agentName: '智枢',
    summary:
      kind === 'schedule_query'
        ? '日程问询 · 智枢直接答复'
        : getLlmProvider() === 'claude'
          ? '普通问题 · 经 Claude Code 执行'
          : '普通问题 · 智枢直接执行',
  })

  onEvent({
    type: 'plan_done',
    goal:
      kind === 'schedule_query'
        ? '答复今日工作安排'
        : `直接回答：${options.message.slice(0, 40)}`,
    total: 1,
    message: '本轮由智枢执行，不拉起会议专家团',
  })
  onEvent({
    type: 'plan_item',
    index: 1,
    total: 1,
    agentId: 'xiaozhi',
    agentName: '智枢',
    agentRole: '领导助手',
    title: kind === 'schedule_query' ? '答复今日安排' : '直接作答',
    objective: options.message,
    dependsOn: [],
  })
  await sleep(120)

  onEvent({
    type: 'agent_spawn',
    agentId: 'xiaozhi',
    agentName: '智枢',
    agentRole: '领导助手',
    title: kind === 'schedule_query' ? '答复今日安排' : '直接作答',
    objective: options.message,
    summary: '登场：智枢',
  })
  onEvent({
    type: 'agent_start',
    agentId: 'xiaozhi',
    agentName: '智枢',
    agentRole: '领导助手',
    title: kind === 'schedule_query' ? '答复今日安排' : '直接作答',
    summary: '执行中…',
  })

  let answer: string
  const canClaude =
    getLlmProvider() === 'claude' &&
    Boolean(process.env.ANTHROPIC_API_KEY) &&
    !String(process.env.ANTHROPIC_API_KEY).includes('your-key')

  try {
    if (canClaude) {
      answer = await runViaClaudeCode({
        contextBlock,
        kind,
        briefReply: options.briefReply,
        onEvent,
      })
    } else {
      answer = await chatCompletion({
        messages: [
          { role: 'system', content: buildDirectSystem(kind, options.briefReply) },
          {
            role: 'user',
            content: `${contextBlock}\n\n请只回答领导本轮问题，不要跑题。${
              options.briefReply !== false ? '一两句说完。' : ''
            }`,
          },
        ],
        temperature: 0.3,
        onDelta: (text) => onEvent({ type: 'assistant_delta', text }),
      })
    }
  } catch (err) {
    onEvent({
      type: 'agent_progress',
      agentId: 'xiaozhi',
      agentName: '智枢',
      summary: `执行受阻，改用本地兜底：${err instanceof Error ? err.message : '未知错误'}`,
    })
    answer = buildDirectFallback(options.message, kind, clock, options.plans)
  }

  answer = answer.replace(/[#*`]/g, '').replace(/\n{3,}/g, '\n\n').trim()
  if (!answer) {
    answer = buildDirectFallback(options.message, kind, clock, options.plans)
  }

  onEvent({
    type: 'agent_done',
    agentId: 'xiaozhi',
    agentName: '智枢',
    summary: answer,
  })
  if (options.enableOralReport !== false) {
    onEvent({
      type: 'oral_report',
      agentId: 'xiaozhi',
      agentName: '智枢',
      text: cleanOralText(answer.replace(/\n+/g, ' ').trim()),
      summary: '智枢开始向领导语音答复',
    })
  }
  onEvent({ type: 'final', text: answer })
  return answer
}

async function runViaClaudeCode(options: {
  contextBlock: string
  kind: 'direct' | 'schedule_query'
  briefReply?: boolean
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  const state = { finalText: '' }
  const mapMessage = createSdkEventMapper(options.onEvent, state, {
    displayNames: { xiaozhi: '智枢' },
    roles: { xiaozhi: '领导助手' },
  })

  const prompt = `${options.contextBlock}

请作为智枢直接回答领导问题。
- 不要调用子专家 Agent
- 若问当前时间，可用 Bash 执行 date 核对，但以【当前系统时间】为准作出口语答复
- 不要跑题去汇报无关的今日重点${
    options.briefReply !== false ? `\n- ${CHAIRMAN_LEADER_REPLY}` : ''
  }`

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: buildDirectSystem(options.kind, options.briefReply),
      allowedTools: ['Bash'],
      tools: ['Bash'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 6,
      cwd: process.env.AGENT_CWD || process.cwd(),
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
    },
  })) {
    mapMessage(message)
    const rec = message as Record<string, unknown>
    if (rec && typeof rec === 'object' && rec.type === 'result') {
      const resultText =
        typeof rec.result === 'string' ? rec.result : state.finalText
      if (resultText) state.finalText = resultText
    }
  }

  mapMessage.finishPlan()
  const text = state.finalText.trim()
  if (!text) throw new Error('Claude Code 未返回答复')
  return text
}

export function buildDirectFallback(
  message: string,
  kind: 'direct' | 'schedule_query',
  clock: string,
  plans?: PlanItem[],
): string {
  if (/几点|现在.*时间|什么时候了|当前时间/.test(message.replace(/\s+/g, ''))) {
    return `领导，现在是${clock}。`
  }

  if (kind === 'schedule_query') {
    const list = plans?.length
      ? plans
          .map(
            (p, i) =>
              `${i + 1}. ${p.time} ${p.title}（${statusLabel(p.status)}）`,
          )
          .join('；')
      : '今日安排清单暂未同步。'
    return `领导，今日要点如下：${list}。请您指示。`
  }

  return `领导，关于「${message}」，我这边已收到。请您再补充一点细节，我马上办理。`
}

function statusLabel(status: string): string {
  if (status === 'done') return '已完成'
  if (status === 'doing') return '进行中'
  return '待办'
}

/** @deprecated 兼容旧名 */
export const runGeneralChat = runXiaozhiDirect
export const buildGeneralChatFallback = (
  message: string,
  plans?: PlanItem[],
) => buildDirectFallback(message, 'direct', nowText(), plans)
