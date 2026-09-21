import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import {
  bookMeetingRoom,
  formatRoomCard,
  getMeetingRoomById,
  queryMeetingRooms,
} from './rooms.js'
import type { SsePayload } from '../lib/sse.js'

export const ROOMS_MCP_SERVER = 'rooms'
export const QUERY_ROOMS_TOOL = 'query_meeting_rooms'
export const GET_ROOM_TOOL = 'get_meeting_room'
export const BOOK_ROOM_TOOL = 'book_meeting_room'

export const QUERY_ROOMS_TOOL_FQN = `mcp__${ROOMS_MCP_SERVER}__${QUERY_ROOMS_TOOL}`
export const GET_ROOM_TOOL_FQN = `mcp__${ROOMS_MCP_SERVER}__${GET_ROOM_TOOL}`
export const BOOK_ROOM_TOOL_FQN = `mcp__${ROOMS_MCP_SERVER}__${BOOK_ROOM_TOOL}`

type Emit = (payload: SsePayload) => void

/**
 * 会议室查询能力：查询台账 → 由智能体决策选用哪一间
 */
export function createRoomsMcpServer(options?: {
  onEmit?: Emit
  agentId?: string
  agentName?: string
}) {
  const agentId = options?.agentId ?? 'room-coordinator'
  const agentName = options?.agentName ?? '会议专家'
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
    QUERY_ROOMS_TOOL,
    '查询机关会议室台账。可按人数、时段、设备、关键词筛选；返回含「七楼101会议室」「三楼阶梯会议室」等详细名称的候选列表，供决策选用。',
    {
      query: z
        .string()
        .optional()
        .describe('关键词，如 调度会、阶梯、视频、七楼、应急'),
      minCapacity: z.number().optional().describe('最少容纳人数，如 12'),
      startTime: z
        .string()
        .optional()
        .describe('期望开始时间 HH:MM，如 14:00，用于避开占用时段'),
      endTime: z
        .string()
        .optional()
        .describe('期望结束时间 HH:MM，如 15:30'),
      equipment: z
        .string()
        .optional()
        .describe('需要的设备关键词，如 视频会议、投影、录播'),
      onlyAvailable: z
        .boolean()
        .optional()
        .describe('是否排除维护中房间，默认 true'),
      limit: z.number().optional().describe('返回条数，默认 8'),
    },
    async (args) => {
      const hint = [
        args.query && `关键词:${args.query}`,
        args.minCapacity && `≥${args.minCapacity}人`,
        args.startTime && `时段:${args.startTime}${args.endTime ? '-' + args.endTime : ''}`,
      ]
        .filter(Boolean)
        .join(' · ')

      emitStart(
        QUERY_ROOMS_TOOL,
        '会议室 · 查询台账',
        hint || '查询全部可预约会议室',
      )

      const hits = queryMeetingRooms({
        query: args.query,
        minCapacity: args.minCapacity,
        startTime: args.startTime,
        endTime: args.endTime,
        equipment: args.equipment,
        onlyAvailable: args.onlyAvailable ?? true,
        limit: args.limit,
      })

      const recommendable = hits.filter((h) => h.recommendable).length
      emitDone(
        QUERY_ROOMS_TOOL,
        '会议室 · 查询台账',
        `返回 ${hits.length} 间，其中 ${recommendable} 间可推荐`,
      )

      const text =
        hits.length === 0
          ? '未查询到符合条件的会议室。'
          : hits.map((h) => formatRoomCard(h)).join('\n\n')

      return {
        content: [
          {
            type: 'text' as const,
            text:
              text +
              '\n\n请根据容量、时段冲突、设备与适用场景，决策选定一间会议室，并在结论中写明完整名称（如「七楼101会议室」）。',
          },
        ],
        structuredContent: {
          rooms: hits.map((h) => ({
            id: h.id,
            name: h.name,
            capacity: h.capacity,
            floor: h.floor,
            status: h.status,
            equipment: h.equipment,
            busySlots: h.busySlots,
            timeConflicts: h.timeConflicts,
            recommendable: h.recommendable,
            suitableFor: h.suitableFor,
          })),
        } as Record<string, unknown>,
      }
    },
  )

  const getTool = tool(
    GET_ROOM_TOOL,
    '按会议室 ID 或详细名称查看单间详情（容量、设备、占用时段、备注）。',
    {
      idOrName: z
        .string()
        .describe('会议室 ID（如 room-7f-101）或名称（如 七楼101会议室）'),
    },
    async (args) => {
      emitStart(GET_ROOM_TOOL, '会议室 · 查看详情', `查询：${args.idOrName}`)
      const byId = getMeetingRoomById(args.idOrName)
      const room =
        byId ||
        queryMeetingRooms({ query: args.idOrName, limit: 1, onlyAvailable: false })[0] ||
        null

      if (!room) {
        emitDone(GET_ROOM_TOOL, '会议室 · 查看详情', `未找到 ${args.idOrName}`, false)
        return {
          content: [
            { type: 'text' as const, text: `未找到会议室：${args.idOrName}` },
          ],
          isError: true,
        }
      }

      emitDone(GET_ROOM_TOOL, '会议室 · 查看详情', `已读取「${room.name}」`)
      return {
        content: [{ type: 'text' as const, text: formatRoomCard(room) }],
        structuredContent: room as unknown as Record<string, unknown>,
      }
    },
  )

  const bookTool = tool(
    BOOK_ROOM_TOOL,
    '预定会议室：写入占用时段并生成预定凭证。须先查询确认房间与时段无冲突，再调用本工具完成预定。',
    {
      roomIdOrName: z
        .string()
        .describe('会议室 ID 或完整名称，如 七楼101会议室'),
      title: z.string().describe('会议主题，如 人员调度会'),
      startTime: z.string().describe('开始时间 HH:MM，如 14:00'),
      endTime: z.string().describe('结束时间 HH:MM，如 15:30'),
      organizer: z.string().optional().describe('主办单位或联系人'),
      attendees: z.array(z.string()).optional().describe('参会人列表'),
    },
    async (args) => {
      emitStart(
        BOOK_ROOM_TOOL,
        '会议室 · 预定',
        `预定：${args.roomIdOrName} ${args.startTime}-${args.endTime}`,
      )
      const result = bookMeetingRoom(args)
      emitDone(
        BOOK_ROOM_TOOL,
        '会议室 · 预定',
        result.message,
        result.ok,
      )
      return {
        content: [{ type: 'text' as const, text: result.message }],
        structuredContent: (result.booking ?? { ok: result.ok }) as Record<
          string,
          unknown
        >,
        isError: !result.ok,
      }
    },
  )

  return createSdkMcpServer({
    name: ROOMS_MCP_SERVER,
    version: '1.0.0',
    tools: [queryTool, getTool, bookTool],
  })
}
