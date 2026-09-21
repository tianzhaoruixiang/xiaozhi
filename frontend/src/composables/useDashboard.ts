import { onMounted, onUnmounted, ref } from 'vue'
import { createInitialData, refreshDashboardData } from '../mock/dashboard'
import type { DashboardData, ViewMode } from '../types/dashboard'

const VIEW_SEQUENCE: ViewMode[] = ['overview', 'groups', 'opinion', 'tasks']

export function useDashboard() {
  const data = ref<DashboardData>(createInitialData())
  const viewMode = ref<ViewMode>('overview')
  const now = ref(new Date())
  let dataTimer: number | undefined
  let viewTimer: number | undefined

  onMounted(() => {
    dataTimer = window.setInterval(() => {
      data.value = refreshDashboardData(data.value)
      now.value = new Date()
    }, 1000)

    viewTimer = window.setInterval(() => {
      const currentIndex = VIEW_SEQUENCE.indexOf(viewMode.value)
      viewMode.value = VIEW_SEQUENCE[(currentIndex + 1) % VIEW_SEQUENCE.length]!
    }, 10_000)
  })

  onUnmounted(() => {
    if (dataTimer) window.clearInterval(dataTimer)
    if (viewTimer) window.clearInterval(viewTimer)
  })

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  return {
    data,
    viewMode,
    now,
    setViewMode,
  }
}
