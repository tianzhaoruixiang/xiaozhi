import { formatAttendeeStatusHint, listProxyAttendees } from '../data/attendeeStatus.js'
import { chatCompletion } from './openaiCompatible.js'
import { arabicToSpoken, toChineseInteger } from './spokenChinese.js'

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

口吻：恭敬、口语、短句。厅长工作台口述最多 1 到 2 句，只说结果。

硬性要求：
1. 必须根据「本轮领导指示」和「专家实际结论」来写，结论从材料中提炼，禁止编造未出现的会议时间、会议室、参会人、通知结果。
2. 禁止套用固定模板（例如不管问什么都汇报「人员调度会时间地点参会人」、材料齐套、请盯办）。
3. 领导若只是问今日安排/重点事项：口述今日要点即可，不要谈预定会议室或发通知。
4. 领导若交代办会/通知/预定：口述只要一句结果，口径为「会议已通知到相关人员，其中由×位外出领导授权数智助手参会。」不要再报时间、地点、议程、资料齐套。人数按参会状态里外出代参会人数如实说（两位说「两」）。
5. 时间必须用中文读法，严禁出现 14:00、9:30 这类阿拉伯数字冒号时间（语音会读错）。只说「十四点整」「九点三十分」「九月二十二日」。数量、房号同样改成汉字。
6. 办会通知类口述不要加「请您指示」。不要「首先其次另外」铺陈。

本轮领导指示参考：${userMessage?.trim() || '（见用户消息）'}

参会状态（仅在本轮涉及参会/通知时按需引用，勿强行插入）：
${formatAttendeeStatusHint()}
`
}

export function briefWithOralPrompt(): string {
  return `你是「智枢」，领导助手。各专业子智能体已按你的调度完成工作，现在向领导做最终汇报。

先给出简要书面纪要（Markdown），再给出【口述汇报】纯文本（供语音朗读）。

## 书面纪要
- 紧扣本轮领导指示与专家真实结论；最多 5 条，每条一行
- 结论与关键动作；风险提醒（如有）
- 未发生的事项不要写

## 口述汇报
（可直接朗读的口语，不要用 Markdown）
- 办会/通知类只要一句：会议已通知到相关人员，其中由×位外出领导授权数智助手参会
- 不要报会议室、时间、议程、材料齐套、盯办事项，不要「请您指示」
- 其他任务最多 2 句；根据本轮实际结果现写
- 时间、日期、数量一律用汉字读法；严禁 14:00 / 9:30 这种写法
- 禁止套固定「人员调度会三板斧」空话
- 材料里没有的时间/地点/名单不要编`
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
  return arabicToSpoken(
    text
      .replace(/^【口述汇报】\s*/m, '')
      .replace(/^#+\s*口述汇报\s*/im, '')
      .replace(/[#*`>_]/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim(),
  )
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
    return arabicToSpoken(
      `领导，您好。本轮协同已完成，要点如下：${clipped} 请您指示。`,
    )
  }

  return arabicToSpoken(
    `领导，您好。关于「${options.userMessage || '您的指示'}」，本轮已处理完毕，详细结论请见书面纪要。请您指示。`,
  )
}

/**
 * 办会/发通知完成后的口述口径：只报通知到位与外出授权代参会。
 */
export function buildDispatchNoticeOral(): string {
  const n = listProxyAttendees().length
  if (n <= 0) return '会议已通知到相关人员。'
  const countWord = n === 2 ? '两' : toChineseInteger(n)
  return `会议已通知到相关人员，其中由${countWord}位外出领导授权数智助手参会。`
}

function isDispatchNoticeRound(ctx: OralReportContext): boolean {
  const asked = /准备.{0,8}会|组织.{0,8}会|调度会|发(送)?通知|汇讯|参会通知|预定.{0,6}会议|预订.{0,6}会议/.test(
    ctx.userMessage.replace(/\s+/g, ''),
  )
  return asked
}

/**
 * 快路径：抽【口述汇报】→ 文本压缩兜底。
 * 默认不再二次调 LLM（避免书面稿流完后空等十几秒）。
 */
export async function resolveOralReport(
  ctx: OralReportContext,
): Promise<{ oral: string; source: 'section' | 'llm' | 'fallback' }> {
  if (isDispatchNoticeRound(ctx)) {
    return { oral: buildDispatchNoticeOral(), source: 'section' }
  }

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
