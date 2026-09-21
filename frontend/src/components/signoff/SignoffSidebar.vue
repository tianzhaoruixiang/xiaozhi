<script setup lang="ts">
import { computed } from 'vue'
import { Stamp } from '@element-plus/icons-vue'
import type { SignoffDepartment } from '../../types/signoff'

const props = defineProps<{
  departments: SignoffDepartment[]
  selectedDepartmentId: string
  progress: number
}>()

defineEmits<{ select: [departmentId: string] }>()

const statusText = { signed: '已会签', pending: '待会签', objection: '有意见' }
const nextPending = computed(() => props.departments.find((department) => department.status !== 'signed'))
</script>

<template>
  <aside class="panel-frame signoff-sidebar" aria-label="会签单位">
    <header class="signoff-sidebar-head">
      <span class="panel-icon"><el-icon><Stamp /></el-icon></span>
      <div><h2>会签单位</h2><p>按责任单位确认定稿</p></div>
      <strong>{{ progress }}%</strong>
    </header>
    <div class="revision-progress"><span :style="{ width: `${progress}%` }" /></div>

    <nav class="signer-list" aria-label="会签单位列表">
      <button
        v-for="department in departments"
        :key="department.id"
        type="button"
        :class="[department.status, { active: selectedDepartmentId === department.id }]"
        :aria-current="selectedDepartmentId === department.id ? 'true' : undefined"
        @click="$emit('select', department.id)"
      >
        <span class="signer-order">{{ String(department.order).padStart(2, '0') }}</span>
        <span class="signer-copy">
          <strong>{{ department.name }}</strong>
          <small>{{ department.signer }} · {{ department.role }}</small>
        </span>
        <span class="signer-status"><i />{{ statusText[department.status] }}</span>
      </button>
    </nav>

    <footer class="signoff-sidebar-foot">
      <span>下一处理单位</span>
      <strong>{{ nextPending?.name ?? '全部单位已完成' }}</strong>
      <small>{{ nextPending ? `${nextPending.signer} · ${nextPending.role}` : '可以生成最终会签记录' }}</small>
    </footer>
  </aside>
</template>

