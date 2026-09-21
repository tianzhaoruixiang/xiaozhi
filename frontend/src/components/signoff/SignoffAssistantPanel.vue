<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ArrowRight, Bell, CircleCheck, Document, FolderOpened, MagicStick, WarningFilled } from '@element-plus/icons-vue'
import AIAssistantAvatar from '../AIAssistantAvatar.vue'
import type { SignoffActivity, SignoffAssistantTask, SignoffDepartment, SignoffMaterial, SignoffOpinion } from '../../types/signoff'

defineProps<{
  currentTask: SignoffAssistantTask
  activities: SignoffActivity[]
  opinion: SignoffOpinion | null
  department?: SignoffDepartment
  materials: SignoffMaterial[]
  selectedMaterialId: string
  selectedMaterial?: SignoffMaterial
  signedCount: number
  totalCount: number
  progress: number
}>()

const emit = defineEmits<{
  remind: [departmentId: string]
  'select-material': [materialId: string]
  'complete-all': []
}>()

const materialDrawerVisible = ref(false)

const openMaterial = async (materialId: string) => {
  emit('select-material', materialId)
  await nextTick()
  materialDrawerVisible.value = true
}
</script>

<template>
  <aside class="panel-frame signoff-assistant" aria-labelledby="signoff-assistant-title">
    <header class="signoff-assistant-head">
      <AIAssistantAvatar label="会签会议助手书记员头像" />
      <div><h2 id="signoff-assistant-title">会议助手</h2><p>持续跟踪审阅状态</p></div>
      <span class="assistant-online"><i />运行中</span>
    </header>

    <section class="signoff-materials" aria-labelledby="signoff-materials-title">
      <div class="right-section-title">
        <span id="signoff-materials-title"><el-icon><FolderOpened /></el-icon>会议材料</span>
        <small>{{ materials.length }} 份 · 会签查阅</small>
      </div>

      <div class="signoff-material-list">
        <button
          v-for="material in materials"
          :key="material.id"
          type="button"
          :class="{ active: selectedMaterialId === material.id }"
          aria-haspopup="dialog"
          @click="openMaterial(material.id)"
        >
          <span class="signoff-material-icon"><el-icon><Document /></el-icon></span>
          <span class="signoff-material-copy">
            <strong>{{ material.title }}</strong>
            <small>{{ material.kind }} · {{ material.meta }}</small>
          </span>
          <span class="signoff-material-status">{{ material.status }}</span>
          <el-icon class="signoff-material-arrow"><ArrowRight /></el-icon>
        </button>
      </div>
    </section>

    <el-drawer
      v-model="materialDrawerVisible"
      direction="rtl"
      size="34rem"
      append-to-body
      class="signoff-material-drawer"
      modal-class="signoff-material-drawer-overlay"
    >
      <template #header>
        <div v-if="selectedMaterial" class="drawer-material-head">
          <span><el-icon><FolderOpened /></el-icon>会议材料查阅</span>
          <h2>{{ selectedMaterial.title }}</h2>
          <p>{{ selectedMaterial.kind }} · {{ selectedMaterial.meta }} · {{ selectedMaterial.status }}</p>
        </div>
      </template>

      <article v-if="selectedMaterial" class="drawer-material-content">
        <div class="drawer-material-notice">
          <el-icon><Document /></el-icon>
          <span>会签查阅副本</span>
          <small>内容与会议定稿同步</small>
        </div>
        <section v-for="section in selectedMaterial.sections" :key="section.title">
          <h3>{{ section.title }}</h3>
          <ul><li v-for="item in section.items" :key="item">{{ item }}</li></ul>
        </section>
      </article>
    </el-drawer>

    <section class="signoff-current-task" aria-live="polite">
      <div><span class="panel-icon"><el-icon><MagicStick /></el-icon></span><div><small>当前工作</small><strong>{{ currentTask.title }}</strong></div></div>
      <p>{{ currentTask.detail }}</p>
      <div class="signoff-meter"><span :style="{ width: `${progress}%` }" /></div>
      <footer><span>会签进度</span><strong>{{ signedCount }} / {{ totalCount }} 单位</strong></footer>
    </section>

    <section v-if="opinion && opinion.status === 'open'" class="assistant-opinion-summary">
      <header><span><el-icon><WarningFilled /></el-icon>意见影响分析</span><b>中等影响</b></header>
      <p>该意见只补充执行触发条件，不改变缓冲区总体部署和作战组职责。</p>
      <ul><li>影响条文：{{ opinion.section }}</li><li>影响任务：现场安保组外围缓冲区布设</li><li>无需重新发起其他单位会签</li></ul>
    </section>

    <section class="signoff-timeline">
      <div class="right-section-title"><span><el-icon><CircleCheck /></el-icon>会签动态</span><small>实时</small></div>
      <article v-for="activity in activities.slice(0, 4)" :key="activity.id" :class="activity.type">
        <i /><div><strong>{{ activity.title }}</strong><p>{{ activity.detail }}</p></div><time>{{ activity.time }}</time>
      </article>
    </section>

    <footer class="signoff-assistant-actions">
      <button
        v-if="department && department.status !== 'signed'"
        type="button"
        class="remind-button"
        @click="$emit('remind', department.id)"
      ><el-icon><Bell /></el-icon>提醒当前单位处理</button>
      <button type="button" class="simulate-button" @click="$emit('complete-all')">同步演示单位返回的签章</button>
      <p class="signoff-boundary-note">会议助手仅汇总、校验和提醒，会签必须由各责任单位确认。</p>
    </footer>
  </aside>
</template>
