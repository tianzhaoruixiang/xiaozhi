<script setup lang="ts">
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ data: number[] }>()
const chartEl = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

const render = () => {
  if (!chart) return
  chart.setOption({
    animationDuration: 420,
    grid: { left: 4, right: 4, top: 10, bottom: 4 },
    xAxis: { type: 'category', boundaryGap: false, show: false, data: props.data.map((_, i) => i) },
    yAxis: { type: 'value', min: 0, max: 100, show: false },
    series: [{
      type: 'line',
      data: props.data,
      smooth: 0.45,
      symbol: 'none',
      lineStyle: { color: '#37e6ff', width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(55,230,255,.42)' },
          { offset: 1, color: 'rgba(55,230,255,0)' },
        ]),
      },
    }],
  })
}

const resize = () => chart?.resize()

onMounted(() => {
  if (!chartEl.value) return
  chart = echarts.init(chartEl.value)
  render()
  window.addEventListener('resize', resize)
})

watch(() => props.data, render, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})
</script>

<template><div ref="chartEl" class="assistant-chart" /></template>
