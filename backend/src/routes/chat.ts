import { Hono } from 'hono'
import { createSseStream } from '../lib/sse.js'
import { runChairmanOrchestrator } from '../agents/chairmanOrchestrator.js'
import type { PlanItem } from '../agents/prompts.js'

export const chatRoute = new Hono()

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
