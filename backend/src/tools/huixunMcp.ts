import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import {
  formatHuixunDirectoryHint,
  sendHuixunMeetingNotice,
  type HuixunNoticeResult,
} from './huixun.js'
import type { SsePayload } from '../lib/sse.js'

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
}) {
  const agentId = options?.agentId ?? 'liaison-expert'
  const onEmit = options?.onEmit

  const sendMeetingNotice = tool(
    HUIXUN_TOOL_NAME,
    `通过政务汇讯（WiseUC）向相关部门人员发送会议通知。
可匹配的通讯录示例：${formatHuixunDirectoryHint()}。
需要通知参会人时必须调用本工具，不要只写草稿。`,
    {
      recipients: z
        .array(z.string())
        .min(1)
        .describe('收件人列表，可用姓名、角色或部门，如「陈秘书」「战略投资部负责人」'),
      title: z.string().describe('通知标题，如「人员调度会参会通知」'),
      content: z
        .string()
        .describe('通知正文，含时间、地点/会议方式、议题、会前准备与回复确认要求'),
      backgroundBrief: z
        .string()
        .optional()
        .describe('知识助手整理的会议背景资料，将附在通知后发给每位收件人'),
      meetingTime: z.string().optional().describe('会议时间，如 今日 14:00'),
      location: z.string().optional().describe('地点或会议方式，如 总部三楼会议室 / 腾讯会议'),
    },
    async (args) => {
      onEmit?.({
        type: 'tool_start',
        agentId,
        agentName: '联络助手',
        toolName: HUIXUN_TOOL_NAME,
        toolLabel: '汇讯 · 发送会议通知',
        summary: `正在通过汇讯通知：${args.recipients.join('、')}${
          args.backgroundBrief ? '（附背景资料）' : ''
        }`,
      })

      const result: HuixunNoticeResult = await sendHuixunMeetingNotice(args)

      onEmit?.({
        type: 'tool_done',
        agentId,
        agentName: '联络助手',
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
