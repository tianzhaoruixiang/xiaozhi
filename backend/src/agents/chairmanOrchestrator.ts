import { query } from '@anthropic-ai/claude-agent-sdk'
import {
  XIAOZHI_SYSTEM,
  buildClaudeAgentsFromRoster,
  formatPlansContext,
  type DynamicPlan,
  type PlanItem,
} from './prompts.js'
import { createSdkEventMapper } from '../lib/mapSdkEvents.js'
import type { SsePayload } from '../lib/sse.js'
import { getLlmProvider } from '../lib/llmConfig.js'
import {
  planExpertsWithXiaozhi,
  runOpenAIOrchestrator,
} from './openaiOrchestrator.js'
import {
  createHuixunMcpServer,
  HUIXUN_TOOL_FQN,
} from '../tools/huixunMcp.js'
import {
  createKnowledgeMcpServer,
  SEARCH_TOOL_FQN,
  GET_TOOL_FQN,
  COMPILE_TOOL_FQN,
} from '../tools/knowledgeMcp.js'
import {
  createRoomsMcpServer,
  QUERY_ROOMS_TOOL_FQN,
  GET_ROOM_TOOL_FQN,
  BOOK_ROOM_TOOL_FQN,
} from '../tools/roomsMcp.js'
import {
  createScheduleMcpServer,
  QUERY_SCHEDULE_TOOL_FQN,
  FIND_SLOTS_TOOL_FQN,
  ARRANGE_SCHEDULE_TOOL_FQN,
} from '../tools/scheduleMcp.js'
import { pickPlanSource } from '../config/resolvePlan.js'
import { resolveOralReport, stripOralSection } from '../lib/oralReport.js'
import { runGeneralChat } from '../lib/generalChat.js'

export async function runChairmanOrchestrator(options: {
  message: string
  plans?: PlanItem[]
  team?: string
  workflow?: string
  mode?: string
  enableOralReport?: boolean
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  if (getLlmProvider() === 'openai') {
    return runOpenAIOrchestrator(options)
  }
  return runClaudeOrchestrator(options)
}

async function emitPlan(plan: DynamicPlan, onEvent: (payload: SsePayload) => void) {
  onEvent({
    type: 'plan_done',
    goal: plan.goal,
    total: plan.experts.length,
    message: `智枢已生成 ${plan.experts.length} 位专家（含并行分支）：${plan.experts.map((e) => e.name).join('、')}`,
  })
  for (let i = 0; i < plan.experts.length; i += 1) {
    const expert = plan.experts[i]
    onEvent({
      type: 'plan_item',
      index: i + 1,
      total: plan.experts.length,
      agentId: expert.id,
      agentName: expert.name,
      agentRole: expert.role,
      title: expert.title,
      objective: expert.objective,
      dependsOn: expert.dependsOn,
    })
  }
}

async function runClaudeOrchestrator(options: {
  message: string
  plans?: PlanItem[]
  team?: string
  workflow?: string
  mode?: string
  enableOralReport?: boolean
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('缺少 ANTHROPIC_API_KEY，请在 .env 中配置后重启服务')
  }

  const plansText = formatPlansContext(options.plans)
  const contextBlock = `【今日工作安排】\n${plansText}\n\n【领导指示】\n${options.message}`

  options.onEvent({
    type: 'plan_start',
    message: '智枢正在识别意图并选择协作方式…',
  })

  const picked = pickPlanSource({
    message: options.message,
    team: options.team,
    workflow: options.workflow,
    mode: options.mode,
  })

  options.onEvent({
    type: 'agent_progress',
    agentId: 'xiaozhi',
    agentName: '智枢',
    summary: picked.routeLabel
      ? `意图：${picked.intentText} · ${picked.routeLabel}`
      : `意图：${picked.intentText}`,
  })

  if (picked.reason === 'xiaozhi-direct' || picked.reason === 'general-chat') {
    return runGeneralChat({
      message: options.message,
      plans: options.plans,
      enableOralReport: options.enableOralReport,
      onEvent: options.onEvent,
    })
  }

  let plan: DynamicPlan
  if (picked.plan?.experts.length) {
    plan = picked.plan
    options.onEvent({
      type: 'agent_progress',
      agentId: 'xiaozhi',
      agentName: '智枢',
      summary: `使用配置工作流（${picked.reason}）`,
    })
  } else if (picked.mode === 'config') {
    throw new Error(
      '编排模式为 config，但未找到可用的专家团/工作流，请检查 .claude/teams 与 .claude/workflows',
    )
  } else {
    try {
      plan = await planExpertsWithXiaozhi(contextBlock, options.message)
    } catch {
      const { fallbackDynamicPlan } = await import('./experts.js')
      plan = fallbackDynamicPlan(options.message)
    }
    if (!plan.experts.length) {
      return runGeneralChat({
        message: options.message,
        plans: options.plans,
        enableOralReport: options.enableOralReport,
        onEvent: options.onEvent,
      })
    }
  }

  await emitPlan(plan, options.onEvent)

  const rosterText = plan.experts
    .map(
      (e, i) =>
        `${i + 1}. ${e.id}（${e.name}）能力:[${e.capabilities.join(',') || '无'}] 依赖:[${e.dependsOn.join(',') || '无'}]\n   目标：${e.objective}`,
    )
    .join('\n')

  const enableOral = options.enableOralReport !== false
  const prompt = `${contextBlock}

【智枢本轮调度的专家】
${rosterText}

总目标：${plan.goal}

请通过 Agent 工具按需调用上表专家（subagent_type 必须与 id 完全一致），完成协同。
要求：
- 只调用列表中的专家；可跳过已不需要的
- 无相互依赖、或 dependsOn 已满足的专家应并行调用（同一轮可同时发起多个 Agent）
- 有 dependsOn 的须等前置专家完成后再调用
- 挂 knowledge 的专家须使用知识库工具并输出《xxx会议资料》；挂 rooms 的须查询并预定会议室并输出《xxx会议议程》；挂 schedule 的须查询并安排厅长日程；挂 huixun 的须使用汇讯工具，发出前须等领导人确认，再把议程与会议资料发给全体参会人（含领导人）
${
  enableOral
    ? `- 全部完成后，由你（智枢）输出书面纪要，并包含【口述汇报】段落
- 【口述汇报】必须依据本轮真实结论现写，禁止套固定「人员调度会时间/地点/参会人」模板，禁止编造未出现的信息`
    : `- 全部完成后，由你（智枢）输出书面纪要（Markdown）
- 不要撰写「【口述汇报】」或任何口述/语音稿段落`
}`

  const knowledgeServer = createKnowledgeMcpServer({
    onEmit: options.onEvent,
    agentId: 'dynamic-knowledge',
  })
  const roomsServer = createRoomsMcpServer({
    onEmit: options.onEvent,
    agentId: 'dynamic-rooms',
  })
  const scheduleServer = createScheduleMcpServer({
    onEmit: options.onEvent,
    agentId: 'dynamic-schedule',
  })
  const huixunServer = createHuixunMcpServer({
    onEmit: options.onEvent,
    agentId: 'dynamic-huixun',
  })

  const state = { finalText: '' }
  const knownNames = Object.fromEntries(plan.experts.map((e) => [e.id, e.name]))
  const knownRoles = Object.fromEntries(plan.experts.map((e) => [e.id, e.role]))
  const mapMessage = createSdkEventMapper(options.onEvent, state, {
    displayNames: knownNames,
    roles: knownRoles,
  })

  try {
    for await (const message of query({
      prompt,
      options: {
        systemPrompt: XIAOZHI_SYSTEM,
        allowedTools: [
          'Agent',
          'Task',
          HUIXUN_TOOL_FQN,
          SEARCH_TOOL_FQN,
          GET_TOOL_FQN,
          COMPILE_TOOL_FQN,
          QUERY_ROOMS_TOOL_FQN,
          GET_ROOM_TOOL_FQN,
          BOOK_ROOM_TOOL_FQN,
          QUERY_SCHEDULE_TOOL_FQN,
          FIND_SLOTS_TOOL_FQN,
          ARRANGE_SCHEDULE_TOOL_FQN,
        ],
        tools: ['Agent', 'Task'],
        mcpServers: {
          knowledge: knowledgeServer,
          rooms: roomsServer,
          schedule: scheduleServer,
          huixun: huixunServer,
        },
        agents: buildClaudeAgentsFromRoster(plan.experts),
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 28,
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
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Claude Agent SDK 调用失败'
    options.onEvent({ type: 'error', message })
    throw err
  }

  mapMessage.finishPlan()

  const finalText = enableOral
    ? state.finalText
    : stripOralSection(state.finalText)

  if (finalText) {
    options.onEvent({ type: 'final', text: finalText })
  }

  if (!enableOral) {
    return finalText
  }

  const { oral, source } = await resolveOralReport({
    userMessage: options.message,
    briefText: state.finalText,
    contextBlock,
  })
  options.onEvent({
    type: 'agent_progress',
    agentId: 'xiaozhi',
    agentName: '智枢',
    summary:
      source === 'section'
        ? '已从汇报正文提取口述稿'
        : source === 'llm'
          ? '已由智枢生成口述汇报'
          : '模型暂不可用，已据本轮结论压缩口述稿',
  })
  options.onEvent({
    type: 'oral_report',
    agentId: 'xiaozhi',
    agentName: '智枢',
    text: oral,
    summary: '智枢开始向领导语音汇报',
  })

  return finalText
}
