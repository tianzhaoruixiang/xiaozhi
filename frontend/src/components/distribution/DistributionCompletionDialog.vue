<script setup lang="ts">
import { ArrowRight, CircleCheckFilled, DataLine, House, UserFilled } from '@element-plus/icons-vue'
import type { DistributionGroup } from '../../types/distribution'

defineProps<{
  visible: boolean
  group?: DistributionGroup
  taskCount: number
  materialCount: number
  groupCount: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  workbench: []
  operations: []
  dashboard: []
}>()
</script>

<template>
  <el-dialog
    :model-value="visible"
    width="46rem"
    class="security-dialog distribution-completion-dialog"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    align-center
    @update:model-value="emit('update:visible', $event)"
  >
    <section class="completion-summary">
      <el-icon><CircleCheckFilled /></el-icon>
      <div>
        <span>任务下发完成</span>
        <h2>安保动员会已结束</h2>
        <p>{{ taskCount }} 项任务、{{ materialCount }} 份材料已送达 {{ groupCount }} 个工作组。</p>
      </div>
    </section>

    <div class="completion-destination-title">
      <strong>接下来去哪里？</strong>
      <span>您可以随时从工作台再次进入本次任务</span>
    </div>

    <div class="completion-options" role="list" aria-label="会议结束后的操作">
      <button type="button" class="completion-option" role="listitem" @click="emit('dashboard')">
        <span class="completion-option-icon"><el-icon><DataLine /></el-icon></span>
        <span class="completion-option-copy">
          <strong>查看态势大屏</strong>
          <small>掌握各工作组进度和整体态势</small>
        </span>
        <el-icon class="completion-option-arrow"><ArrowRight /></el-icon>
      </button>

      <button type="button" class="completion-option recognized" role="listitem" @click="emit('operations')">
        <span class="completion-option-icon"><el-icon><UserFilled /></el-icon></span>
        <span class="completion-option-copy">
          <em>已识别您的工作组</em>
          <strong>进入{{ group?.name ?? '组队' }}协同</strong>
          <small>{{ group ? `${group.department} · ${group.responsibility}` : '查看群聊、任务和共享材料' }}</small>
        </span>
        <el-icon class="completion-option-arrow"><ArrowRight /></el-icon>
      </button>

      <button type="button" class="completion-option" role="listitem" @click="emit('workbench')">
        <span class="completion-option-icon"><el-icon><House /></el-icon></span>
        <span class="completion-option-copy">
          <strong>回到工作台</strong>
          <small>查看个人任务、提醒和后续安排</small>
        </span>
        <el-icon class="completion-option-arrow"><ArrowRight /></el-icon>
      </button>
    </div>
  </el-dialog>
</template>

<style scoped>
:global(.distribution-completion-dialog) {
  border: 1px solid var(--line-strong);
  border-radius: 0.75rem;
  background: oklch(0.18 0.045 246);
  box-shadow: 0 1.5rem 4rem rgb(0 0 0 / 0.42);
}

:global(.distribution-completion-dialog .el-dialog__header) {
  display: none;
}

:global(.distribution-completion-dialog .el-dialog__body) {
  padding: 1.75rem;
}

.completion-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 0 1.375rem;
  border-bottom: 1px solid var(--line);
}

.completion-summary > .el-icon {
  flex: 0 0 auto;
  width: 3.25rem;
  height: 3.25rem;
  color: var(--green);
  font-size: 3.25rem;
  filter: drop-shadow(0 0 0.75rem oklch(0.76 0.17 162 / 0.26));
}

.completion-summary span {
  color: var(--green);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.completion-summary h2 {
  margin: 0.2rem 0 0.3rem;
  color: var(--text);
  font-size: 1.375rem;
}

.completion-summary p,
.completion-destination-title span {
  margin: 0;
  color: var(--muted);
  font-size: 0.8125rem;
}

.completion-destination-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 1.25rem 0 0.75rem;
}

.completion-destination-title strong {
  color: var(--text);
  font-size: 0.875rem;
}

.completion-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.completion-option {
  position: relative;
  display: flex;
  min-height: 9.25rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 0.625rem;
  color: var(--text);
  background: oklch(0.15 0.04 246 / 0.74);
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.completion-option:hover,
.completion-option:focus-visible {
  border-color: var(--cyan);
  background: oklch(0.23 0.055 235 / 0.88);
  outline: none;
  transform: translateY(-0.125rem);
}

.completion-option.recognized {
  border-color: oklch(0.73 0.14 214 / 0.65);
  background: linear-gradient(145deg, oklch(0.25 0.075 228 / 0.9), oklch(0.19 0.055 246 / 0.96));
  box-shadow: inset 0 0 0 1px oklch(0.73 0.14 214 / 0.08);
}

.completion-option-icon {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border-radius: 0.5rem;
  color: var(--cyan);
  background: oklch(0.72 0.14 214 / 0.12);
  font-size: 1.125rem;
}

.completion-option-copy {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.completion-option-copy em {
  color: var(--cyan);
  font-size: 0.625rem;
  font-style: normal;
}

.completion-option-copy strong {
  font-size: 0.9375rem;
  line-height: 1.3;
}

.completion-option-copy small {
  color: var(--muted);
  font-size: 0.6875rem;
  line-height: 1.55;
}

.completion-option-arrow {
  position: absolute;
  right: 0.875rem;
  bottom: 0.875rem;
  color: var(--quiet);
}

@media (max-width: 760px) {
  :global(.distribution-completion-dialog) {
    width: calc(100vw - 2rem) !important;
  }

  .completion-options {
    grid-template-columns: 1fr;
  }

  .completion-option {
    min-height: auto;
  }

  .completion-destination-title span {
    display: none;
  }
}
</style>
