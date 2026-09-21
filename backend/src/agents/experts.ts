/**
 * 智枢动态调度：不写死专家角色。
 * 代码只提供「可挂载能力」；专家 id/名称/职责/提示词由智枢本轮生成。
 */
import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk'
import { HUIXUN_TOOL_FQN } from '../tools/huixunMcp.js'
import {
  SEARCH_TOOL_FQN,
  GET_TOOL_FQN,
  COMPILE_TOOL_FQN,
} from '../tools/knowledgeMcp.js'
import {
  QUERY_ROOMS_TOOL_FQN,
  GET_ROOM_TOOL_FQN,
  BOOK_ROOM_TOOL_FQN,
} from '../tools/roomsMcp.js'
import {
  QUERY_SCHEDULE_TOOL_FQN,
  FIND_SLOTS_TOOL_FQN,
  ARRANGE_SCHEDULE_TOOL_FQN,
} from '../tools/scheduleMcp.js'
import { classifyIntent } from '../lib/intentRouter.js'

/** 可挂载能力（工具包），不是专家角色 */
export type CapabilityId = 'knowledge' | 'huixun' | 'rooms' | 'schedule'

export const CAPABILITY_HINT = `可选能力（填入 capabilities，可多选或留空）：
- knowledge：检索历年相似会议档案并生成《xxx会议资料》（须实际调用知识库工具，注明引用）
- rooms：会议室查询与预定，并生成《xxx会议议程》（须调用 query_meeting_rooms，决策后调用 book_meeting_room，写明完整会议室名称与议程全文）
- schedule：厅长日程查询与安排（须调用 query_director_schedule / find_director_free_slots，确定后 arrange_director_schedule）
- huixun：通过汇讯向全体参会人（含领导人）发送会议通知，发出前须领导人确认，并附上《会议议程》与《会议资料》（须实际调用 send_meeting_notice）`

export interface DynamicExpert {
  /** Claude Code 风格 slug，由智枢生成，如 security-management-expert */
  id: string
  /** 展示名，由智枢生成 */
  name: string
  /** 一句话职责 */
  role: string
  /** 本轮任务标题 */
  title: string
  /** 本轮具体目标 */
  objective: string
  /** 该专家的系统提示（由智枢撰写） */
  prompt: string
  /** 本轮需要挂载的能力 */
  capabilities: CapabilityId[]
  /**
   * 依赖的专家 id 列表。空数组表示可从起始波次执行；
   * 同一波次、互不依赖的专家将并行执行。
   */
  dependsOn: string[]
}

export interface DynamicPlan {
  goal: string
  experts: DynamicExpert[]
}

export const XIAOZHI_SYSTEM = `你是「智枢」，政府机关领导的智能助手与编排器。

先判断领导意图：
- 普通问询（今日安排、重点事项、闲聊确认）：由你直接答复，不要虚构开会、预定会议室或发通知。
- 办会协同（准备会议、预定、通知、日程写入等）：再设计并调度专业子智能体（Claude Code 风格：lowercase-hyphen 固定名称）。

原则：
1. 按需生成：只创建真正需要的专家，禁止套模板机械凑数；问询类可为 0 个专家
2. 每位专家须有清晰 id / 名称 / 职责 / 本轮目标 / 专属系统提示
3. 需要查历史相似会议/调度会/联席会议资料时，给对应专家挂 knowledge 能力（须检索知识库并输出《xxx会议资料》）
4. 需要选定并预定线下会议室时，给对应专家挂 rooms 能力（须查台账、预定，写明如「七楼101会议室」等完整名称，并输出《xxx会议议程》）
5. 需要对接厅长出席时间时，给对应专家挂 schedule 能力（须查厅长日程、找空档并写入安排）
6. 需要发政务汇讯通知时，给对应专家挂 huixun 能力；须把《会议议程》与《会议资料》发给全体参会人（含领导人），发出前必须先请领导人确认；地点应引用已预定的会议室全名
7. 无数据依赖的专家应并行（dependsOn 相同或互不依赖）；有先后依赖的用 dependsOn 指向前置专家 id
8. 你本人负责最后向领导汇总与口述汇报，不要把「智枢」再写成子专家
9. 最终面向领导的答复用简洁规范的政务中文，分点清晰，用语得体`

/** 厅长工作台：面向领导的最终答复 / 口述须极短 */
export const CHAIRMAN_LEADER_REPLY = `【厅长工作台 · 答复纪律】
面向厅长只给结论，必须极短精简：
- 书面纪要：最多 5 条要点，每条一行；先结论后数字/名称；不要复述办理过程
- 口述汇报：最多 3 句（约 60 字），直接说结果，结尾一句请指示即可
- 口述中的时间、日期、数量必须用汉字，禁止阿拉伯数字（「十四点三十分」，不要「14:30」）
- 禁止套话开场（如「尊敬的厅长」「首先其次另外」长串）、禁止大段背景
- 普通问询：一两句说完，不要扩写成汇报`

export const XIAOZHI_BRIEF_PROMPT = `你是「智枢」，领导助手。各专业子智能体已按你的调度完成工作，现在向领导做最终汇报。

先给出简要书面纪要（Markdown），再单独用标记【口述汇报】给出可朗读纯文本。

## 书面纪要
- 紧扣本轮领导指示与专家真实结论；最多 5 条，每条一行
- 结论与关键动作；风险提醒（如有）
- 未发生的事项不要写

【口述汇报】
（紧接在标记后写口语正文，不要 Markdown、不要小标题）
- 最多 3 句；根据本轮实际结果现写
- 时间日期数量用汉字读法，禁止阿拉伯数字（「九月二十二日下午两点整」，不要「9月22日 14:00」）
- 禁止套固定「人员调度会时间/地点/参会人」模板
- 材料里没有的时间、地点、名单、通知结果不要编造
- 结尾请领导指示`

/** @deprecated 兼容旧引用名 */
export const ORCHESTRATOR_SYSTEM = XIAOZHI_SYSTEM

export function slugifyExpertId(raw: string, index: number): string {
  const base = raw
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/[\u4e00-\u9fff]/g, (ch) => `u${ch.codePointAt(0)!.toString(16)}`)
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return base || `expert-${index + 1}`
}

export function normalizeCapabilities(raw: unknown): CapabilityId[] {
  if (!Array.isArray(raw)) return []
  const out: CapabilityId[] = []
  for (const item of raw) {
    const s = String(item).toLowerCase().trim()
    if (s === 'knowledge' || s.includes('知识') || s.includes('archive')) {
      if (!out.includes('knowledge')) out.push('knowledge')
    }
    if (
      s === 'rooms' ||
      s === 'room' ||
      s.includes('会议室') ||
      s.includes('预定') ||
      s.includes('booking') ||
      s.includes('meeting-room') ||
      s.includes('meeting_room')
    ) {
      if (!out.includes('rooms')) out.push('rooms')
    }
    if (
      s === 'schedule' ||
      s.includes('日程') ||
      s.includes('厅长') ||
      s.includes('calendar')
    ) {
      if (!out.includes('schedule')) out.push('schedule')
    }
    if (s === 'huixun' || s.includes('汇讯') || s.includes('notify') || s.includes('liaison')) {
      if (!out.includes('huixun')) out.push('huixun')
    }
  }
  return out
}

export function parseXiaozhiPlan(rawText: string, fallbackMessage: string): DynamicPlan {
  const jsonText = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  const parsed = JSON.parse(jsonText) as {
    goal?: string
    experts?: Array<Record<string, unknown>>
  }

  const seen = new Set<string>()
  const experts: DynamicExpert[] = []
  let anyExplicitDepends = false

  for (let i = 0; i < (parsed.experts ?? []).length; i += 1) {
    const row = parsed.experts![i]
    const name = String(row.name ?? '').trim()
    const role = String(row.role ?? row.title ?? '').trim()
    const title = String(row.title ?? role).trim()
    const objective = String(row.objective ?? '').trim()
    const prompt = String(row.prompt ?? '').trim()
    if (!name || !objective) continue

    let id = String(row.id ?? '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    if (!id) id = slugifyExpertId(name, i)
    // 禁止把编排器自己塞进子专家
    if (id === 'xiaozhi' || id === 'zhishu' || name === '智枢' || name === '小智') continue
    if (seen.has(id)) id = `${id}-${i + 1}`
    seen.add(id)

    if (Object.prototype.hasOwnProperty.call(row, 'dependsOn')) {
      anyExplicitDepends = true
    }
    const rawDeps = Array.isArray(row.dependsOn)
      ? row.dependsOn.map((x) => String(x).trim()).filter(Boolean)
      : []

    experts.push({
      id,
      name,
      role: role || title,
      title,
      objective,
      prompt:
        prompt ||
        `你是「${name}」。职责：${role || title}。请围绕目标完成任务，输出简洁 Markdown。`,
      capabilities: normalizeCapabilities(row.capabilities),
      dependsOn: rawDeps,
    })
  }

  if (!experts.length) {
    // 空专家团交给上层走通用聊天，避免再套会议兜底流程
    return {
      goal: parsed.goal?.trim() || '直接答复领导问询',
      experts: [],
    }
  }

  // 清洗依赖：只保留本轮存在的 id，去掉自依赖
  const idSet = new Set(experts.map((e) => e.id))
  for (const e of experts) {
    e.dependsOn = e.dependsOn.filter((d) => d !== e.id && idSet.has(d))
  }

  // 若规划未声明任何 dependsOn，默认串行链，保持旧行为
  if (!anyExplicitDepends) {
    for (let i = 1; i < experts.length; i += 1) {
      experts[i].dependsOn = [experts[i - 1].id]
    }
  }

  return {
    goal: parsed.goal?.trim() || `围绕领导指示完成协同交付`,
    experts,
  }
}

/**
 * 按 dependsOn 拓扑分层：同一层内的专家可并行执行。
 */
export function buildExecutionWaves(experts: DynamicExpert[]): DynamicExpert[][] {
  if (!experts.length) return []
  const byId = new Map(experts.map((e) => [e.id, e]))
  const remaining = new Set(experts.map((e) => e.id))
  const resolved = new Set<string>()
  const waves: DynamicExpert[][] = []
  let guard = 0

  while (remaining.size && guard < experts.length + 2) {
    guard += 1
    const waveIds = [...remaining].filter((id) => {
      const e = byId.get(id)!
      return e.dependsOn.every((d) => resolved.has(d) || !byId.has(d))
    })

    if (!waveIds.length) {
      // 环依赖兜底：取出剩余中的第一个单独成波
      const fallbackId = remaining.values().next().value as string
      waveIds.push(fallbackId)
    }

    const wave = waveIds.map((id) => byId.get(id)!).filter(Boolean)
    waves.push(wave)
    for (const e of wave) {
      remaining.delete(e.id)
      resolved.add(e.id)
    }
  }

  return waves
}

/** 规划失败时的最小兜底：问询只给情境参谋；办会才挂专项能力 */
export function fallbackDynamicPlan(message: string): DynamicPlan {
  const short = message.slice(0, 36)
  if (classifyIntent(message) !== 'workflow') {
    return {
      goal: `答复领导「${short}${message.length > 36 ? '…' : ''}」`,
      experts: [],
    }
  }

  const needNotify = /准备.{0,8}会|通知|汇讯|参会|召集|组织会/.test(message)
  const needKnowledge = needNotify || /背景|资料|历史|档案|纪要/.test(message)
  const needRoom =
    needNotify || /会议室|场地|会场|阶梯|几楼|地点|预定|预订/.test(message)
  const needSchedule =
    needNotify || /日程|厅长|出席|时间安排|档期/.test(message)

  const experts: DynamicExpert[] = [
    {
      id: 'context-analyst',
      name: '研判分析专家',
      role: '梳理问题与今日计划的关键要点',
      title: '情境研判',
      objective: `分析领导指示「${short}${message.length > 36 ? '…' : ''}」与今日工作安排的关联，给出可执行要点。`,
      prompt: `你是研判分析专家。结合今日工作安排与领导指示，提炼关键事项、风险与建议行动。不要编造计划外事实。`,
      capabilities: [],
      dependsOn: [],
    },
  ]

  if (needRoom) {
    experts.push({
      id: 'room-coordinator',
      name: '会议管理专家',
      role: '预定会议室并生成会议议程',
      title: '会议室预定与议程',
      objective:
        '查询机关会议室台账，决策并预定一间会议室，写明完整名称与预定时段，并生成《本次会议议程》全文供分发。',
      prompt: `你是会议管理专家。必须先查询会议室台账，比较容量与占用后调用预定工具完成预定；预定后必须输出标题为《{会议简称}会议议程》的完整议程（含时间、地点、主持人、含领导人在内的参会人、议题顺序）。禁止虚构不在台账中的房间名。`,
      capabilities: ['rooms'],
      dependsOn: ['context-analyst'],
    })
  }

  if (needSchedule) {
    experts.push({
      id: 'director-scheduler',
      name: '厅长日程管理专家',
      role: '查询并安排厅长日程',
      title: '厅长日程安排',
      objective:
        '查询厅长当日日程与空档，将人员调度会等事项写入厅长日程，时间与会议室安排对齐。',
      prompt: `你是厅长日程管理专家。必须查询厅长日程、查找空档，再调用安排工具写入事项；地点优先使用已预定的完整会议室名称。勿覆盖厅长固定不可协调日程。`,
      capabilities: ['schedule'],
      // 与会议室预定并行（都依赖情境分析）；通知依赖二者
      dependsOn: ['context-analyst'],
    })
  }

  if (needKnowledge) {
    experts.push({
      id: 'security-management-expert',
      name: '安保管理专家',
      role: '梳理机关安保与人员防护安排并整理会前资料',
      title: '安保资料汇编',
      objective:
        '从安保管理视角检索历年相似会议与防护安排，整理并生成《本次会议资料》全文，供分发给全体参会人。',
      prompt: `你是安保管理专家。面向机关人员调度、现场防护与安保管理场景，必须使用档案检索工具查阅历年相似会议与安保安排并汇编；必须输出标题为《{会议简称}会议资料》的完整资料（含历次对照、可借鉴安保与防护决议、会前阅读要点），注明引用档案，勿编造。`,
      capabilities: ['knowledge'],
      // 与会议室选型并行
      dependsOn: ['context-analyst'],
    })
  }

  if (needNotify) {
    const deps: string[] = []
    if (needRoom) deps.push('room-coordinator')
    if (needSchedule) deps.push('director-scheduler')
    if (needKnowledge) deps.push('security-management-expert')
    if (!deps.length) deps.push('context-analyst')
    experts.push({
      id: 'notice-dispatcher',
      name: '通知联络专家',
      role: '汇讯通知并附带会议议程与会议资料',
      title: '汇讯通知',
      objective:
        '通过汇讯向全体参会人（必须含领导人/陈厅长）发送会议通知；发出前须呈请领导人确认；附上《会议议程》与《会议资料》。',
      prompt: `你是通知联络专家。先拟好汇讯通知与附件，必须等领导人确认后再真正发出；附上《xxx会议议程》与《xxx会议资料》；收件人覆盖全部参会人含领导人。写明确认结果与投递结果。`,
      capabilities: ['huixun'],
      dependsOn: deps,
    })
  }

  return {
    goal: `围绕「${short}${message.length > 36 ? '…' : ''}」由智枢调度专家协同交付`,
    experts,
  }
}

export function xiaozhiPlannerSystemPrompt(): string {
  return `${XIAOZHI_SYSTEM}

你现在只做「调度规划」，只输出 JSON（不要 Markdown 代码块），格式：
{
  "goal": "一句话总目标",
  "experts": [
    {
      "id": "english-kebab-case",
      "name": "中文展示名",
      "role": "一句话职责",
      "title": "本轮任务标题",
      "objective": "本轮具体目标 1-2 句",
      "prompt": "给该专家的系统提示（完整、可独立执行）",
      "capabilities": [],
      "dependsOn": []
    }
  ]
}

${CAPABILITY_HINT}

硬性要求：
1. 若领导只是询问今日安排/重点事项/进度，experts 可为 [] 或仅 1 名综合参谋，禁止默认生成会议室/通知/日程管理专家
2. 仅当领导明确要求准备会议、预定、通知、写入日程等动作时，才调度相应能力专家
3. experts 由你原创命名与设计，不要使用预置角色清单
4. 数量按需（通常 0-5 个）；用 dependsOn 表达依赖，无依赖的任务必须并行
5. dependsOn 填本轮其他专家的 id；起点专家用 []；汇聚类（如发通知）应依赖所有前置产出方
6. 不要生成名为智枢 / 小智 / xiaozhi 的子专家
7. prompt 必须足够具体，使该专家无需再问你即可开干`
}

/** 把智枢生成的专家编成 Claude Agent SDK agents map */
export function buildClaudeAgentsFromRoster(
  experts: DynamicExpert[],
): Record<string, AgentDefinition> {
  const agents: Record<string, AgentDefinition> = {}
  for (const e of experts) {
    const tools: string[] = []
    const mcpServers: string[] = []
    if (e.capabilities.includes('knowledge')) {
      tools.push(SEARCH_TOOL_FQN, GET_TOOL_FQN, COMPILE_TOOL_FQN)
      mcpServers.push('knowledge')
    }
    if (e.capabilities.includes('rooms')) {
      tools.push(QUERY_ROOMS_TOOL_FQN, GET_ROOM_TOOL_FQN, BOOK_ROOM_TOOL_FQN)
      mcpServers.push('rooms')
    }
    if (e.capabilities.includes('schedule')) {
      tools.push(
        QUERY_SCHEDULE_TOOL_FQN,
        FIND_SLOTS_TOOL_FQN,
        ARRANGE_SCHEDULE_TOOL_FQN,
      )
      mcpServers.push('schedule')
    }
    if (e.capabilities.includes('huixun')) {
      tools.push(HUIXUN_TOOL_FQN)
      mcpServers.push('huixun')
    }
    agents[e.id] = {
      description: `${e.name}：${e.role}。本轮目标：${e.objective}`,
      prompt: `${e.prompt}\n\n本轮任务目标：${e.objective}`,
      tools,
      ...(mcpServers.length ? { mcpServers } : {}),
    }
  }
  return agents
}

export function formatPriorOutputs(outputs: Record<string, string>): string {
  const entries = Object.entries(outputs)
  if (!entries.length) return '（尚无前序专家结论）'
  return entries.map(([id, text]) => `【${id}】\n${text}`).join('\n\n')
}
