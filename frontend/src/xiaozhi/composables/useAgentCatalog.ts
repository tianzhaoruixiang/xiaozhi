import { onMounted, ref } from 'vue'

export interface CatalogAgent {
  name: string
  displayName: string
  role: string
  description: string
  capabilities: string[]
  avatar?: string
}

export interface CatalogTeam {
  name: string
  displayName: string
  description: string
  agents: string[]
  defaultWorkflow?: string
}

export interface CatalogWorkflow {
  name: string
  displayName: string
  description: string
  steps: Array<{ agent: string; title?: string; dependsOn: string[] }>
}

export interface AgentCatalogSummary {
  root: string
  mode: string
  agents: CatalogAgent[]
  teams: CatalogTeam[]
  workflows: CatalogWorkflow[]
}

export function useAgentCatalog() {
  const catalog = ref<AgentCatalogSummary | null>(null)
  const selectedTeam = ref('')
  const selectedWorkflow = ref('')
  const selectedMode = ref<'hybrid' | 'config' | 'dynamic'>('hybrid')
  const loadError = ref<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/agents/catalog')
      if (!res.ok) throw new Error(`加载失败 ${res.status}`)
      const data = (await res.json()) as AgentCatalogSummary
      catalog.value = data
      // 默认「智能识别」，避免普通聊天仍套会议工作流
      if (!selectedTeam.value) selectedTeam.value = ''
      if (!selectedWorkflow.value) selectedWorkflow.value = ''
      if (
        data.mode === 'hybrid' ||
        data.mode === 'config' ||
        data.mode === 'dynamic'
      ) {
        selectedMode.value = data.mode
      }
      loadError.value = null
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : '无法加载专家配置'
    }
  }

  const onTeamChange = (teamName: string) => {
    selectedTeam.value = teamName
    if (!teamName) {
      selectedWorkflow.value = ''
      return
    }
    const team = catalog.value?.teams.find((t) => t.name === teamName)
    if (team?.defaultWorkflow) selectedWorkflow.value = team.defaultWorkflow
  }

  onMounted(() => {
    void load()
  })

  return {
    catalog,
    selectedTeam,
    selectedWorkflow,
    selectedMode,
    loadError,
    load,
    onTeamChange,
  }
}
