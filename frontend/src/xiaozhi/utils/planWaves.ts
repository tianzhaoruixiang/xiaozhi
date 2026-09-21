import type { PlanTaskItem } from '../types/assistant'

/** 按 dependsOn 将规划项分层，同层可并行 */
export function buildPlanWaves(items: PlanTaskItem[]): PlanTaskItem[][] {
  if (!items.length) return []
  const byId = new Map(items.map((i) => [i.agentId, i]))
  const remaining = new Set(items.map((i) => i.agentId))
  const resolved = new Set<string>()
  const waves: PlanTaskItem[][] = []
  let guard = 0

  while (remaining.size && guard < items.length + 2) {
    guard += 1
    const ready = [...remaining].filter((id) => {
      const item = byId.get(id)!
      const deps = item.dependsOn ?? []
      return deps.every((d) => resolved.has(d) || !byId.has(d))
    })

    if (!ready.length) {
      const fallback = remaining.values().next().value as string
      ready.push(fallback)
    }

    const wave = ready
      .map((id) => byId.get(id)!)
      .sort((a, b) => a.index - b.index)
    waves.push(wave)
    for (const item of wave) {
      remaining.delete(item.agentId)
      resolved.add(item.agentId)
    }
  }

  return waves
}

export function countParallelSlots(waves: PlanTaskItem[][]): number {
  return waves.filter((w) => w.length > 1).length
}
