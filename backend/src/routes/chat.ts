import { Hono } from 'hono'
import { createSseStream } from '../lib/sse.js'
import { runChairmanOrchestrator } from '../agents/chairmanOrchestrator.js'
import type { PlanItem } from '../agents/prompts.js'
import {
  classifyConfirmUtterance,
  resolveLeaderConfirm,
} from '../lib/leaderConfirm.js'

export const chatRoute = new Hono()

chatRoute.post('/confirm', async (c) => {
  let body: {
    confirmId?: string
    approved?: boolean
    utterance?: string
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: '无效的 JSON 请求体' }, 400)
  }

  const confirmId = body.confirmId?.trim()
  if (!confirmId) {
    return c.json({ error: 'confirmId 不能为空' }, 400)
  }

  let approved = body.approved
  let reason: 'click' | 'oral' = 'click'
  if (typeof approved !== 'boolean') {
    const kind = classifyConfirmUtterance(body.utterance || '')
    if (kind === 'unknown') {
      return c.json({
        ok: false,
        pending: true,
        hint: '请口头说「确认发出」或「先不发」，也可点击页面按钮。',
      })
    }
    approved = kind === 'approve'
    reason = 'oral'
  }

  const ok = resolveLeaderConfirm(confirmId, {
    approved,
    utterance: body.utterance,
    reason,
  })
  if (!ok) {
    return c.json({ error: '确认已失效或已处理' }, 404)
  }
  return c.json({ ok: true, approved })
})

chatRoute.post('/', async (c) => {
  let body: {
    message?: string
    plans?: PlanItem[]
    team?: string
    workflow?: string
    mode?: string
    /** 默认 true；猎头工作台传 false 关闭口述汇报 */
    enableOralReport?: boolean
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: '无效的 JSON 请求体' }, 400)
  }

  const message = body.message?.trim()
  if (!message) {
    return c.json({ error: 'message 不能为空' }, 400)
  }

  const { stream, send, close } = createSseStream()

  ;(async () => {
    try {
      await runChairmanOrchestrator({
        message,
        plans: body.plans,
        team: body.team,
        workflow: body.workflow,
        mode: body.mode,
        enableOralReport: body.enableOralReport !== false,
        onEvent: send,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '服务异常'
      send({ type: 'error', message: msg })
    } finally {
      close()
    }
  })()

  return c.newResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})
