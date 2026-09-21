<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Microphone, Mute, VideoCamera } from '@element-plus/icons-vue'
import type { Participant, TranscriptEntry } from '../types/meeting'

const props = defineProps<{
  participants: Participant[]
  transcripts: TranscriptEntry[]
  activeSpeaker: Participant
  liveDraft: string
  isRunning: boolean
}>()

defineEmits<{ 'toggle-running': [] }>()

const scrollArea = ref<HTMLElement | null>(null)
const personMap = computed(() => new Map(props.participants.map((person) => [person.id, person])))

watch(
  () => [props.transcripts.length, props.liveDraft.length],
  async () => {
    await nextTick()
    if (scrollArea.value) scrollArea.value.scrollTop = scrollArea.value.scrollHeight
  },
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
      <article v-for="entry in transcripts" :key="entry.id" class="speech-entry" :class="entry.status">
        <div class="speech-avatar" :style="{ '--avatar-color': personMap.get(entry.speakerId)?.color }">
          {{ personMap.get(entry.speakerId)?.initial }}
        </div>
        <div class="speech-body">
          <div class="speech-meta">
            <strong>{{ personMap.get(entry.speakerId)?.name }}</strong>
            <span>{{ personMap.get(entry.speakerId)?.role }}</span>
            <time>{{ entry.time }}</time>
            <em v-if="entry.status === 'accepted'">已采纳</em>
            <em v-if="entry.status === 'pending'" class="pending-mark">建议待确认</em>
          </div>
          <p>{{ entry.content }}</p>
          <div v-if="entry.tags?.length" class="speech-tags">
            <span v-for="tag in entry.tags" :key="tag"># {{ tag }}</span>
          </div>
        </div>
      </article>

      <article class="speech-entry live-entry">
        <div class="speech-avatar active" :style="{ '--avatar-color': activeSpeaker.color }">
          {{ activeSpeaker.initial }}
          <span class="avatar-radar" />
        </div>
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
    </div>

    <footer class="transcript-footer">
      <div class="audio-source">
        <el-icon><VideoCamera /></el-icon>
        <div><strong>会场音频 01</strong><span>多声道降噪已开启</span></div>
      </div>
      <button class="pause-button" :class="{ paused: !isRunning }" @click="$emit('toggle-running')">
        <el-icon><component :is="isRunning ? Mute : Microphone" /></el-icon>
        {{ isRunning ? '暂停记录' : '继续记录' }}
      </button>
    </footer>
  </section>
</template>
