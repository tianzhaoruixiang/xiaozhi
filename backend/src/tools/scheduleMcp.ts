import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import {
  DIRECTOR_NAME,
  arrangeDirectorSchedule,
  findDirectorFreeSlots,
  formatScheduleCard,
  queryDirectorSchedule,
} from './schedule.js'
import type { SsePayload } from '../lib/sse.js'

export const SCHEDULE_MCP_SERVER = 'schedule'
export const QUERY_SCHEDULE_TOOL = 'query_director_schedule'
export const FIND_SLOTS_TOOL = 'find_director_free_slots'
export const ARRANGE_SCHEDULE_TOOL = 'arrange_director_schedule'

export const QUERY_SCHEDULE_TOOL_FQN = `mcp__${SCHEDULE_MCP_SERVER}__${QUERY_SCHEDULE_TOOL}`
export const FIND_SLOTS_TOOL_FQN = `mcp__${SCHEDULE_MCP_SERVER}__${FIND_SLOTS_TOOL}`
export const ARRANGE_SCHEDULE_TOOL_FQN = `mcp__${SCHEDULE_MCP_SERVER}__${ARRANGE_SCHEDULE_TOOL}`

type Emit = (payload: SsePayload) => void

/** 厅长日程安排能力 */
export function createScheduleMcpServer(options?: {
  onEmit?: Emit
  agentId?: string
  agentName?: string
}) {
  const agentId = options?.agentId ?? 'schedule-coordinator'
  const agentName = options?.agentName ?? '日程管理专家'
  const onEmit = options?.onEmit

  const emitStart = (toolName: string, toolLabel: string, summary: string) => {
    onEmit?.({
      type: 'tool_start',
      agentId,
      agentName,
      toolName,
      toolLabel,
      summary,
    })
  }

  const emitDone = (
    toolName: string,
    toolLabel: string,
    summary: string,
    ok = true,
  ) => {
    onEmit?.({
      type: 'tool_done',
      agentId,
      agentName,
      toolName,
      toolLabel,
      summary,
      ok,
    })
  }

  const queryTool = tool(
    QUERY_SCHEDULE_TOOL,
    `查询${DIRECTOR_NAME}当日日程台账（时间、事项、地点、是否可协调）。`,
    {
      keyword: z.string().optional().describe('关键词，如 督导、碰头、阅处'),
      onlyFlexible: z
        .boolean()
        .optional()
        .describe('仅返回可协调改期的事项'),
    },
    async (args) => {
      emitStart(
        QUERY_SCHEDULE_TOOL,
        '日程 · 查询厅长日程',
        args.keyword ? `检索：${args.keyword}` : `查询${DIRECTOR_NAME}全日日程`,
      )
      const items = queryDirectorSchedule(args)
      emitDone(
        QUERY_SCHEDULE_TOOL,
        '日程 · 查询厅长日程',
        `返回 ${items.length} 项日程`,
      )
      const text = items.length
        ? `【${DIRECTOR_NAME}今日日程】\n\n${items.map(formatScheduleCard).join('\n\n')}`
        : `未查询到${DIRECTOR_NAME}相关日程。`
      return {
        content: [{ type: 'text' as const, text }],
        structuredContent: { director: DIRECTOR_NAME, items } as Record<
          string,
          unknown
        >,
      }
    },
  )

  const findTool = tool(
    FIND_SLOTS_TOOL,
    `为${DIRECTOR_NAME}寻找可安排会议的空档时段。`,
    {
      durationMinutes: z
        .number()
        .optional()
        .describe('需要的时长（分钟），默认 60'),
      afterTime: z.string().optional().describe('不早于 HH:MM'),
      beforeTime: z.string().optional().describe('不晚于 HH:MM'),
    },
    async (args) => {
      emitStart(
        FIND_SLOTS_TOOL,
        '日程 · 查找空档',
        `查找约 ${args.durationMinutes ?? 60} 分钟空档`,
      )
      const slots = findDirectorFreeSlots(args)
      emitDone(
        FIND_SLOTS_TOOL,
        '日程 · 查找空档',
        `找到 ${slots.length} 个候选空档`,
      )
      const text = slots.length
        ? slots
            .map(
              (s, i) =>
                `${i + 1}. ${s.startTime}-${s.endTime}　${s.note}`,
            )
            .join('\n')
        : '未找到足够长的空档，请考虑改期或压缩其他可协调事项。'
      return {
        content: [
          {
            type: 'text' as const,
            text: `【${DIRECTOR_NAME}可安排空档】\n${text}`,
          },
        ],
        structuredContent: { slots } as Record<string, unknown>,
      }
    },
  )

  const arrangeTool = tool(
    ARRANGE_SCHEDULE_TOOL,
    `将事项写入${DIRECTOR_NAME}日程。若与固定日程冲突会失败；与可协调事项重叠时会提示。`,
    {
      title: z.string().describe('事项标题，如 人员调度会'),
      startTime: z.string().describe('开始 HH:MM'),
      endTime: z.string().describe('结束 HH:MM'),
      location: z
        .string()
        .optional()
        .describe('地点，优先用已预定的完整会议室名称'),
      force: z
        .boolean()
        .optional()
        .describe('是否强制写入（仍不建议覆盖固定日程）'),
    },
    async (args) => {
      emitStart(
        ARRANGE_SCHEDULE_TOOL,
        '日程 · 安排厅长日程',
        `安排：${args.startTime}-${args.endTime} ${args.title}`,
      )
      const result = arrangeDirectorSchedule(args)
      emitDone(
        ARRANGE_SCHEDULE_TOOL,
        '日程 · 安排厅长日程',
        result.message,
        result.ok,
      )
      return {
        content: [{ type: 'text' as const, text: result.message }],
        structuredContent: (result.item ?? { ok: result.ok }) as Record<
          string,
          unknown
        >,
        isError: !result.ok,
      }
    },
  )

  return createSdkMcpServer({
    name: SCHEDULE_MCP_SERVER,
    version: '1.0.0',
    tools: [queryTool, findTool, arrangeTool],
  })
}
