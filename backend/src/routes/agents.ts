import { Hono } from 'hono'
import { loadAgentCatalog } from '../config/agentCatalog.js'
import { listConfigSummary } from '../config/resolvePlan.js'

export const agentsRoute = new Hono()

agentsRoute.get('/catalog', (c) => {
  loadAgentCatalog(true)
  return c.json(listConfigSummary())
})
