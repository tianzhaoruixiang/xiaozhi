<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Check, Microphone, Mute, VideoCamera } from '@element-plus/icons-vue'
import AIAssistantAvatar from './AIAssistantAvatar.vue'
import type { Participant, TranscriptEntry } from '../types/meeting'
import { getAvatar } from '../utils/avatars'

const props = defineProps<{
  participants: Participant[]
  transcripts: TranscriptEntry[]
  activeSpeaker: Participant
  liveDraft: string
  isRunning: boolean
  meSigned: boolean
  meetingDone: boolean
}>()

const emit = defineEmits<{
  'toggle-running': []
  'sign-in': []
}>()

const scrollArea = ref<HTMLElement | null>(null)
const personMap = computed(() => new Map(props.participants.map((person) => [person.id, person])))
const myName = computed(() => props.participants.find((p) => p.isMe)?.name ?? '')
const signedCount = computed(() => props.participants.filter((p) => p.signedIn).length)
const totalCount = computed(() => props.participants.length)
const isAssistant = (entry: TranscriptEntry) => entry.speakerId === 'assistant'

watch(
  () => [props.transcripts.length, props.liveDraft.length],
  async () => {
    await nextTick()
    if (scrollArea.value) scrollArea.value.scrollTop = scrollArea.value.scrollHeight
  },
  { immediate: true },
)
</script>

<template>
  <section class="transcript-panel panel-frame">
    <header class="panel-header transcript-header">
      <div>
        <h2>会议实时记录</h2>
      </div>
      <div class="transcript-tools">
        <span class="recognition-state"><i />语音识别正常</span>
        <span class="accuracy">识别率 <strong>98.6%</strong></span>
      </div>
    </header>

    <div ref="scrollArea" class="transcript-stream">
      <article
        v-for="entry in transcripts"
        :key="entry.id"
        class="speech-entry"
        :class="[entry.status, { assistant: isAssistant(entry) }]"
      >
        <AIAssistantAvatar v-if="isAssistant(entry)" class="speech-avatar assistant-avatar" label="会议助手头像" />
        <img
          v-else
          class="speech-avatar"
          :src="getAvatar(personMap.get(entry.speakerId)?.name ?? '')"
          :alt="personMap.get(entry.speakerId)?.name"
        />
        <div class="speech-body">
          <div class="speech-meta">
            <strong>{{ isAssistant(entry) ? '会议助手' : personMap.get(entry.speakerId)?.name }}</strong>
            <span>{{ isAssistant(entry) ? '智能书记员' : personMap.get(entry.speakerId)?.role }}</span>
            <time>{{ entry.time }}</time>
            <em v-if="entry.status === 'accepted'">已采纳</em>
            <em v-if="entry.status === 'pending'" class="pending-mark">已登记 · 待统稿确认</em>
          </div>
          <p>{{ entry.content }}</p>

          <!-- 签到引导：最后一条助手消息未签到时提供签到入口 -->
          <div v-if="isAssistant(entry) && !meSigned" class="signin-inline">
            <button type="button" class="signin-inline-button" @click="emit('sign-in')">
              <el-icon><Check /></el-icon>我是{{ myName }}，签到入场
            </button>
            <span class="signin-inline-count">已签到 {{ signedCount }}/{{ totalCount }} 人</span>
          </div>

          <div v-if="entry.tags?.length" class="speech-tags">
            <span v-for="tag in entry.tags" :key="tag"># {{ tag }}</span>
          </div>
        </div>
      </article>

      <article v-if="isRunning && !meetingDone" class="speech-entry live-entry">
        <img class="speech-avatar active" :src="getAvatar(activeSpeaker.name)" :alt="activeSpeaker.name" />
        <div class="speech-body">
          <div class="speech-meta">
            <strong>{{ activeSpeaker.name }}</strong>
            <span>{{ activeSpeaker.role }}</span>
            <em class="speaking-label"><i />正在发言</em>
          </div>
          <p class="live-text">{{ liveDraft }}<span class="typing-cursor" /></p>
          <div class="voice-strip">
            <div class="voice-wave">
              <i v-for="n in 36" :key="n" :style="{ '--delay': `${(n % 9) * -0.08}s`, '--height': `${((8 + ((n * 13) % 22)) / 16).toFixed(4)}rem` }" />
            </div>
            <span>实时转写中</span>
          </div>
        </div>
      </article>

      <div v-else class="transcript-waiting">
        <AIAssistantAvatar class="waiting-avatar" label="会议助手待命头像" />
        <div class="waiting-copy">
          <template v-if="meetingDone">
            <strong>全部议程已完成</strong>
            <span>登记建议已汇总，等待领导确认后进入统稿确认环节</span>
          </template>
          <template v-else>
            <strong>会议助手待命中</strong>
            <span>等待全员签到后，自动开启实时转写记录</span>
          </template>
        </div>
        <span v-if="!meetingDone" class="waiting-count"><i />{{ signedCount }}/{{ totalCount }} 已签到</span>
        <span v-else class="waiting-count done"><i />议程已全部完成</span>
      </div>
    </div>

    <footer class="transcript-footer">
      <div class="audio-source">
        <el-icon><VideoCamera /></el-icon>
        <div><strong>会场音频 01</strong><span>多声道降噪已开启</span></div>
      </div>
      <button v-if="isRunning" class="pause-button" @click="emit('toggle-running')">
        <el-icon><component :is="isRunning ? Mute : Microphone" /></el-icon>
        {{ isRunning ? '暂停记录' : '继续记录' }}
      </button>
      <div v-else class="pause-button disabled" aria-disabled="true">
        <el-icon><Microphone /></el-icon>等待签到后开启记录
      </div>
    </footer>
  </section>
</template>
