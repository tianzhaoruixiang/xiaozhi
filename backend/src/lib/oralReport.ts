import { formatAttendeeStatusHint } from '../data/attendeeStatus.js'
import { chatCompletion } from './openaiCompatible.js'

export interface OralReportContext {
  userMessage: string
  /** 书面纪要或主编排最终文本 */
  briefText?: string
  /** 各专家结论拼接 */
  expertOutputs?: string
  /** 今日安排等上下文 */
  contextBlock?: string
  /**
   * 是否允许再调一次 LLM 生口述（默认 false）。
   * 书面纪要里已要求模型写【口述汇报】，二次生成会造成「输出完很久才开播」。
   */
  allowLlmRewrite?: boolean
}

/**
 * 口述汇报提示：按本轮真实任务与专家结论生成，禁止套固定会议稿。
 */
export function oralReportSystemPrompt(userMessage?: string): string {
  return `你是「智枢」，领导身边的政务助手。全体（或本轮）智能体工作已结束，你要向领导做「语音口述汇报」。

只输出可直接朗读的纯中文，不要 Markdown、不要标题符号、不要代码块、不要英文缩写堆砌。

口吻：恭敬、口语、短句；可用「首先 / 其次 / 另外」；时间读成「十四点」这类说法。

硬性要求：
1. 必须根据「本轮领导指示」和「专家实际结论」来写，结论从材料中提炼，禁止编造未出现的会议时间、会议室、参会人、通知结果。
2. 禁止套用固定模板（例如不管问什么都汇报「人员调度会时间地点参会人」）。
3. 领导若只是问今日安排/重点事项：口述今日要点即可，不要谈预定会议室或发通知。
4. 领导若交代办会/通知/预定：才汇报本轮实际办成的时间、地点、通知、外出代参会等；材料没有的就说「尚未明确」或略过，不要用默认假数据填空。
5. 结尾一句请领导指示。

本轮领导指示参考：${userMessage?.trim() || '（见用户消息）'}

参会状态（仅在本轮涉及参会/通知时按需引用，勿强行插入）：
${formatAttendeeStatusHint()}
`
}

export function briefWithOralPrompt(): string {
  return `你是「智枢」，领导助手。各专业子智能体已按你的调度完成工作，现在向领导做最终汇报。

先给出简要书面纪要（Markdown），再给出【口述汇报】纯文本（供语音朗读）。

## 书面纪要
- 紧扣本轮领导指示与专家真实结论
- 结论与关键动作；风险提醒（如有）
- 未发生的事项不要写

## 口述汇报
（可直接朗读的口语，不要用 Markdown）
- 根据本轮实际结果现写，结构随任务变化
- 禁止套固定「人员调度会三板斧」空话
- 材料里没有的时间/地点/名单不要编
- 结尾请领导指示`
}

/**
 * 由模型生成本轮口述汇报（慢路径，默认不用）。
 */
export async function generateOralReport(
  ctx: OralReportContext,
): Promise<string> {
  const userParts = [
    ctx.contextBlock ? `【上下文】\n${ctx.contextBlock}` : '',
    `【本轮领导指示】\n${ctx.userMessage}`,
    ctx.briefText ? `【书面纪要/最终文本】\n${ctx.briefText}` : '',
    ctx.expertOutputs ? `【专家结论】\n${ctx.expertOutputs}` : '',
    '请只输出口述汇报正文，不要再写【口述汇报】标题。',
  ]
    .filter(Boolean)
    .join('\n\n')

  const raw = await chatCompletion({
    messages: [
      { role: 'system', content: oralReportSystemPrompt(ctx.userMessage) },
      { role: 'user', content: userParts },
    ],
    temperature: 0.45,
    timeoutMs: 12000,
  })

  return cleanOralText(raw)
}

export function extractOralSection(text: string): string {
  if (!text) return ''
  const patterns = [
    /【口述汇报】\s*([\s\S]*)$/,
    /##\s*口述汇报\s*([\s\S]*)$/i,
    /###\s*口述汇报\s*([\s\S]*)$/i,
    /口述汇报[：:\s]\s*([\s\S]*)$/,
  ]
  for (const re of patterns) {
    const section = text.match(re)?.[1]?.trim()
    if (section && cleanOralText(section).length >= 8) {
      return cleanOralText(section)
    }
  }
  return ''
}

export function cleanOralText(text: string): string {
  return text
    .replace(/^【口述汇报】\s*/m, '')
    .replace(/^#+\s*口述汇报\s*/im, '')
    .replace(/[#*`>_]/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * 去掉书面纪要中的【口述汇报】段落，仅保留书面正文。
 */
export function stripOralSection(briefText: string): string {
  return briefText
    .replace(/\n*【口述汇报】[\s\S]*$/g, '')
    .replace(/\n*##\s*口述汇报[\s\S]*$/gi, '')
    .replace(/\n*###\s*口述汇报[\s\S]*$/gi, '')
    .trim()
}

/**
 * 仅当模型不可用时的最后兜底：从真实文本压缩，不填会议假数据。
 */
export function buildOralReportFallback(options: {
  briefText?: string
  expertOutputs?: string
  userMessage?: string
}): string {
  // 优先去掉书面部分，只留可读口语感的压缩
  const brief = options.briefText || ''
  const withoutOralHeading = stripOralSection(brief)
  const source = [withoutOralHeading, options.expertOutputs]
    .filter(Boolean)
    .join(' ')
    .replace(/[#*`>_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const clipped =
    source.length > 220 ? `${source.slice(0, 220)}……` : source

  if (clipped) {
    return `领导，您好。本轮协同已完成，要点如下：${clipped} 请您指示。`
  }

  return `领导，您好。关于「${options.userMessage || '您的指示'}」，本轮已处理完毕，详细结论请见书面纪要。请您指示。`
}

/**
 * 快路径：抽【口述汇报】→ 文本压缩兜底。
 * 默认不再二次调 LLM（避免书面稿流完后空等十几秒）。
 */
export async function resolveOralReport(
  ctx: OralReportContext,
): Promise<{ oral: string; source: 'section' | 'llm' | 'fallback' }> {
  const fromSection = extractOralSection(ctx.briefText || '')
  if (fromSection && fromSection.length >= 8) {
    return { oral: fromSection, source: 'section' }
  }

  if (ctx.allowLlmRewrite) {
    try {
      const oral = await generateOralReport(ctx)
      if (oral && oral.length >= 8) {
        return { oral, source: 'llm' }
      }
    } catch {
      // fall through
    }
  }

  return {
    oral: buildOralReportFallback({
      briefText: ctx.briefText,
      expertOutputs: ctx.expertOutputs,
      userMessage: ctx.userMessage,
    }),
    source: 'fallback',
  }
}
