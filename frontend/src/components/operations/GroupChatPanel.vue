<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Bell, ChatLineRound, DocumentAdd, FolderOpened, Promotion, UserFilled } from '@element-plus/icons-vue'
import robotAvatar from '../../assets/ai-security-assistant.png'
import type { ChatMessage, OperationGroup, OperationTask } from '../../types/operations'

const props = defineProps<{
  group?: OperationGroup
  messages: ChatMessage[]
  pinnedTask?: OperationTask
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
  'create-task': []
  feedback: []
  report: []
  action: [message: ChatMessage, action: string]
}>()

const messageScroll = ref<HTMLElement>()
const inputModel = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const kindTitle: Record<ChatMessage['kind'], string> = {
  text: '', system: '协同通知', task: '任务卡', feedback: '任务反馈', alert: '异常提醒', report: '日报草稿',
}

watch(() => props.messages.length, async () => {
  await nextTick()
  if (messageScroll.value) messageScroll.value.scrollTop = messageScroll.value.scrollHeight
})
</script>

<template>
  <section class="panel-frame operation-chat">
    <header class="operation-chat-head">
      <div class="room-identity">
        <span :style="{ '--group-color': group?.color }">{{ group?.name.slice(0, 1) }}</span>
        <div><h2>{{ group?.name }}作战群</h2><p>{{ group?.onlineCount }}人在线 · {{ group?.lead }}负责 · 作战助手已加入</p></div>
      </div>
      <div class="room-state"><i />消息与任务实时同步</div>
    </header>

    <div v-if="pinnedTask" class="pinned-operation">
      <el-icon><Bell /></el-icon>
      <div><small>当前置顶任务</small><strong>{{ pinnedTask.title }}</strong></div>
      <span>{{ pinnedTask.owner }} · {{ pinnedTask.deadline }}</span>
      <b>{{ pinnedTask.progress }}%</b>
    </div>

    <div ref="messageScroll" class="operation-message-scroll" aria-live="polite">
      <div class="chat-time-divider"><span>今日 · 任务下发后</span></div>
      <article
        v-for="message in messages"
        :key="message.id"
        class="operation-message"
        :class="[`kind-${message.kind}`, { assistant: message.isAssistant }]"
      >
        <span v-if="message.isAssistant" class="message-avatar robot" role="img" aria-label="作战助手机器人头像">
          <img :src="robotAvatar" alt="" />
          <i class="ai-avatar-status" aria-hidden="true" />
        </span>
        <span v-else class="message-avatar">{{ message.avatar }}</span>
        <div class="message-body">
          <header><strong>{{ message.sender }}</strong><span>{{ message.role }}</span><time>{{ message.time }}</time></header>

          <div v-if="message.kind === 'text'" class="message-bubble">
            <p>{{ message.content }}</p>
            <div v-if="message.tags?.length" class="message-tags"><span v-for="tag in message.tags" :key="tag">{{ tag }}</span></div>
          </div>

          <div v-else-if="message.kind === 'system'" class="message-system"><span>{{ message.content }}</span></div>

          <div v-else class="operation-message-card">
            <div class="message-card-heading">
              <span>{{ kindTitle[message.kind] }}</span>
              <em v-if="message.isAssistant">作战助手生成</em>
            </div>
            <h3>{{ message.title }}</h3>
            <p>{{ message.content }}</p>
            <div v-if="message.progress !== undefined" class="message-card-progress"><i><b :style="{ width: `${message.progress}%` }" /></i><span>{{ message.progress }}%</span></div>
            <div v-if="message.tags?.length" class="message-tags"><span v-for="tag in message.tags" :key="tag">{{ tag }}</span></div>
            <footer>
              <div><span>{{ message.meta }}</span><small v-if="message.source">{{ message.source }}</small></div>
              <div v-if="message.actions?.length" class="message-card-actions">
                <button v-for="action in message.actions" :key="action" type="button" @click="emit('action', message, action)">{{ action }}</button>
              </div>
            </footer>
          </div>
        </div>
      </article>
    </div>

    <footer class="operation-composer">
      <div class="composer-shortcuts">
        <button type="button" @click="emit('create-task')"><el-icon><DocumentAdd /></el-icon>下发任务</button>
        <button type="button" @click="emit('feedback')"><el-icon><ChatLineRound /></el-icon>提交反馈</button>
        <button type="button" @click="emit('report')"><el-icon><FolderOpened /></el-icon>生成日报</button>
        <span><el-icon><UserFilled /></el-icon>可输入 @作战助手 发出协同指令</span>
      </div>
      <div class="composer-input">
        <textarea v-model="inputModel" rows="1" placeholder="输入消息，或 @作战助手 下发协同指令" @keydown.enter.exact.prevent="emit('send')" />
        <button type="button" :disabled="!modelValue.trim()" @click="emit('send')"><el-icon><Promotion /></el-icon>发送</button>
      </div>
    </footer>
  </section>
</template>
