/**
 * 领导意图分流：办会工作流 vs 猎头寻访/沟通 vs 日程问询 vs 智枢直接作答
 */

export type IntentKind = 'direct' | 'schedule_query' | 'workflow'

/** 可识别的配置路由（专家团 / 工作流） */
export type ConfigRouteKind =
  | 'personnel-dispatch'
  | 'domain-expert-sourcing'
  | 'online-communication'
  | 'offline-meetup'

const SCHEDULE_QUERY_RE =
  /今天重点|今日重点|重要事项|今日安排|今天安排|工作安排|日程一览|待办一览|今日待办|今天有哪些|今日有哪些|安排概况|工作概况/

/** 人员调度会 / 政务办会 */
const DISPATCH_RE =
  /会议|开会|会商|调度会|预备会|预定|预订|会议室|会场|通知|汇讯|参会|召集|组织会|准备会|安排会|发通知|厅长日程|出席安排|背景资料|档案汇编/

const FORCE_DISPATCH_RE =
  /准备.{0,8}会|组织.{0,8}会|预定.{0,6}会议|预订.{0,6}会议|发(送)?通知|汇讯通知|召集.{0,8}人/

/** 猎头 · 领域专家寻访 */
const SOURCING_RE =
  /寻访|挖人|找候选人|候选人|短名单|小红书|领英|linkedin|脉脉|领域专家|推荐领域|人选经营|猎头|建联|简历|专家画像|找.{0,16}专家|推荐.{0,12}专家/

/** 猎头 · 线上沟通 */
const ONLINE_RE =
  /线上沟通|线上面谈|线上约谈|线上电话|视频面试|视频沟通|电话沟通|腾讯会议|zoom|线上会议安排|沟通话术/

/** 猎头 · 线下沟通邀约 */
const OFFLINE_RE =
  /线下沟通|线下邀约|邀请线下|当面沟通|约见面|线下见面|线下接待|到场指引|线下约谈/

/**
 * 「现在几点了」→ direct
 * 「今天重点事项」→ schedule_query
 * 「准备人员调度会并通知」→ workflow（人员调度会）
 * 「帮我找推荐领域专家」→ workflow（领域专家寻访）
 * 「准备线上沟通」→ workflow（线上沟通）
 * 「邀请线下沟通」→ workflow（线下沟通邀约）
 */
export function classifyIntent(message: string): IntentKind {
  const t = normalize(message)
  if (!t) return 'direct'

  if (
    FORCE_DISPATCH_RE.test(t) ||
    SOURCING_RE.test(t) ||
    ONLINE_RE.test(t) ||
    OFFLINE_RE.test(t)
  ) {
    return 'workflow'
  }
  if (SCHEDULE_QUERY_RE.test(t)) return 'schedule_query'
  if (DISPATCH_RE.test(t) && !isLikelyStatusQuery(t)) return 'workflow'
  return 'direct'
}

/** 问询状态，不是去办会 */
function isLikelyStatusQuery(t: string): boolean {
  return /有没有|是否|几点|现在|在哪|哪些|什么时候|怎么样|进展|情况/.test(t)
}

function normalize(message: string): string {
  return message.replace(/\s+/g, '').trim()
}

/**
 * 根据用户输入智能识别应走的专家团（及对应默认工作流名）。
 * 前端传了 team 时由上层优先使用，此处只做「智能识别」。
 */
export function matchConfigRoute(message: string): ConfigRouteKind | null {
  const t = normalize(message)
  if (!t) return null

  const online = ONLINE_RE.test(t)
  const offline = OFFLINE_RE.test(t)
  const sourcing = SOURCING_RE.test(t)
  const dispatch = FORCE_DISPATCH_RE.test(t) || DISPATCH_RE.test(t)

  // 更具体的沟通场景优先
  if (online && !offline) return 'online-communication'
  if (offline && !online) return 'offline-meetup'
  if (online && offline) {
    // 同时命中时：含「线下/当面/到场」偏线下，否则偏线上
    return /线下|当面|到场|邀约/.test(t)
      ? 'offline-meetup'
      : 'online-communication'
  }

  if (sourcing && !dispatch) return 'domain-expert-sourcing'
  if (dispatch && !sourcing) return 'personnel-dispatch'

  if (sourcing) return 'domain-expert-sourcing'
  if (dispatch) return 'personnel-dispatch'
  return null
}

export function intentLabel(kind: IntentKind): string {
  switch (kind) {
    case 'schedule_query':
      return '日程问询（智枢答复今日安排）'
    case 'workflow':
      return '协同任务（启用专家团工作流）'
    default:
      return '普通问题（智枢调度执行）'
  }
}

/** 兼容旧 chat 命名 */
export function isGeneralInquiry(kind: IntentKind): boolean {
  return kind === 'direct' || kind === 'schedule_query'
}
