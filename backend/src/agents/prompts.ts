export interface PlanItem {
  id: string
  time: string
  title: string
  detail: string
  priority: string
  status: string
}

export function formatPlansContext(plans: PlanItem[] = []): string {
  if (!plans.length) return '（暂无计划数据）'
  return plans
    .map(
      (p, i) =>
        `${i + 1}. [${p.time}] ${p.title}（优先级:${p.priority}，状态:${p.status}）— ${p.detail}`,
    )
    .join('\n')
}

export {
  CAPABILITY_HINT,
  ORCHESTRATOR_SYSTEM,
  CHAIRMAN_LEADER_REPLY,
  XIAOZHI_BRIEF_PROMPT,
  XIAOZHI_SYSTEM,
  buildClaudeAgentsFromRoster,
  buildExecutionWaves,
  fallbackDynamicPlan,
  formatPriorOutputs,
  normalizeCapabilities,
  parseXiaozhiPlan,
  slugifyExpertId,
  xiaozhiPlannerSystemPrompt,
  type CapabilityId,
  type DynamicExpert,
  type DynamicPlan,
} from './experts.js'
