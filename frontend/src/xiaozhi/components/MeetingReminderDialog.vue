<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 进入会议时携带的会话号 */
    handoffId?: string
  }>(),
  {
    handoffId: 'SEC-20260921-001',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const enterMeeting = () => {
  visible.value = false
  void router.push({ name: 'meeting', query: { handoffId: props.handoffId } })
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="31rem"
    class="meeting-reminder-dialog"
    modal-class="meeting-reminder-overlay"
    :show-close="false"
    :close-on-click-modal="false"
    align-center
    append-to-body
  >
    <div class="meeting-reminder-card">
      <div class="reminder-status"><i />会议提醒 · 即将开始</div>
      <h2>大型会议保障动员会</h2>
      <p>会议材料与参会信息已准备完毕，请按时进入会议。</p>
      <dl>
        <div><dt>时间</dt><dd>今天 10:00</dd></div>
        <div><dt>地点</dt><dd>市局联合指挥中心</dd></div>
        <div><dt>参会</dt><dd>12 人</dd></div>
      </dl>
      <div class="reminder-actions">
        <button type="button" class="later-button" @click="visible = false">稍后提醒</button>
        <button type="button" class="meeting-button" @click="enterMeeting">
          进入会议 <span>→</span>
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
:global(.meeting-reminder-overlay) {
  background: rgba(6, 20, 31, 0.5);
  backdrop-filter: blur(5px);
}

:global(.meeting-reminder-dialog) {
  overflow: hidden;
  border: 1px solid rgba(46, 196, 214, 0.22);
  border-radius: 22px;
  background: #f4f9fc;
  box-shadow: 0 28px 80px rgba(6, 20, 31, 0.28);
}

:global(.meeting-reminder-dialog .el-dialog__header) { display: none; }
:global(.meeting-reminder-dialog .el-dialog__body) { padding: 0; }

.meeting-reminder-card {
  position: relative;
  padding: 30px;
  color: #14283a;
  background:
    linear-gradient(135deg, rgba(46, 196, 214, 0.09), transparent 42%),
    linear-gradient(160deg, #fff, #edf6fa);
}

.meeting-reminder-card::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  content: '';
  background: linear-gradient(90deg, #1a7a92, #2ec4d6 68%, #c9a86c);
}

.reminder-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1a7a92;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.reminder-status i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2ec4d6;
  box-shadow: 0 0 0 5px rgba(46, 196, 214, 0.12);
}

.meeting-reminder-card h2 {
  margin: 17px 0 8px;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 1.72rem;
  letter-spacing: 0.04em;
}

.meeting-reminder-card > p {
  margin: 0;
  color: #5a7084;
  line-height: 1.65;
}

.meeting-reminder-card dl {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 24px 0;
}

.meeting-reminder-card dl div {
  padding: 12px;
  border: 1px solid rgba(20, 40, 58, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.meeting-reminder-card dt { color: #718497; font-size: 0.7rem; }
.meeting-reminder-card dd { margin: 5px 0 0; font-size: 0.84rem; font-weight: 700; }
.reminder-actions { display: flex; justify-content: flex-end; gap: 10px; }
.reminder-actions button { padding: 11px 18px; border-radius: 11px; cursor: pointer; font-weight: 700; }
.later-button { border: 1px solid rgba(20, 40, 58, 0.12); color: #5a7084; background: #fff; }
.meeting-button { border: 0; color: #fff; background: linear-gradient(145deg, #16798f, #0f5368); box-shadow: 0 9px 22px rgba(15, 83, 104, 0.22); }
.meeting-button span { margin-left: 8px; }
</style>
