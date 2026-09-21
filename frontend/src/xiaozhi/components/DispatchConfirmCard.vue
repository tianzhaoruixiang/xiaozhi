<script setup lang="ts">
import type { DispatchConfirm } from '../types/assistant'

defineProps<{
  confirm: DispatchConfirm
  tone?: 'dark' | 'light'
}>()

const emit = defineEmits<{
  approve: []
  reject: []
}>()
</script>

<template>
  <section
    v-if="confirm.status === 'pending'"
    class="confirm"
    :data-tone="tone || 'dark'"
  >
    <header class="head">
      <span class="mark" aria-hidden="true">确</span>
      <div>
        <strong>请您确认后再发出</strong>
        <p>口头说「确认发出」或「先不发」，也可直接点选。</p>
      </div>
    </header>

    <dl class="facts">
      <div>
        <dt>通知</dt>
        <dd>{{ confirm.title }}</dd>
      </div>
      <div v-if="confirm.meetingTime">
        <dt>时间</dt>
        <dd>{{ confirm.meetingTime }}</dd>
      </div>
      <div v-if="confirm.location">
        <dt>地点</dt>
        <dd>{{ confirm.location }}</dd>
      </div>
      <div v-if="confirm.recipients?.length">
        <dt>收件人</dt>
        <dd>{{ confirm.recipients.join('、') }}</dd>
      </div>
      <div v-if="confirm.agendaTitle">
        <dt>议程</dt>
        <dd>{{ confirm.agendaTitle }}</dd>
      </div>
      <div v-if="confirm.briefingTitle">
        <dt>资料</dt>
        <dd>{{ confirm.briefingTitle }}</dd>
      </div>
    </dl>

    <div class="actions">
      <button type="button" class="approve" @click="emit('approve')">确认发出</button>
      <button type="button" class="reject" @click="emit('reject')">暂不发送</button>
    </div>
  </section>
</template>

<style scoped>
.confirm {
  margin-top: 14px;
  padding: 16px 16px 14px;
  border-radius: 14px;
}

.confirm[data-tone='dark'] {
  background: linear-gradient(160deg, rgba(28, 52, 68, 0.72), rgba(16, 28, 38, 0.78));
  border: 1px solid rgba(94, 200, 232, 0.32);
  box-shadow: inset 3px 0 0 rgba(94, 200, 232, 0.55);
}

.confirm[data-tone='light'] {
  background: linear-gradient(165deg, #f4f8fb, #e8eef4);
  border: 1px solid rgba(46, 110, 138, 0.22);
  box-shadow: inset 3px 0 0 #3d7a96;
}

.head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.mark {
  flex: none;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-size: 1.15rem;
  color: #c9edf6;
  border: 1.5px solid rgba(94, 200, 232, 0.7);
  background: rgba(42, 140, 168, 0.28);
  border-radius: 8px;
}

.confirm[data-tone='light'] .mark {
  color: #1e5a72;
  background: rgba(61, 122, 150, 0.1);
  border-color: #3d7a96;
}

.head strong {
  display: block;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  color: #e8f4f8;
}

.confirm[data-tone='light'] .head strong {
  color: #163848;
}

.head p {
  margin: 4px 0 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: rgba(201, 237, 246, 0.62);
}

.confirm[data-tone='light'] .head p {
  color: rgba(22, 56, 72, 0.62);
}

.facts {
  margin: 0;
  display: grid;
  gap: 8px;
}

.facts > div {
  display: grid;
  grid-template-columns: 3.2em 1fr;
  gap: 8px;
  align-items: start;
}

.facts dt {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: #7ec8dc;
}

.confirm[data-tone='light'] .facts dt {
  color: #3d7a96;
}

.facts dd {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
  color: #eef6f8;
}

.confirm[data-tone='light'] .facts dd {
  color: #1c3440;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.actions button {
  cursor: pointer;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.86rem;
  letter-spacing: 0.08em;
}

.approve {
  border: 1px solid rgba(94, 200, 232, 0.85);
  background: #2a7a96;
  color: #f2fbfe;
}

.approve:hover {
  background: #348aa8;
}

.reject {
  border: 1px solid rgba(201, 237, 246, 0.28);
  background: transparent;
  color: rgba(201, 237, 246, 0.88);
}

.confirm[data-tone='light'] .reject {
  border-color: rgba(22, 56, 72, 0.2);
  color: #3a5864;
}
</style>
