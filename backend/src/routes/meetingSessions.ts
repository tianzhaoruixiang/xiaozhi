import { Hono } from 'hono'

type Session = Record<string, unknown>

const sessions = new Map<string, Session>()

function mergeSession(id: string, patch: Session): Session {
  const prev = sessions.get(id) ?? {
    scene: 'security-summit',
    title: '大型会议保障动员会',
    eventName: '大型会议保障动员会',
    startTime: '2026年09月20日 10:00',
    endTime: '',
    location: '市局联合指挥中心',
    chair: '',
    participants: [],
    agenda: [],
    materials: [],
    groups: [],
    tasks: [],
    noticeReceipt: { delivered: [] },
    planVersion: '',
    signoffRecordId: '',
    status: 'draft',
  }
  return {
    ...prev,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  }
}

export const meetingSessionsRoute = new Hono()

meetingSessionsRoute.get('/:id', (c) => {
  const id = c.req.param('id')
  const existing = sessions.get(id)
  if (!existing) return c.json({ error: 'not found' }, 404)
  return c.json(existing)
})

meetingSessionsRoute.patch('/:id', async (c) => {
  const id = c.req.param('id')
  let patch: Session = {}
  try {
    patch = (await c.req.json()) as Session
  } catch {
    return c.json({ error: '无效 JSON' }, 400)
  }
  const next = mergeSession(id, patch)
  sessions.set(id, next)
  return c.json(next)
})
