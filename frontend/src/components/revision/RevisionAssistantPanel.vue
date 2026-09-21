<script setup lang="ts">
import { ref } from 'vue'
import { CircleCheck, Files, MagicStick, Promotion } from '@element-plus/icons-vue'
import AIAssistantAvatar from '../AIAssistantAvatar.vue'
import type {
  RevisionActivity,
  RevisionAssistantTask,
  RevisionSource,
} from '../../types/revision'

defineProps<{
  currentTask: RevisionAssistantTask
  activities: RevisionActivity[]
  sources: RevisionSource[]
  assistantReply: string
}>()

const emit = defineEmits<{
  command: [text: string]
}>()

const command = ref('')

const send = (preset?: string) => {
  const value = preset ?? command.value
  if (!value.trim()) return
  emit('command', value)
  command.value = ''
}
</script>

<template>
  <aside class="panel-frame revision-assistant" aria-labelledby="revision-assistant-title">
    <header class="revision-assistant-header">
      <AIAssistantAvatar label="统稿会议助手书记员头像" />
      <div>
        <h2 id="revision-assistant-title">会议助手</h2>
        <p>仅处理会议已形成的决议</p>
      </div>
      <span class="assistant-online"><i />持续核对中</span>
    </header>

    <section class="revision-ai-task" aria-live="polite">
      <div class="task-title-row">
        <span class="panel-icon"><el-icon><MagicStick /></el-icon></span>
        <div>
          <small>当前工作</small>
          <strong>{{ currentTask.title }}</strong>
        </div>
      </div>
      <p>{{ currentTask.detail }}</p>
      <div class="assistant-workflow" aria-label="助手工作步骤">
        <span class="done"><i>✓</i>决议归章</span>
        <span class="done"><i>✓</i>冲突与缺项</span>
        <span class="active"><i />生成定稿</span>
      </div>
    </section>

    <section class="revision-source-section">
      <div class="right-section-title">
        <span><el-icon><Files /></el-icon>支撑依据</span>
        <small>{{ sources.length }} 类材料</small>
      </div>
      <ul class="revision-source-list">
        <li v-for="source in sources" :key="source.id">
          <span>{{ source.type }}</span>
          <div><strong>{{ source.title }}</strong><small>关联 {{ source.matched }} 处修订</small></div>
        </li>
      </ul>
      <p class="source-boundary-note">历史案例与规范仅用于校核决议，不会自动生成新的方案修改。</p>
    </section>

    <section class="revision-activity-section">
      <div class="right-section-title">
        <span><el-icon><CircleCheck /></el-icon>工作动态</span>
        <small>自动更新</small>
      </div>
      <div class="revision-activity-list">
        <article v-for="activity in activities.slice(0, 3)" :key="activity.id" :class="activity.type">
          <i />
          <div><strong>{{ activity.title }}</strong><p>{{ activity.detail }}</p></div>
          <time>{{ activity.time }}</time>
        </article>
      </div>
    </section>

    <section class="assistant-command">
      <div class="assistant-reply"><span>智</span><p>{{ assistantReply }}</p></div>
      <div class="quick-commands">
        <button @click="send('汇总当前统稿进度')">汇总进度</button>
        <button @click="send('检查决议冲突与责任缺项')">冲突检查</button>
        <button @click="send('调整4.2 安检通道高峰时段通行表述')">补充表述</button>
      </div>
      <div class="command-input">
        <input v-model="command" placeholder="补充会议决议表述或查询依据…" @keyup.enter="send()" />
        <button aria-label="发送指令" @click="send()"><el-icon><Promotion /></el-icon></button>
      </div>
    </section>
  </aside>
</template>
