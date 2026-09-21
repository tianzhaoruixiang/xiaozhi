import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import {
  compileMeetingBackground,
  formatArchiveBrief,
  formatMeetingMaterialsPacket,
  getMeetingArchiveById,
  searchMeetingArchives,
} from './knowledge.js'
import type { SsePayload } from '../lib/sse.js'

export const KNOWLEDGE_MCP_SERVER = 'knowledge'
export const SEARCH_TOOL = 'search_meeting_archives'
export const GET_TOOL = 'get_meeting_document'
export const COMPILE_TOOL = 'compile_meeting_background'

export const SEARCH_TOOL_FQN = `mcp__${KNOWLEDGE_MCP_SERVER}__${SEARCH_TOOL}`
export const GET_TOOL_FQN = `mcp__${KNOWLEDGE_MCP_SERVER}__${GET_TOOL}`
export const COMPILE_TOOL_FQN = `mcp__${KNOWLEDGE_MCP_SERVER}__${COMPILE_TOOL}`

type Emit = (payload: SsePayload) => void

/**
 * 知识管理专家专用：历年相似会议资料检索 / 取档 / 汇编《xxx会议资料》。
 */
export function createKnowledgeMcpServer(options?: {
  onEmit?: Emit
  agentId?: string
}) {
  const agentId = options?.agentId ?? 'archive-researcher'
  const onEmit = options?.onEmit

  const emitStart = (toolName: string, toolLabel: string, summary: string) => {
    onEmit?.({
      type: 'tool_start',
      agentId,
      agentName: '知识管理专家',
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
      agentName: '知识管理专家',
      toolName,
      toolLabel,
      summary,
      ok,
    })
  }

  const searchTool = tool(
    SEARCH_TOOL,
    '检索历年调度会、联席会议、应急协调等档案。按关键词、年份、会议类型召回相关资料。',
    {
      query: z.string().describe('检索词，如 人员调度、抽调、防汛值守'),
      year: z.number().optional().describe('限定年份，如 2025'),
      meetingType: z
        .string()
        .optional()
        .describe('会议类型，如 人员调度会 / 应急调度 / 值班调度'),
      limit: z.number().optional().describe('返回条数，默认 5'),
    },
    async (args) => {
      emitStart(SEARCH_TOOL, '知识库 · 检索会议档案', `检索：${args.query}`)
      const hits = searchMeetingArchives(args)
      const summary = `命中 ${hits.length} 份会议资料`
      emitDone(SEARCH_TOOL, '知识库 · 检索会议档案', summary)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              hits.map((h) => ({
                id: h.id,
                year: h.year,
                date: h.date,
                title: h.title,
                meetingType: h.meetingType,
                topics: h.topics,
                score: h.score,
                preview: h.summary.slice(0, 120),
              })),
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  const getTool = tool(
    GET_TOOL,
    '按档案 ID 获取单份会议资料全文（摘要、决议、附件清单）。',
    {
      id: z.string().describe('会议档案 ID，如 mtg-2025-invest-dd'),
    },
    async (args) => {
      emitStart(GET_TOOL, '知识库 · 读取会议档案', `读取：${args.id}`)
      const doc = getMeetingArchiveById(args.id)
      if (!doc) {
        emitDone(GET_TOOL, '知识库 · 读取会议档案', `未找到 ${args.id}`, false)
        return {
          content: [{ type: 'text' as const, text: `未找到档案：${args.id}` }],
          isError: true,
        }
      }
      emitDone(GET_TOOL, '知识库 · 读取会议档案', `已读取《${doc.title}》`)
      return {
        content: [{ type: 'text' as const, text: formatArchiveBrief(doc) }],
        structuredContent: doc as unknown as Record<string, unknown>,
      }
    },
  )

  const compileTool = tool(
    COMPILE_TOOL,
    '将多份历年相似会议档案汇编成《xxx会议资料》正文，供通知联络专家通过汇讯发给全体参会人（含领导人）。',
    {
      ids: z
        .array(z.string())
        .min(1)
        .describe('要汇编的会议档案 ID 列表'),
      focus: z
        .string()
        .optional()
        .describe('本轮会议名称或关注点，写入《xxx会议资料》标题，如 人员调度会'),
    },
    async (args) => {
      emitStart(
        COMPILE_TOOL,
        '知识库 · 汇编会议资料',
        `汇编 ${args.ids.length} 份档案`,
      )
      const docs = args.ids
        .map((id) => getMeetingArchiveById(id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d))

      const packet = formatMeetingMaterialsPacket(
        args.focus?.trim() || '工作会',
        compileMeetingBackground(docs),
      )
      const body = packet.text
      emitDone(
        COMPILE_TOOL,
        '知识库 · 汇编会议资料',
        `已汇编 ${docs.length} 份，生成${packet.title}`,
      )
      return {
        content: [{ type: 'text' as const, text: body }],
        structuredContent: {
          docIds: docs.map((d) => d.id),
          titles: docs.map((d) => d.title),
          briefingTitle: packet.title,
          background: body,
        } as Record<string, unknown>,
      }
    },
  )

  return createSdkMcpServer({
    name: KNOWLEDGE_MCP_SERVER,
    version: '1.0.0',
    tools: [searchTool, getTool, compileTool],
  })
}
