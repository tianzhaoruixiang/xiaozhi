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
  <section class="seal" :data-tone="tone || 'dark'" :data-status="confirm.status">
    <header class="seal-head">
      <span class="stamp">呈</span>
      <div>
        <strong>请您确认后再发出</strong>
        <p>
          {{
            confirm.status === 'pending'
              ? '口头说「确认发出」或「先不发」，也可直接点选。'
              : confirm.status === 'approved'
                ? '您已确认，正在发出。'
                : '未发出。'
          }}
        </p>
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

    <div v-if="confirm.status === 'pending'" class="actions">
      <button type="button" class="approve" @click="emit('approve')">确认发出</button>
      <button type="button" class="reject" @click="emit('reject')">暂不发送</button>
    </div>
  </section>
</template>

<style scoped>
.seal {
  margin-top: 14px;
  padding: 16px 16px 14px;
  border-radius: 4px 18px 18px 4px;
  position: relative;
}

.seal[data-tone='dark'] {
  background:
    linear-gradient(165deg, rgba(58, 22, 18, 0.55), rgba(18, 28, 36, 0.72));
  border: 1px solid rgba(196, 72, 54, 0.45);
  box-shadow: inset 3px 0 0 rgba(196, 72, 54, 0.85);
}

.seal[data-tone='light'] {
  background: linear-gradient(165deg, #fbf4ea, #f3ebe0);
  border: 1px solid rgba(148, 52, 38, 0.28);
  box-shadow: inset 3px 0 0 #9c3a2a;
}

.seal-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.stamp {
  flex: none;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-size: 1.15rem;
  letter-spacing: 0;
  color: #f3d6c8;
  border: 1.5px solid rgba(214, 92, 72, 0.85);
  background: rgba(154, 42, 32, 0.35);
}

.seal[data-tone='light'] .stamp {
  color: #8a2418;
  background: rgba(154, 42, 32, 0.08);
  border-color: #9c3a2a;
}

.seal-head strong {
  display: block;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  color: #f6e6d8;
}

.seal[data-tone='light'] .seal-head strong {
  color: #3a1c14;
}

.seal-head p {
  margin: 4px 0 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: rgba(246, 230, 216, 0.62);
}

.seal[data-tone='light'] .seal-head p {
  color: rgba(58, 28, 20, 0.62);
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
  color: rgba(214, 92, 72, 0.9);
}

.seal[data-tone='light'] .facts dt {
  color: #9c3a2a;
}

.facts dd {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
  color: #f4ece4;
}

.seal[data-tone='light'] .facts dd {
  color: #2c1a14;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.actions button {
  cursor: pointer;
  border-radius: 2px;
  padding: 8px 16px;
  font-size: 0.86rem;
  letter-spacing: 0.08em;
}

.approve {
  border: 1px solid rgba(196, 72, 54, 0.9);
  background: #9c3226;
  color: #f8e6dc;
}

.approve:hover {
  background: #b03c2e;
}

.reject {
  border: 1px solid rgba(232, 213, 163, 0.35);
  background: transparent;
  color: rgba(232, 213, 163, 0.88);
}

.seal[data-tone='light'] .reject {
  border-color: rgba(58, 28, 20, 0.2);
  color: #5a3a30;
}

.seal[data-status='approved'] {
  border-color: rgba(94, 160, 120, 0.5);
}

.seal[data-status='rejected'] {
  opacity: 0.78;
}
</style>
