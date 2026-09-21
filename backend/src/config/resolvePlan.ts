import {
  getAgentByName,
  getTeamByName,
  getWorkflowByName,
  loadAgentCatalog,
  resolveOrchestrationMode,
  type OrchestrationMode,
  type WorkflowDefinition,
} from './agentCatalog.js'
import type { DynamicExpert, DynamicPlan } from '../agents/experts.js'
import {
  classifyIntent,
  intentLabel,
  isGeneralInquiry,
  matchConfigRoute,
  type IntentKind,
} from '../lib/intentRouter.js'

function fillTemplate(
  template: string,
  vars: { message: string; shortMessage: string },
): string {
  return template
    .replaceAll('{{message}}', vars.message)
    .replaceAll('{{shortMessage}}', vars.shortMessage)
}

/**
 * 智能识别专家团 / 工作流：
 * 1. 前端显式传入优先
 * 2. 否则按输入语义匹配（寻访 / 人员调度会）
 * 3. 再回退环境变量与目录首项
 */
export function resolveTeamWorkflow(options: {
  message: string
  team?: string
  workflow?: string
}): { team?: string; workflow?: string; matched: boolean; routeLabel: string } {
  const catalog = loadAgentCatalog()
  const explicitTeam = options.team?.trim() || ''
  const explicitWorkflow = options.workflow?.trim() || ''

  if (explicitTeam || explicitWorkflow) {
    const team = explicitTeam
      ? getTeamByName(explicitTeam, catalog)
      : undefined
    const workflowName =
      explicitWorkflow || team?.defaultWorkflow || ''
    return {
      team: explicitTeam || undefined,
      workflow: workflowName || undefined,
      matched: true,
      routeLabel: explicitTeam
        ? `指定专家团「${team?.displayName || explicitTeam}」`
        : `指定工作流「${explicitWorkflow}」`,
    }
  }

  const route = matchConfigRoute(options.message)
  if (route) {
    const team = getTeamByName(route, catalog)
    const workflowName = team?.defaultWorkflow || route
    return {
      team: team?.name || route,
      workflow: workflowName,
      matched: true,
      routeLabel: `智能识别「${team?.displayName || route}」`,
    }
  }

  const fallbackTeam =
    process.env.XIAOZHI_DEFAULT_TEAM || catalog.teams[0]?.name || ''
  const team = fallbackTeam ? getTeamByName(fallbackTeam, catalog) : undefined
  const fallbackWorkflow =
    process.env.XIAOZHI_DEFAULT_WORKFLOW ||
    team?.defaultWorkflow ||
    catalog.workflows[0]?.name ||
    ''

  return {
    team: team?.name,
    workflow: fallbackWorkflow || undefined,
    matched: false,
    routeLabel: team
      ? `默认专家团「${team.displayName}」`
      : '未匹配到专家团',
  }
}

/**
 * 根据专家团 + 工作流生成可执行 DynamicPlan（Claude Code 配置驱动）
 */
export function buildPlanFromConfig(options: {
  message: string
  team?: string
  workflow?: string
}): DynamicPlan | null {
  const catalog = loadAgentCatalog()
  if (!catalog.agents.length) return null

  const resolved = resolveTeamWorkflow(options)
  const team = resolved.team
    ? getTeamByName(resolved.team, catalog)
    : undefined
  const workflowName =
    resolved.workflow ||
    team?.defaultWorkflow ||
    process.env.XIAOZHI_DEFAULT_WORKFLOW ||
    catalog.workflows[0]?.name
  const workflow = workflowName
    ? getWorkflowByName(workflowName, catalog)
    : undefined

  if (!workflow) return null

  return workflowToPlan(workflow, options.message, team?.agents)
}

export function workflowToPlan(
  workflow: WorkflowDefinition,
  message: string,
  teamAgentFilter?: string[],
): DynamicPlan {
  const shortMessage =
    message.length > 36 ? `${message.slice(0, 36)}…` : message
  const vars = { message, shortMessage }
  const allow = teamAgentFilter ? new Set(teamAgentFilter) : null

  const experts: DynamicExpert[] = []
  for (const step of workflow.steps) {
    if (allow && !allow.has(step.agent)) continue
    const def = getAgentByName(step.agent)
    if (!def) continue

    const objective =
      (step.objectiveTemplate
        ? fillTemplate(step.objectiveTemplate, vars)
        : step.objective) ||
      `围绕「${shortMessage}」完成本职工作：${def.role}`

    experts.push({
      id: def.name,
      name: def.displayName,
      role: def.role,
      title: step.title || def.role,
      objective,
      prompt: def.prompt,
      capabilities: def.capabilities,
      dependsOn: (step.dependsOn ?? []).filter(
        (d) => !allow || allow.has(d),
      ),
    })
  }

  const ids = new Set(experts.map((e) => e.id))
  for (const e of experts) {
    e.dependsOn = e.dependsOn.filter((d) => ids.has(d))
  }

  const goal = workflow.goalTemplate
    ? fillTemplate(workflow.goalTemplate, vars)
    : `按工作流「${workflow.displayName}」协同完成领导交办`

  return { goal, experts }
}

export function listConfigSummary() {
  const catalog = loadAgentCatalog(true)
  return {
    root: catalog.root,
    mode: resolveOrchestrationMode(),
    agents: catalog.agents.map((a) => ({
      name: a.name,
      displayName: a.displayName,
      role: a.role,
      description: a.description,
      capabilities: a.capabilities,
      avatar: a.avatar,
    })),
    teams: catalog.teams.map((t) => ({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      agents: t.agents,
      defaultWorkflow: t.defaultWorkflow,
    })),
    workflows: catalog.workflows.map((w) => ({
      name: w.name,
      displayName: w.displayName,
      description: w.description,
      steps: w.steps.map((s) => ({
        agent: s.agent,
        title: s.title,
        dependsOn: s.dependsOn ?? [],
      })),
    })),
  }
}

export function pickPlanSource(options: {
  message: string
  team?: string
  workflow?: string
  mode?: string
}): {
  mode: OrchestrationMode
  plan: DynamicPlan | null
  reason: string
  intent: IntentKind
  intentText: string
  routeLabel?: string
} {
  const mode = resolveOrchestrationMode(options.mode)
  const intent = classifyIntent(options.message)
  const intentText = intentLabel(intent)

  // 普通问题 / 日程问询：不走配置专家团（config 模式除外）
  if (isGeneralInquiry(intent) && mode !== 'config') {
    return {
      mode,
      plan: null,
      reason: 'xiaozhi-direct',
      intent,
      intentText,
    }
  }

  if (mode === 'dynamic') {
    return { mode, plan: null, reason: 'dynamic', intent, intentText }
  }

  const allowConfigWorkflow =
    mode === 'config' ||
    intent === 'workflow' ||
    Boolean(options.team?.trim())

  if (!allowConfigWorkflow) {
    return {
      mode,
      plan: null,
      reason: 'xiaozhi-direct',
      intent,
      intentText,
    }
  }

  const resolved = resolveTeamWorkflow({
    message: options.message,
    team: options.team,
    workflow: options.workflow,
  })

  const plan = buildPlanFromConfig({
    message: options.message,
    team: resolved.team,
    workflow: resolved.workflow,
  })

  if (plan?.experts.length) {
    return {
      mode,
      plan,
      reason: mode === 'config' ? 'config' : 'hybrid-config',
      intent,
      intentText,
      routeLabel: resolved.routeLabel,
    }
  }

  if (mode === 'config') {
    return {
      mode,
      plan: null,
      reason: 'config-missing',
      intent,
      intentText,
      routeLabel: resolved.routeLabel,
    }
  }

  return {
    mode,
    plan: null,
    reason: 'xiaozhi-direct',
    intent,
    intentText,
    routeLabel: resolved.routeLabel,
  }
}
