export interface HuixunContact {
  id: string
  name: string
  role: string
  dept: string
  /** 额外匹配词，如「领导人」→ 陈厅长 */
  aliases?: string[]
}

/** 演示用组织通讯录：角色/部门 → 汇讯账号 */
export const HUIXUN_DIRECTORY: HuixunContact[] = [
  {
    id: 'hx-dir-01',
    name: '陈厅长',
    role: '厅长',
    dept: '厅领导',
    aliases: ['领导人', '领导', '厅长'],
  },
  { id: 'hx-off-01', name: '王主任', role: '办公室主任', dept: '市政府办公室' },
  { id: 'hx-off-02', name: '李秘书', role: '综合秘书', dept: '市政府办公室' },
  { id: 'hx-em-01', name: '赵处长', role: '应急管理局处长', dept: '应急管理局' },
  { id: 'hx-hr-01', name: '周科长', role: '人社局科长', dept: '人力资源和社会保障局' },
  { id: 'hx-dr-01', name: '张可信', role: '发改委项目负责人', dept: '发展和改革委员会' },
  { id: 'hx-hb-01', name: '孙处长', role: '住建局处长', dept: '住房和城乡建设局' },
  { id: 'hx-fin-01', name: '吴科长', role: '财政局科长', dept: '财政局' },
  { id: 'hx-law-01', name: '郑干事', role: '法制办干事', dept: '司法局（法制）' },
]

export interface HuixunNoticeInput {
  recipients: string[]
  title: string
  content: string
  meetingTime?: string
  location?: string
  /** 知识管理专家汇编的《xxx会议资料》全文 */
  backgroundBrief?: string
  /** 资料标题，如《人员调度会会议资料》 */
  briefingTitle?: string
  /** 会议管理专家起草的《xxx会议议程》全文 */
  agenda?: string
  /** 议程标题，如《人员调度会会议议程》 */
  agendaTitle?: string
}

export interface HuixunDelivery {
  contactId: string
  name: string
  role: string
  status: 'sent' | 'simulated' | 'failed'
  detail?: string
}

export interface HuixunNoticeResult {
  ok: boolean
  mode: 'live' | 'simulated'
  messageId?: string
  title: string
  delivered: HuixunDelivery[]
  unresolved: string[]
  summary: string
}

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, '')
}

/** 按姓名 / 角色 / 部门模糊匹配汇讯联系人 */
export function resolveHuixunContacts(recipients: string[]): {
  matched: HuixunContact[]
  unresolved: string[]
} {
  const matched: HuixunContact[] = []
  const unresolved: string[] = []
  const seen = new Set<string>()

  for (const raw of recipients) {
    const key = normalize(raw)
    if (!key) continue

    const hits = HUIXUN_DIRECTORY.filter((c) => {
      const fields = [c.name, c.role, c.dept, c.id, ...(c.aliases ?? [])].map(
        normalize,
      )
      return fields.some((f) => f.includes(key) || key.includes(f))
    })

    if (!hits.length) {
      unresolved.push(raw)
      continue
    }

    for (const hit of hits) {
      if (seen.has(hit.id)) continue
      seen.add(hit.id)
      matched.push(hit)
    }
  }

  return { matched, unresolved }
}

export function getHuixunConfig() {
  const enabled = (process.env.HUIXUN_ENABLED || '').toLowerCase() === 'true'
  const baseURL = (process.env.HUIXUN_BASE_URL || '').replace(/\/+$/, '')
  const appId = process.env.HUIXUN_APP_ID || process.env.HUIXUN_APP_KEY || ''
  const appSecret =
    process.env.HUIXUN_APP_SECRET || process.env.HUIXUN_TOKEN || ''
  const sendPath = process.env.HUIXUN_SEND_PATH || '/api/message/send'

  return {
    enabled: enabled && Boolean(baseURL),
    baseURL,
    appId,
    appSecret,
    sendPath,
  }
}

async function postLiveNotice(
  input: HuixunNoticeInput,
  contacts: HuixunContact[],
): Promise<{ messageId: string; deliveries: HuixunDelivery[] }> {
  const cfg = getHuixunConfig()
  const url = `${cfg.baseURL}${cfg.sendPath.startsWith('/') ? '' : '/'}${cfg.sendPath}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cfg.appId ? { 'X-App-Id': cfg.appId } : {}),
      ...(cfg.appSecret ? { Authorization: `Bearer ${cfg.appSecret}` } : {}),
    },
    body: JSON.stringify({
      toUserIds: contacts.map((c) => c.id),
      toUsers: contacts.map((c) => ({ id: c.id, name: c.name })),
      title: input.title,
      content: input.content,
      backgroundBrief: input.backgroundBrief,
      briefingTitle: input.briefingTitle,
      agenda: input.agenda,
      agendaTitle: input.agendaTitle,
      meetingTime: input.meetingTime,
      location: input.location,
      msgType: 'meeting_notice',
      source: 'xiaozhi-liaison-agent',
    }),
  })

  const bodyText = await response.text().catch(() => '')
  if (!response.ok) {
    throw new Error(
      `汇讯接口失败（${response.status}）${bodyText ? `: ${bodyText.slice(0, 200)}` : ''}`,
    )
  }

  let messageId = `hx-${Date.now()}`
  try {
    const json = JSON.parse(bodyText) as { messageId?: string; msg_id?: string; id?: string }
    messageId = json.messageId || json.msg_id || json.id || messageId
  } catch {
    // plain text ok
  }

  return {
    messageId,
    deliveries: contacts.map((c) => ({
      contactId: c.id,
      name: c.name,
      role: c.role,
      status: 'sent' as const,
    })),
  }
}

/**
 * 联络助手调用：通过汇讯向相关人员发送会议通知（可附带背景资料）。
 * 未配置 HUIXUN_ENABLED=true + HUIXUN_BASE_URL 时走模拟投递，便于本地演示。
 */
export async function sendHuixunMeetingNotice(
  input: HuixunNoticeInput,
): Promise<HuixunNoticeResult> {
  const title = input.title.trim()
  const background = input.backgroundBrief?.trim()
  const briefingTitle = input.briefingTitle?.trim() || '会议资料'
  const agenda = input.agenda?.trim()
  const agendaTitle = input.agendaTitle?.trim() || '会议议程'
  const baseContent = input.content.trim()
  let content = baseContent
  if (agenda) {
    content += `\n\n────────\n【${agendaTitle}】\n${agenda}`
  }
  if (background) {
    content += `\n\n────────\n【${briefingTitle}】\n${background}`
  }
  const recipients = input.recipients.map((r) => r.trim()).filter(Boolean)

  if (!title || !content || !recipients.length) {
    return {
      ok: false,
      mode: 'simulated',
      title: title || '（无标题）',
      delivered: [],
      unresolved: recipients,
      summary: '汇讯通知缺少标题、正文或收件人，未发送',
    }
  }

  const payload: HuixunNoticeInput = {
    ...input,
    title,
    content,
    backgroundBrief: background,
    briefingTitle: background ? briefingTitle : undefined,
    agenda,
    agendaTitle: agenda ? agendaTitle : undefined,
  }

  const { matched, unresolved } = resolveHuixunContacts(recipients)
  if (!matched.length) {
    return {
      ok: false,
      mode: 'simulated',
      title,
      delivered: [],
      unresolved,
      summary: `未能在汇讯通讯录中解析收件人：${unresolved.join('、') || '无'}`,
    }
  }

  const cfg = getHuixunConfig()
  const extras = [agenda ? '会议议程' : '', background ? '会议资料' : '']
    .filter(Boolean)
    .join('、')
  const withBg = extras ? `（含${extras}）` : ''

  if (cfg.enabled) {
    try {
      const live = await postLiveNotice(payload, matched)
      const names = live.deliveries.map((d) => d.name).join('、')
      return {
        ok: true,
        mode: 'live',
        messageId: live.messageId,
        title,
        delivered: live.deliveries,
        unresolved,
        summary: `已通过汇讯实发会议通知${withBg}「${title}」→ ${names}${
          unresolved.length ? `；未匹配：${unresolved.join('、')}` : ''
        }`,
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : '未知错误'
      return {
        ok: false,
        mode: 'live',
        title,
        delivered: matched.map((c) => ({
          contactId: c.id,
          name: c.name,
          role: c.role,
          status: 'failed' as const,
          detail,
        })),
        unresolved,
        summary: `汇讯实发失败：${detail}`,
      }
    }
  }

  const deliveries: HuixunDelivery[] = matched.map((c) => ({
    contactId: c.id,
    name: c.name,
    role: c.role,
    status: 'simulated' as const,
    detail: extras
      ? `本地模拟投递（含${extras}）`
      : '本地模拟投递（未启用 HUIXUN_ENABLED）',
  }))

  const names = deliveries.map((d) => `${d.name}（${d.role}）`).join('、')
  return {
    ok: true,
    mode: 'simulated',
    messageId: `sim-${Date.now()}`,
    title,
    delivered: deliveries,
    unresolved,
    summary: `联络助手已通过汇讯工具模拟通知${withBg}「${title}」→ ${names}${
      unresolved.length ? `；未匹配：${unresolved.join('、')}` : ''
    }`,
  }
}

export function formatHuixunDirectoryHint(): string {
  return HUIXUN_DIRECTORY.map((c) => `${c.name}/${c.role}/${c.dept}`).join('；')
}

function extractTitledSection(
  text: string,
  suffix: '会议议程' | '会议资料',
): { title: string; body: string } | undefined {
  const match = text.match(new RegExp(`《([^》\\n]{2,40}${suffix})》`))
  if (!match || match.index == null) return undefined
  const title = match[0]
  const after = text.slice(match.index)
  const nextHeading = after.search(/\n##\s+(?!《)/)
  const body = (nextHeading >= 0 ? after.slice(0, nextHeading) : after).trim()
  return { title, body }
}

/** 从前序专家结论中提取《xxx会议议程》 */
export function extractMeetingAgenda(text: string) {
  return extractTitledSection(text, '会议议程')
}

/** 从前序专家结论中提取《xxx会议资料》 */
export function extractMeetingMaterials(text: string) {
  return extractTitledSection(text, '会议资料')
}
