import {
  XIAOZHI_BRIEF_PROMPT,
  XIAOZHI_SYSTEM,
  buildClaudeAgentsFromRoster,
  buildExecutionWaves,
  formatPlansContext,
  formatPriorOutputs,
  parseXiaozhiPlan,
  fallbackDynamicPlan,
  xiaozhiPlannerSystemPrompt,
  type DynamicExpert,
  type DynamicPlan,
  type PlanItem,
} from './prompts.js'
import { chatCompletion } from '../lib/openaiCompatible.js'
import { getOpenAIConfig } from '../lib/llmConfig.js'
import { sleep, type SsePayload } from '../lib/sse.js'
import { awaitLeaderDispatchConfirm } from '../lib/leaderConfirm.js'
import {
  extractMeetingAgenda,
  extractMeetingMaterials,
  formatHuixunDirectoryHint,
  sendHuixunMeetingNotice,
  type HuixunNoticeInput,
} from '../tools/huixun.js'
import {
  compileMeetingBackground,
  formatMeetingMaterialsPacket,
  searchMeetingArchives,
} from '../tools/knowledge.js'
import {
  bookMeetingRoom,
  formatRoomCard,
  queryMeetingRooms,
} from '../tools/rooms.js'
import {
  DIRECTOR_NAME,
  arrangeDirectorSchedule,
  findDirectorFreeSlots,
  formatScheduleCard,
  queryDirectorSchedule,
} from '../tools/schedule.js'
import {
  ATTENDEE_STATUS,
  formatAttendeeStatusHint,
} from '../data/attendeeStatus.js'
import { pickPlanSource } from '../config/resolvePlan.js'
import {
  resolveOralReport,
  stripOralSection,
} from '../lib/oralReport.js'
import { runGeneralChat } from '../lib/generalChat.js'

/** 智枢调度：生成本轮专家团队（无预置角色） */
export async function planExpertsWithXiaozhi(
  contextBlock: string,
  message: string,
): Promise<DynamicPlan> {
  try {
    const raw = await chatCompletion({
      messages: [
        { role: 'system', content: xiaozhiPlannerSystemPrompt() },
        { role: 'user', content: contextBlock },
      ],
      temperature: 0.4,
    })
    return parseXiaozhiPlan(raw, message)
  } catch {
    return fallbackDynamicPlan(message)
  }
}

async function runKnowledgeCapability(options: {
  expert: DynamicExpert
  contextBlock: string
  priorText: string
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  const { expert, onEvent } = options
  const id = expert.id
  const name = expert.name

  onEvent({
    type: 'agent_progress',
    agentId: id,
    agentName: name,
    summary: `执行中：${expert.title}`,
  })

  let query = '会议 背景 资料'
  try {
    const raw = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: '根据上下文提炼历年相似会议档案检索词。只输出一行中文关键词，空格分隔，勿解释。',
        },
        {
          role: 'user',
          content: `${options.contextBlock}\n\n【前序结论】\n${options.priorText}\n\n【任务】\n${expert.objective}`,
        },
      ],
      temperature: 0.2,
    })
    if (raw.trim()) query = raw.trim().replace(/\n/g, ' ').slice(0, 80)
  } catch {
    // keep default
  }

  onEvent({
    type: 'tool_start',
    agentId: id,
    agentName: name,
    toolName: 'search_meeting_archives',
    toolLabel: '知识库 · 检索会议档案',
    summary: `检索：${query}`,
  })

  const hits = searchMeetingArchives({ query, limit: 4 })
  onEvent({
    type: 'tool_done',
    agentId: id,
    agentName: name,
    toolName: 'search_meeting_archives',
    toolLabel: '知识库 · 检索会议档案',
    summary: `命中 ${hits.length} 份会议资料`,
    ok: true,
  })

  await sleep(200)

  onEvent({
    type: 'tool_start',
    agentId: id,
    agentName: name,
    toolName: 'compile_meeting_background',
    toolLabel: '知识库 · 汇编会议资料',
    summary: `汇编 ${hits.length} 份档案`,
  })

  const meetingLabel = query.includes('调度')
    ? '人员调度会'
    : query.split(/[\s,，、]+/).filter(Boolean)[0]?.slice(0, 16) || '工作会'
  const packet = formatMeetingMaterialsPacket(
    meetingLabel,
    compileMeetingBackground(hits),
  )

  onEvent({
    type: 'tool_done',
    agentId: id,
    agentName: name,
    toolName: 'compile_meeting_background',
    toolLabel: '知识库 · 汇编会议资料',
    summary: `已汇编 ${hits.length} 份，生成${packet.title}`,
    ok: true,
  })

  const think = await chatCompletion({
    messages: [
      {
        role: 'system',
        content: `${expert.prompt}

本轮任务目标：${expert.objective}
工具检索与汇编已完成。请基于结果整理输出：
1. 说明检索了哪些历年相似会议
2. 必须单独给出章节标题${packet.title}，正文含历次对照、可借鉴决议、会前阅读要点
3. 只引用工具结果，勿编造档案`,
      },
      {
        role: 'user',
        content: `${options.contextBlock}

【前序专家结论】
${options.priorText}

【检索关键词】
${query}

【已汇编会议资料】
${packet.text}`,
      },
    ],
  })

  const combined = think.trim()
  if (/《[^》]{2,40}会议资料》/.test(combined)) {
    return combined
  }
  return `${combined}

${packet.text}`
}

async function runRoomsCapability(options: {
  expert: DynamicExpert
  contextBlock: string
  priorText: string
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  const { expert, onEvent } = options
  const id = expert.id
  const name = expert.name

  onEvent({
    type: 'agent_progress',
    agentId: id,
    agentName: name,
    summary: `执行中：${expert.title}`,
  })

  let queryHint = '人员调度会'
  let minCapacity = 12
  let startTime = '14:00'
  let endTime = '15:30'
  let equipment: string | undefined

  try {
    const raw = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: `你是会议室查询参数规划器。只输出 JSON：
{"query":"关键词","minCapacity":人数数字,"startTime":"HH:MM","endTime":"HH:MM","equipment":"可选设备词"}
根据领导指示与今日安排估算人数与时段；不要解释。`,
        },
        {
          role: 'user',
          content: `${options.contextBlock}\n\n【前序结论】\n${options.priorText}\n\n【任务】\n${expert.objective}`,
        },
      ],
      temperature: 0.2,
    })
    const text = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (typeof parsed.query === 'string' && parsed.query.trim()) {
      queryHint = parsed.query.trim().slice(0, 40)
    }
    if (typeof parsed.minCapacity === 'number' && parsed.minCapacity > 0) {
      minCapacity = Math.min(120, Math.floor(parsed.minCapacity))
    }
    if (typeof parsed.startTime === 'string' && /^\d{1,2}:\d{2}$/.test(parsed.startTime)) {
      startTime = parsed.startTime
    }
    if (typeof parsed.endTime === 'string' && /^\d{1,2}:\d{2}$/.test(parsed.endTime)) {
      endTime = parsed.endTime
    }
    if (typeof parsed.equipment === 'string' && parsed.equipment.trim()) {
      equipment = parsed.equipment.trim().slice(0, 20)
    }
  } catch {
    // keep defaults
  }

  onEvent({
    type: 'tool_start',
    agentId: id,
    agentName: name,
    toolName: 'query_meeting_rooms',
    toolLabel: '会议室 · 查询台账',
    summary: `查询：${queryHint} · ≥${minCapacity}人 · ${startTime}-${endTime}`,
  })

  const hits = queryMeetingRooms({
    query: queryHint,
    minCapacity,
    startTime,
    endTime,
    equipment,
    onlyAvailable: true,
    limit: 8,
  })

  onEvent({
    type: 'tool_done',
    agentId: id,
    agentName: name,
    toolName: 'query_meeting_rooms',
    toolLabel: '会议室 · 查询台账',
    summary: `返回 ${hits.length} 间，可推荐 ${hits.filter((h) => h.recommendable).length} 间`,
    ok: true,
  })

  await sleep(200)

  const catalog = hits.map((h) => formatRoomCard(h)).join('\n\n')

  // 可选：对首选房间再拉一次详情，模拟「查看详情」工具
  const top = hits.find((h) => h.recommendable) ?? hits[0]
  if (top) {
    onEvent({
      type: 'tool_start',
      agentId: id,
      agentName: name,
      toolName: 'get_meeting_room',
      toolLabel: '会议室 · 查看详情',
      summary: `核对：${top.name}`,
    })
    await sleep(160)
    onEvent({
      type: 'tool_done',
      agentId: id,
      agentName: name,
      toolName: 'get_meeting_room',
      toolLabel: '会议室 · 查看详情',
      summary: `已核对「${top.name}」`,
      ok: true,
    })
  }

  const think = await chatCompletion({
    messages: [
      {
        role: 'system',
        content: `${expert.prompt}

本轮任务目标：${expert.objective}

你已获得会议室查询结果。请比较候选会议室后做出决策，并用简洁 Markdown 输出：
1. 明确写出「选定会议室：完整名称」（必须来自查询结果，如七楼101会议室、三楼阶梯会议室）
2. 说明容量、时段是否冲突、设备是否满足
3. 列出 1-2 个备选及不选用原因
4. 必须单独给出章节标题《{本次会议简称}会议议程》（例如《人员调度会会议议程》），正文含：会议名称、时间、地点（完整会议室名）、主持人、参会人（须含领导人/厅长及各部门参会人）、议题顺序与建议时长、会前准备。`,
      },
      {
        role: 'user',
        content: `${options.contextBlock}

【前序专家结论】
${options.priorText}

【查询条件】
关键词：${queryHint}；人数≥${minCapacity}；时段 ${startTime}-${endTime}${equipment ? `；设备：${equipment}` : ''}

【会议室台账查询结果】
${catalog || '（无结果）'}`,
      },
    ],
  })

  let bookLine = ''
  if (top) {
    onEvent({
      type: 'tool_start',
      agentId: id,
      agentName: name,
      toolName: 'book_meeting_room',
      toolLabel: '会议室 · 预定',
      summary: `预定：${top.name} ${startTime}-${endTime}`,
    })
    const booked = bookMeetingRoom({
      roomIdOrName: top.id,
      title: queryHint.includes('调度') ? '人员调度会' : queryHint.slice(0, 20) || '工作会议',
      startTime,
      endTime,
      organizer: '办公室',
    })
    onEvent({
      type: 'tool_done',
      agentId: id,
      agentName: name,
      toolName: 'book_meeting_room',
      toolLabel: '会议室 · 预定',
      summary: booked.message,
      ok: booked.ok,
    })
    bookLine = `\n\n## 预定结果\n${booked.message}`
  }

  const meetingLabel = queryHint.includes('调度')
    ? '人员调度会'
    : queryHint.slice(0, 16) || '工作会议'
  const combined = `${think.trim()}${bookLine}`
  if (/《[^》]{2,40}会议议程》/.test(combined)) {
    return combined
  }

  const roomName = top?.name ?? '待会议室协调确认'
  return `${combined}

## 《${meetingLabel}会议议程》
- 会议名称：${meetingLabel}
- 时间：${startTime}–${endTime}
- 地点：${roomName}
- 主持人：办公室
- 出席：${DIRECTOR_NAME}（领导人）及各部门参会人

1. 主持人宣布开会并确认出席（3 分钟）
2. 汇报议题与研判要点（主时段）
3. 领导人指示
4. 明确分工、落实时限并散会`
}

async function runScheduleCapability(options: {
  expert: DynamicExpert
  contextBlock: string
  priorText: string
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  const { expert, onEvent } = options
  const id = expert.id
  const name = expert.name

  onEvent({
    type: 'agent_progress',
    agentId: id,
    agentName: name,
    summary: `执行中：${expert.title}`,
  })

  onEvent({
    type: 'tool_start',
    agentId: id,
    agentName: name,
    toolName: 'query_director_schedule',
    toolLabel: '日程 · 查询厅长日程',
    summary: `查询${DIRECTOR_NAME}全日日程`,
  })
  const dayItems = queryDirectorSchedule()
  onEvent({
    type: 'tool_done',
    agentId: id,
    agentName: name,
    toolName: 'query_director_schedule',
    toolLabel: '日程 · 查询厅长日程',
    summary: `返回 ${dayItems.length} 项日程`,
    ok: true,
  })
  await sleep(160)

  onEvent({
    type: 'tool_start',
    agentId: id,
    agentName: name,
    toolName: 'find_director_free_slots',
    toolLabel: '日程 · 查找空档',
    summary: '查找约 60 分钟空档',
  })
  const slots = findDirectorFreeSlots({ durationMinutes: 60 })
  onEvent({
    type: 'tool_done',
    agentId: id,
    agentName: name,
    toolName: 'find_director_free_slots',
    toolLabel: '日程 · 查找空档',
    summary: `找到 ${slots.length} 个候选空档`,
    ok: true,
  })
  await sleep(160)

  // 从前序结论提取会议室名与建议时段
  const roomMatch = options.priorText.match(
    /((?:[一二三四五六七八九十百负]+楼|[0-9]+楼)[^\n，。；]{0,12}(?:会议室|会商室|多功能厅|指挥会议室|阶梯教室|视频会议室))/,
  )
  const slot = slots[0] ?? { startTime: '14:00', endTime: '15:00', note: '默认午后' }
  const location = roomMatch?.[1]

  onEvent({
    type: 'tool_start',
    agentId: id,
    agentName: name,
    toolName: 'arrange_director_schedule',
    toolLabel: '日程 · 安排厅长日程',
    summary: `安排：${slot.startTime}-${slot.endTime}`,
  })
  const arranged = arrangeDirectorSchedule({
    title: '人员调度会',
    startTime: slot.startTime,
    endTime: slot.endTime,
    location,
  })
  onEvent({
    type: 'tool_done',
    agentId: id,
    agentName: name,
    toolName: 'arrange_director_schedule',
    toolLabel: '日程 · 安排厅长日程',
    summary: arranged.message,
    ok: arranged.ok,
  })

  const think = await chatCompletion({
    messages: [
      {
        role: 'system',
        content: `${expert.prompt}

本轮任务目标：${expert.objective}
请基于已查询的厅长日程、空档与安排结果，用简洁 Markdown 说明安排结论与注意事项。`,
      },
      {
        role: 'user',
        content: `${options.contextBlock}

【前序专家结论】
${options.priorText}

【${DIRECTOR_NAME}今日日程】
${dayItems.map(formatScheduleCard).join('\n\n')}

【候选空档】
${slots.map((s) => `${s.startTime}-${s.endTime} ${s.note}`).join('\n') || '无'}

【安排工具结果】
${arranged.message}`,
      },
    ],
  })

  return `${think.trim()}

## 厅长日程安排结果
${arranged.message}`
}

function mergeAllMeetingRecipients(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of [
    ...list,
    DIRECTOR_NAME,
    ...ATTENDEE_STATUS.map((a) => a.name),
  ]) {
    const key = name.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

function agendaFromPrior(priorText: string): {
  agendaTitle?: string
  agenda?: string
} {
  const found = extractMeetingAgenda(priorText)
  if (!found) return {}
  return { agendaTitle: found.title, agenda: found.body }
}

function briefingFromPrior(priorText: string): {
  briefingTitle?: string
  backgroundBrief?: string
} {
  const found = extractMeetingMaterials(priorText)
  if (!found) return {}
  return { briefingTitle: found.title, backgroundBrief: found.body }
}

async function buildHuixunNoticeArgs(options: {
  contextBlock: string
  priorText: string
  objective: string
}): Promise<HuixunNoticeInput> {
  try {
    const raw = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: `你是通知工具规划器。生成汇讯工具 send_meeting_notice 的 JSON 参数。
只输出 JSON：
{"recipients":["姓名或角色"],"title":"通知标题","content":"通知正文","briefingTitle":"《xxx会议资料》","backgroundBrief":"会议资料全文","agendaTitle":"《xxx会议议程》","agenda":"会议议程全文","meetingTime":"可选","location":"可选"}
通讯录可匹配：${formatHuixunDirectoryHint()}
参会状态：
${formatAttendeeStatusHint()}
要求：须从前期结论提取《xxx会议议程》填入 agendaTitle/agenda，提取《xxx会议资料》填入 briefingTitle/backgroundBrief；recipients 必须覆盖全部参会人且包含领导人（陈厅长）；出差人员仍列入收件人；location 优先填写前序结论中已选定的完整会议室名称（如七楼101会议室、三楼阶梯会议室）。`,
        },
        {
          role: 'user',
          content: `${options.contextBlock}\n\n【任务】${options.objective}\n\n【前序结论】\n${options.priorText}`,
        },
      ],
      temperature: 0.2,
    })

    const jsonText = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(jsonText) as Partial<HuixunNoticeInput>
    if (
      Array.isArray(parsed.recipients) &&
      parsed.recipients.length &&
      typeof parsed.title === 'string' &&
      typeof parsed.content === 'string'
    ) {
      return {
        recipients: mergeAllMeetingRecipients(parsed.recipients.map(String)),
        title: parsed.title,
        content: parsed.content,
        ...(() => {
          const fromPrior = briefingFromPrior(options.priorText)
          const backgroundBrief =
            typeof parsed.backgroundBrief === 'string' &&
            parsed.backgroundBrief.trim()
              ? parsed.backgroundBrief
              : fromPrior.backgroundBrief || options.priorText.slice(0, 2500)
          const briefingTitle =
            typeof parsed.briefingTitle === 'string' && parsed.briefingTitle.trim()
              ? parsed.briefingTitle
              : fromPrior.briefingTitle
          return { backgroundBrief, briefingTitle }
        })(),
        ...(() => {
          const fromPrior = agendaFromPrior(options.priorText)
          const agenda =
            typeof parsed.agenda === 'string' && parsed.agenda.trim()
              ? parsed.agenda
              : fromPrior.agenda
          const agendaTitle =
            typeof parsed.agendaTitle === 'string' && parsed.agendaTitle.trim()
              ? parsed.agendaTitle
              : fromPrior.agendaTitle
          return agenda ? { agenda, agendaTitle } : {}
        })(),
        meetingTime:
          typeof parsed.meetingTime === 'string' ? parsed.meetingTime : undefined,
        location: typeof parsed.location === 'string' ? parsed.location : undefined,
      }
    }
  } catch {
    // fall through
  }

  // 尝试从前序结论提取会议室全名
  const roomMatch = options.priorText.match(
    /((?:[一二三四五六七八九十百负]+楼|[0-9]+楼)?[^\n，。；]{0,8}(?:会议室|会商室|多功能厅|指挥会议室|阶梯教室|视频会议室))/,
  )

  const briefing = briefingFromPrior(options.priorText)

  return {
    recipients: mergeAllMeetingRecipients([]),
    title: '人员调度会参会通知（含会议议程与会议资料）',
    content: `${options.priorText.slice(0, 600)}\n\n请全体参会人（含领导人）确认出席，会前阅知附件《会议议程》与《会议资料》。`,
    backgroundBrief: briefing.backgroundBrief || options.priorText.slice(0, 2500),
    briefingTitle: briefing.briefingTitle,
    ...agendaFromPrior(options.priorText),
    meetingTime: '待确认',
    location: roomMatch?.[1] ?? '待会议室协调确认',
  }
}

async function runHuixunCapability(options: {
  expert: DynamicExpert
  contextBlock: string
  priorText: string
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  const { expert, onEvent } = options
  const id = expert.id
  const name = expert.name

  onEvent({
    type: 'agent_progress',
    agentId: id,
    agentName: name,
    summary: `执行中：${expert.title}`,
  })

  const planText = await chatCompletion({
    messages: [
      {
        role: 'system',
        content: `${expert.prompt}\n\n本轮任务目标：${expert.objective}\n先拟好通知与《会议议程》《会议资料》，必须等领导人确认后再调用汇讯发出。`,
      },
      {
        role: 'user',
        content: `${options.contextBlock}\n\n【前序专家结论】\n${options.priorText}`,
      },
    ],
  })

  onEvent({
    type: 'agent_progress',
    agentId: id,
    agentName: name,
    summary: '正在组装汇讯通知（含会议议程与会议资料）…',
  })

  const noticeArgs = await buildHuixunNoticeArgs({
    contextBlock: options.contextBlock,
    priorText: `${options.priorText}\n\n${planText}`,
    objective: expert.objective,
  })

  onEvent({
    type: 'agent_progress',
    agentId: id,
    agentName: name,
    summary: '通知与议程已拟就，呈请领导人确认后再发出',
  })

  const decision = await awaitLeaderDispatchConfirm({
    onEvent,
    agentId: id,
    agentName: name,
    draft: noticeArgs,
  })

  if (!decision.approved) {
    const why =
      decision.reason === 'timeout'
        ? '等候领导人确认超时，会议通知与议程未发出'
        : '领导人未确认，会议通知与议程未发出'
    onEvent({
      type: 'tool_done',
      agentId: id,
      agentName: name,
      toolName: 'send_meeting_notice',
      toolLabel: '汇讯 · 发送会议通知',
      summary: why,
      ok: false,
    })
    return `${planText.trim()}

## 汇讯通知执行
- 状态：未发出
- 原因：${why}`
  }

  onEvent({
    type: 'tool_start',
    agentId: id,
    agentName: name,
    toolName: 'send_meeting_notice',
    toolLabel: '汇讯 · 发送会议通知',
    summary: `领导人已确认，正在通过汇讯通知：${noticeArgs.recipients.join('、')}${
      noticeArgs.agenda ? '（附会议议程）' : ''
    }${noticeArgs.backgroundBrief ? '（附会议资料）' : ''}`,
  })

  const result = await sendHuixunMeetingNotice(noticeArgs)

  onEvent({
    type: 'tool_done',
    agentId: id,
    agentName: name,
    toolName: 'send_meeting_notice',
    toolLabel: '汇讯 · 发送会议通知',
    summary: result.summary,
    ok: result.ok,
    recipients: result.delivered.map((d) => d.name),
  })

  return `${planText.trim()}

## 汇讯通知执行
- 工具：send_meeting_notice
- 模式：${result.mode === 'live' ? '实发' : '模拟投递'}
- 结果：${result.summary}
- 已附会议议程：${noticeArgs.agendaTitle || (noticeArgs.agenda ? '是' : '否')}
- 已附会议资料：${noticeArgs.briefingTitle || (noticeArgs.backgroundBrief ? '是' : '否')}
- 已达对象：${
    result.delivered.map((d) => `${d.name}（${d.role}）`).join('、') || '无'
  }`
}

async function runGenericExpert(options: {
  expert: DynamicExpert
  contextBlock: string
  priorText: string
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  const { expert, onEvent } = options
  onEvent({
    type: 'agent_progress',
    agentId: expert.id,
    agentName: expert.name,
    summary: `执行中：${expert.title}（调用模型…）`,
  })

  try {
    const text = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: `${expert.prompt}\n\n本轮任务目标：${expert.objective}`,
        },
        {
          role: 'user',
          content: `${options.contextBlock}\n\n【前序专家结论】\n${options.priorText || '（无）'}`,
        },
      ],
      temperature: 0.35,
    })
    onEvent({
      type: 'agent_progress',
      agentId: expert.id,
      agentName: expert.name,
      summary: '模型答复已返回，正在整理结论…',
    })
    return text
  } catch (err) {
    const msg = err instanceof Error ? err.message : '模型调用失败'
    onEvent({
      type: 'agent_progress',
      agentId: expert.id,
      agentName: expert.name,
      summary: `模型调用异常，使用本地研判兜底：${msg}`,
    })
    return buildContextAnalystFallback(expert, options.contextBlock)
  }
}

/** 情境分析等无工具专家的本地兜底，避免整轮卡死 */
function buildContextAnalystFallback(
  expert: DynamicExpert,
  contextBlock: string,
): string {
  const planLines = contextBlock
    .split('\n')
    .filter((l) => /^\d+\./.test(l.trim()))
    .slice(0, 5)
  return [
    `## ${expert.title || expert.name}`,
    `目标：${expert.objective}`,
    '',
    '（模型暂不可用，基于今日安排做要点梳理）',
    planLines.length ? planLines.map((l) => `- ${l.trim()}`).join('\n') : '- 暂无可用计划条目',
    '',
    '建议：请后续专家按领导指示继续办理会议室、日程与通知；若模型恢复可再精炼研判。',
  ].join('\n')
}

async function runXiaozhiBrief(options: {
  contextBlock: string
  outputs: Record<string, string>
  userMessage: string
  enableOralReport?: boolean
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  const { onEvent } = options
  const enableOral = options.enableOralReport !== false
  onEvent({
    type: 'agent_spawn',
    agentId: 'xiaozhi',
    agentName: '智枢',
    agentRole: enableOral
      ? '领导助手 · 编排监督与口述汇报'
      : '个人助手 · 编排汇总',
    title: enableOral ? '监督汇总汇报' : '汇总结论',
    objective: enableOral
      ? '汇总本轮专家结论并向领导口述汇报'
      : '汇总本轮专家结论并给出书面答复',
    summary: '智枢登场：监督汇总',
  })
  onEvent({
    type: 'agent_start',
    agentId: 'xiaozhi',
    agentName: '智枢',
    agentRole: enableOral
      ? '领导助手 · 编排监督与口述汇报'
      : '个人助手 · 编排汇总',
    summary: enableOral
      ? '智枢正在监督汇总，并准备向领导口述汇报…'
      : '智枢正在汇总本轮结论…',
  })

  const briefUserTail = enableOral
    ? `请输出书面纪要，并务必在文末单独用一行写上标记「【口述汇报】」，紧接可朗读口语正文（不要再用 Markdown）。
口述内容必须完全依据本轮领导指示与上述专家结论现写，禁止套用固定会议汇报模板，禁止编造未出现的信息。`
    : `请输出书面纪要（Markdown）。不要撰写「【口述汇报】」或任何口述/语音稿段落，只给书面结论与建议。`

  const brief = await chatCompletion({
    messages: [
      {
        role: 'system',
        content: `${XIAOZHI_SYSTEM}\n\n${XIAOZHI_BRIEF_PROMPT}

参会状态（仅当本轮涉及参会/通知时按需引用，勿强行插入）：
${formatAttendeeStatusHint()}`,
      },
      {
        role: 'user',
        content: `${options.contextBlock}

【本轮专家结论】
${formatPriorOutputs(options.outputs)}

${briefUserTail}`,
      },
    ],
    onDelta: (text) => onEvent({ type: 'assistant_delta', text }),
  })

  const written = enableOral ? brief : stripOralSection(brief)

  onEvent({
    type: 'agent_done',
    agentId: 'xiaozhi',
    agentName: '智枢',
    summary: written,
  })

  if (!enableOral) {
    onEvent({ type: 'final', text: written })
    return written
  }

  let oral = ''
  try {
    const resolved = await resolveOralReport({
      userMessage: options.userMessage,
      briefText: brief,
      expertOutputs: formatPriorOutputs(options.outputs),
      contextBlock: options.contextBlock,
    })
    oral = resolved.oral
    onEvent({
      type: 'agent_progress',
      agentId: 'xiaozhi',
      agentName: '智枢',
      summary:
        resolved.source === 'section'
          ? '已从汇报正文提取口述稿'
          : resolved.source === 'llm'
            ? '已由智枢生成口述汇报'
            : '模型暂不可用，已据本轮结论压缩口述稿',
    })
  } catch {
    oral = brief.replace(/[#*`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
  }

  oral = oral.replace(/[#*`]/g, '').replace(/\n+/g, ' ').trim()
  onEvent({
    type: 'oral_report',
    agentId: 'xiaozhi',
    agentName: '智枢',
    text: oral,
    summary: '智枢开始向领导语音汇报',
  })
  onEvent({ type: 'final', text: brief })
  return brief
}

export async function runOpenAIOrchestrator(options: {
  message: string
  plans?: PlanItem[]
  team?: string
  workflow?: string
  mode?: string
  enableOralReport?: boolean
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  const { baseURL, model } = getOpenAIConfig()
  const plansText = formatPlansContext(options.plans)
  const contextBlock = `【今日工作安排】\n${plansText}\n\n【领导指示】\n${options.message}`
  const outputs: Record<string, string> = {}

  try {
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
        summary: `使用配置工作流（${picked.reason}）· ${plan.experts.length} 位专家`,
      })
    } else if (picked.mode === 'config') {
      throw new Error(
        '编排模式为 config，但未找到可用的专家团/工作流，请检查 .claude/teams 与 .claude/workflows',
      )
    } else {
      options.onEvent({
        type: 'agent_progress',
        agentId: 'xiaozhi',
        agentName: '智枢',
        summary: '改为动态生成专家团队…',
      })
      plan = await planExpertsWithXiaozhi(contextBlock, options.message)
      if (!plan.experts.length) {
        return runGeneralChat({
          message: options.message,
          plans: options.plans,
          enableOralReport: options.enableOralReport,
          onEvent: options.onEvent,
        })
      }
    }

    await sleep(280)

    options.onEvent({
      type: 'plan_done',
      goal: plan.goal,
      total: plan.experts.length,
      message: `已就绪 ${plan.experts.length} 位专家（含并行分支）：${plan.experts.map((e) => e.name).join('、')}`,
    })

    for (let i = 0; i < plan.experts.length; i += 1) {
      const expert = plan.experts[i]
      options.onEvent({
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
      await sleep(280)
    }

    await sleep(200)

    const waves = buildExecutionWaves(plan.experts)
    for (let w = 0; w < waves.length; w += 1) {
      const wave = waves[w]
      const priorText = formatPriorOutputs(outputs)
      const parallel = wave.length > 1

      if (parallel) {
        options.onEvent({
          type: 'agent_progress',
          agentId: wave[0].id,
          agentName: '智枢',
          summary: `第 ${w + 1} 波并行：${wave.map((e) => e.name).join('、')}`,
        })
      }

      // 同波次先全部登场，再并行执行
      for (const expert of wave) {
        options.onEvent({
          type: 'agent_spawn',
          agentId: expert.id,
          agentName: expert.name,
          agentRole: expert.role,
          title: expert.title,
          objective: expert.objective,
          summary: parallel ? `并行登场：${expert.name}` : `登场：${expert.name}`,
        })
      }
      await sleep(220)

      const results = await Promise.all(
        wave.map(async (expert) => {
          options.onEvent({
            type: 'agent_start',
            agentId: expert.id,
            agentName: expert.name,
            agentRole: expert.role,
            title: expert.title,
            objective: expert.objective,
            summary: parallel ? '并行执行中…' : '开始执行…',
          })

          let text = ''
          try {
            text = await runExpertWork({
              expert,
              contextBlock,
              priorText,
              onEvent: options.onEvent,
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message : '专家执行失败'
            text = `【${expert.name}执行异常】${msg}。已跳过该专家，后续专家可继续。`
            options.onEvent({
              type: 'agent_progress',
              agentId: expert.id,
              agentName: expert.name,
              summary: text,
            })
          }

          options.onEvent({
            type: 'agent_done',
            agentId: expert.id,
            agentName: expert.name,
            summary: text || '（无产出）',
          })
          return { id: expert.id, text: text || '（无产出）' }
        }),
      )

      for (const r of results) {
        outputs[r.id] = r.text
      }
      await sleep(200)
    }

    return runXiaozhiBrief({
      contextBlock,
      outputs,
      userMessage: options.message,
      enableOralReport: options.enableOralReport,
      onEvent: options.onEvent,
    })
  } catch (err) {
    const message =
      err instanceof Error
        ? `${err.message}（当前模型: ${model} @ ${baseURL}）`
        : 'OpenAI 兼容编排失败'
    options.onEvent({ type: 'error', message })
    throw new Error(message)
  }
}

async function runExpertWork(options: {
  expert: DynamicExpert
  contextBlock: string
  priorText: string
  onEvent: (payload: SsePayload) => void
}): Promise<string> {
  const { expert, contextBlock, priorText, onEvent } = options
  const parts: string[] = []

  if (expert.capabilities.includes('rooms')) {
    parts.push(
      await runRoomsCapability({
        expert,
        contextBlock,
        priorText: [priorText, ...parts].filter(Boolean).join('\n\n'),
        onEvent,
      }),
    )
  }
  if (expert.capabilities.includes('schedule')) {
    parts.push(
      await runScheduleCapability({
        expert,
        contextBlock,
        priorText: [priorText, ...parts].filter(Boolean).join('\n\n'),
        onEvent,
      }),
    )
  }
  if (expert.capabilities.includes('knowledge')) {
    parts.push(
      await runKnowledgeCapability({
        expert,
        contextBlock,
        priorText: [priorText, ...parts].filter(Boolean).join('\n\n'),
        onEvent,
      }),
    )
  }
  if (expert.capabilities.includes('huixun')) {
    parts.push(
      await runHuixunCapability({
        expert,
        contextBlock,
        priorText: [priorText, ...parts].filter(Boolean).join('\n\n'),
        onEvent,
      }),
    )
  }

  if (parts.length) return parts.join('\n\n')
  return runGenericExpert({
    expert,
    contextBlock,
    priorText,
    onEvent,
  })
}

/** 供 Claude 路径复用：先由智枢生成专家，再编成 SDK agents */
export { buildClaudeAgentsFromRoster }
