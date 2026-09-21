import { onMounted, onUnmounted, ref } from 'vue'
import { createInitialData, refreshDashboardData } from '../mock/dashboard'
import type { DashboardData, ViewMode } from '../types/dashboard'

export function useDashboard() {
  const data = ref<DashboardData>(createInitialData())
  const viewMode = ref<ViewMode>('overview')
  const now = ref(new Date())
  let timer: number | undefined

  onMounted(() => {
    timer = window.setInterval(() => {
      data.value = refreshDashboardData(data.value)
      now.value = new Date()
    }, 1000)
  })

  onUnmounted(() => {
    if (timer) window.clearInterval(timer)
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
