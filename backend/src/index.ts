import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chatRoute } from './routes/chat.js'
import { agentsRoute } from './routes/agents.js'
import { ttsRoute } from './routes/tts.js'
import { hrbpRoute } from './routes/hrbp.js'
import { meetingSessionsRoute } from './routes/meetingSessions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })
config({ path: resolve(__dirname, '../.env') })

const app = new Hono()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)

app.get('/health', (c) => c.json({ ok: true, service: 'xiaozhi-api' }))
app.route('/api/chat', chatRoute)
app.route('/api/agents', agentsRoute)
app.route('/api/tts', ttsRoute)
app.route('/api/hrbp', hrbpRoute)
app.route('/api/meeting-sessions', meetingSessionsRoute)

const port = Number(process.env.PORT || 3000)

// 本地叠包验证标记：仅启动日志文案，无逻辑变更
serve({ fetch: app.fetch, port }, () => {
  console.log(`[xiaozhi-api] 离线叠包构建已生效 · listening on http://127.0.0.1:${port}`)
})
