import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import {
  formatHuixunDirectoryHint,
  sendHuixunMeetingNotice,
  type HuixunNoticeInput,
  type HuixunNoticeResult,
} from './huixun.js'
import type { SsePayload } from '../lib/sse.js'
import { awaitLeaderDispatchConfirm } from '../lib/leaderConfirm.js'

export const HUIXUN_MCP_SERVER = 'huixun'
export const HUIXUN_TOOL_NAME = 'send_meeting_notice'
/** Claude Agent SDK 对 MCP 工具的完整引用名 */
export const HUIXUN_TOOL_FQN = `mcp__${HUIXUN_MCP_SERVER}__${HUIXUN_TOOL_NAME}`

type Emit = (payload: SsePayload) => void

/**
 * 联络助手专用：汇讯 MCP 工具服务。
 * 可通过 onEmit 把投递结果回传到 SSE，供前端展示。
 */
export function createHuixunMcpServer(options?: {
  onEmit?: Emit
  agentId?: string
  agentName?: string
}) {
  const agentId = options?.agentId ?? 'notice-dispatcher'
  const agentName = options?.agentName ?? '通知联络专家'
  const onEmit = options?.onEmit

  const sendMeetingNotice = tool(
    HUIXUN_TOOL_NAME,
    `通过政务汇讯（WiseUC）向相关部门人员发送会议通知。
可匹配的通讯录示例：${formatHuixunDirectoryHint()}。
调用本工具即进入「呈请领导人确认」：须等领导人口头或页面确认后才会真正发出，不要只写草稿。`,
    {
      recipients: z
        .array(z.string())
        .min(1)
        .describe('收件人列表，可用姓名、角色或部门。必须包含全体参会人及领导人（陈厅长），如「陈厅长」「王主任」'),
      title: z.string().describe('通知标题，如「人员调度会参会通知」'),
      content: z
        .string()
        .describe('通知正文，含时间、地点/会议方式、议题、会前准备与回复确认要求'),
      backgroundBrief: z
        .string()
        .optional()
        .describe('知识管理专家整理的《xxx会议资料》全文，将附在通知后发给每位收件人（含领导人）'),
      briefingTitle: z
        .string()
        .optional()
        .describe('资料标题，须为书名号格式，如《人员调度会会议资料》'),
      agenda: z
        .string()
        .optional()
        .describe('会议管理专家起草的《xxx会议议程》全文，须原样附在通知中发给每位收件人（含领导人）'),
      agendaTitle: z
        .string()
        .optional()
        .describe('议程标题，须为书名号格式，如《人员调度会会议议程》'),
      meetingTime: z.string().optional().describe('会议时间，如 今日 14:00'),
      location: z.string().optional().describe('地点或会议方式，如 总部三楼会议室 / 腾讯会议'),
    },
    async (args) => {
      const draft = args as HuixunNoticeInput
      onEmit?.({
        type: 'agent_progress',
        agentId,
        agentName,
        summary: '通知与议程已拟就，呈请领导人确认后再发出',
      })

      const decision = onEmit
        ? await awaitLeaderDispatchConfirm({
            onEvent: onEmit,
            agentId,
            agentName,
            draft,
          })
        : { approved: true as const }

      if (!decision.approved) {
        const why =
          decision.reason === 'timeout'
            ? '等候领导人确认超时，会议通知与议程未发出'
            : '领导人未确认，会议通知与议程未发出'
        onEmit?.({
          type: 'tool_done',
          agentId,
          agentName,
          toolName: HUIXUN_TOOL_NAME,
          toolLabel: '汇讯 · 发送会议通知',
          summary: why,
          ok: false,
        })
        return {
          content: [{ type: 'text' as const, text: why }],
          isError: true,
        }
      }

      onEmit?.({
        type: 'tool_start',
        agentId,
        agentName,
        toolName: HUIXUN_TOOL_NAME,
        toolLabel: '汇讯 · 发送会议通知',
        summary: `领导人已确认，正在通过汇讯通知：${args.recipients.join('、')}${
          args.agenda ? '（附会议议程）' : ''
        }${args.backgroundBrief ? '（附会议资料）' : ''}`,
      })

      const result: HuixunNoticeResult = await sendHuixunMeetingNotice(args)

      onEmit?.({
        type: 'tool_done',
        agentId,
        agentName,
        toolName: HUIXUN_TOOL_NAME,
        toolLabel: '汇讯 · 发送会议通知',
        summary: result.summary,
        ok: result.ok,
        recipients: result.delivered.map((d) => d.name),
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result as unknown as Record<string, unknown>,
        isError: !result.ok,
      }
    },
  )

  return createSdkMcpServer({
    name: HUIXUN_MCP_SERVER,
    version: '1.0.0',
    tools: [sendMeetingNotice],
  })
}
