import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from './frontmatter.js'
import {
  normalizeCapabilities,
  type CapabilityId,
} from '../agents/experts.js'

export interface AgentDefinitionFile {
  /** Claude Code name / subagent_type */
  name: string
  description: string
  /** 中文展示名 */
  displayName: string
  /** 一句话职责 */
  role: string
  /** 系统提示（markdown body） */
  prompt: string
  /** 本项目能力挂载 */
  capabilities: CapabilityId[]
  /** 可选头像预设 id */
  avatar?: string
  /** 原始 tools 声明（文档用） */
  tools?: string[]
  model?: string
  color?: string
  filePath: string
}

export interface TeamDefinition {
  name: string
  displayName: string
  description: string
  /** 成员 agent name 列表 */
  agents: string[]
  defaultWorkflow?: string
  filePath: string
}

export interface WorkflowStepDef {
  agent: string
  title?: string
  objective?: string
  /** 支持 {{message}} {{shortMessage}} */
  objectiveTemplate?: string
  dependsOn?: string[]
}

export interface WorkflowDefinition {
  name: string
  displayName: string
  description: string
  goalTemplate?: string
  steps: WorkflowStepDef[]
  filePath: string
}

export interface AgentCatalog {
  root: string
  agents: AgentDefinitionFile[]
  teams: TeamDefinition[]
  workflows: WorkflowDefinition[]
}

function findClaudeRoot(): string {
  if (process.env.AGENT_CONFIG_ROOT) {
    return resolve(process.env.AGENT_CONFIG_ROOT)
  }
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(process.cwd(), '.claude'),
    resolve(process.cwd(), '..', '.claude'),
    resolve(here, '../../../../.claude'),
    resolve(here, '../../../.claude'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return resolve(process.cwd(), '.claude')
}

function readJsonFile<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return null
  }
}

function loadAgents(agentsDir: string): AgentDefinitionFile[] {
  if (!existsSync(agentsDir)) return []
  const files = readdirSync(agentsDir).filter(
    (f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md',
  )
  const out: AgentDefinitionFile[] = []
  for (const file of files) {
    const filePath = join(agentsDir, file)
    const raw = readFileSync(filePath, 'utf8')
    const { data, body } = parseFrontmatter(raw)
    const name = String(data.name ?? basename(file, '.md'))
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
    if (!name || !body) continue
    const description = String(data.description ?? '').trim()
    const displayName = String(
      data.displayName ?? data['display-name'] ?? name,
    ).trim()
    const role = String(data.role ?? description).trim()
    const capsRaw = data.capabilities ?? data.capability
    const capabilities = normalizeCapabilities(
      Array.isArray(capsRaw)
        ? capsRaw
        : typeof capsRaw === 'string'
          ? capsRaw.split(/[,\s]+/)
          : [],
    )
    const tools = Array.isArray(data.tools)
      ? data.tools.map(String)
      : undefined
    out.push({
      name,
      description: description || `${displayName} 专业子智能体`,
      displayName,
      role: role || displayName,
      prompt: body,
      capabilities,
      avatar: data.avatar ? String(data.avatar) : undefined,
      tools,
      model: data.model ? String(data.model) : undefined,
      color: data.color ? String(data.color) : undefined,
      filePath,
    })
  }
  return out
}

function loadTeams(dir: string): TeamDefinition[] {
  if (!existsSync(dir)) return []
  const out: TeamDefinition[] = []
  for (const f of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    const filePath = join(dir, f)
    const raw = readJsonFile<Record<string, unknown>>(filePath)
    if (!raw) continue
    const name = String(raw.name ?? basename(f, '.json'))
    const agents = Array.isArray(raw.agents) ? raw.agents.map(String) : []
    if (!name || !agents.length) continue
    out.push({
      name,
      displayName: String(raw.displayName ?? name),
      description: String(raw.description ?? ''),
      agents,
      defaultWorkflow: raw.defaultWorkflow
        ? String(raw.defaultWorkflow)
        : undefined,
      filePath,
    })
  }
  return out
}

function loadWorkflows(dir: string): WorkflowDefinition[] {
  if (!existsSync(dir)) return []
  const out: WorkflowDefinition[] = []
  for (const f of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    const filePath = join(dir, f)
    const raw = readJsonFile<Record<string, unknown>>(filePath)
    if (!raw) continue
    const name = String(raw.name ?? basename(f, '.json'))
    const stepsRaw = Array.isArray(raw.steps) ? raw.steps : []
    const steps: WorkflowStepDef[] = []
    for (const s of stepsRaw) {
      if (!s || typeof s !== 'object') continue
      const row = s as Record<string, unknown>
      const agent = String(row.agent ?? '').trim()
      if (!agent) continue
      steps.push({
        agent,
        title: row.title ? String(row.title) : undefined,
        objective: row.objective ? String(row.objective) : undefined,
        objectiveTemplate: row.objectiveTemplate
          ? String(row.objectiveTemplate)
          : undefined,
        dependsOn: Array.isArray(row.dependsOn)
          ? row.dependsOn.map(String)
          : [],
      })
    }
    if (!name || !steps.length) continue
    out.push({
      name,
      displayName: String(raw.displayName ?? name),
      description: String(raw.description ?? ''),
      goalTemplate: raw.goalTemplate ? String(raw.goalTemplate) : undefined,
      steps,
      filePath,
    })
  }
  return out
}

let cache: AgentCatalog | null = null

export function loadAgentCatalog(force = false): AgentCatalog {
  if (cache && !force) return cache
  const root = findClaudeRoot()
  cache = {
    root,
    agents: loadAgents(join(root, 'agents')),
    teams: loadTeams(join(root, 'teams')),
    workflows: loadWorkflows(join(root, 'workflows')),
  }
  return cache
}

export function getAgentByName(
  name: string,
  catalog = loadAgentCatalog(),
): AgentDefinitionFile | undefined {
  return catalog.agents.find((a) => a.name === name)
}

export function getTeamByName(
  name: string,
  catalog = loadAgentCatalog(),
): TeamDefinition | undefined {
  return catalog.teams.find((t) => t.name === name)
}

export function getWorkflowByName(
  name: string,
  catalog = loadAgentCatalog(),
): WorkflowDefinition | undefined {
  return catalog.workflows.find((w) => w.name === name)
}

export type OrchestrationMode = 'config' | 'dynamic' | 'hybrid'

export function resolveOrchestrationMode(
  requested?: string,
): OrchestrationMode {
  const raw = (requested || process.env.XIAOZHI_ORCHESTRATION || 'hybrid')
    .toLowerCase()
    .trim()
  if (raw === 'config' || raw === 'dynamic' || raw === 'hybrid') return raw
  return 'hybrid'
}
