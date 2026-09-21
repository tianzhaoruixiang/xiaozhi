<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatClock, useReviews } from '../data/reviews'
import MarkdownView from './MarkdownView.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { pending, approve } = useReviews()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

/** 刚通过的成果，用于给出「已自动提交高总」的反馈 */
const lastApproved = ref('')

const pass = (id: string) => {
  const res = approve(id, { reviewedBy: '王处', forwardTo: '高总' })
  if (res.ok) lastApproved.value = res.item.taskTitle
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="52rem"
    class="review-dialog"
    modal-class="review-overlay"
    :show-close="false"
    align-center
    append-to-body
  >
    <div class="review-card">
      <header class="review-head">
        <div>
          <p class="eyebrow">待审核成果</p>
          <h2>张磊提交的任务成果</h2>
          <p class="hint">审核通过后自动提交给高总。</p>
        </div>
        <span class="count">{{ pending.length }} 项待审</span>
      </header>

      <p v-if="!pending.length" class="empty">暂无待审核成果</p>

      <ul v-else class="review-list">
        <li v-for="item in pending" :key="item.id" class="review-item">
          <header class="item-head">
            <div class="item-meta">
              <strong>{{ item.taskTitle }}</strong>
              <em>
                {{ item.submittedBy }} 提交 · {{ formatClock(item.submittedAt) }} ·
                {{ item.fileName }}
              </em>
            </div>
            <button type="button" class="pass" @click="pass(item.id)">
              通过并提交高总
            </button>
          </header>

          <div class="doc">
            <MarkdownView tone="light" :source="item.markdown" />
          </div>
        </li>
      </ul>

      <footer class="review-foot">
        <span v-if="lastApproved" class="ok">
          已通过并自动提交给高总：{{ lastApproved }}
        </span>
        <span v-else class="foot-hint">通过后成果将出现在高总工作台。</span>
        <button type="button" class="close" @click="visible = false">关闭</button>
      </footer>
    </div>
  </el-dialog>
</template>

<style scoped>
:global(.review-overlay) {
  background: rgba(6, 20, 31, 0.5);
  backdrop-filter: blur(5px);
}

:global(.review-dialog) {
  overflow: hidden;
  border: 1px solid rgba(46, 196, 214, 0.22);
  border-radius: 18px;
  background: #f4f9fc;
  box-shadow: 0 28px 80px rgba(6, 20, 31, 0.28);
}

:global(.review-dialog .el-dialog__header) { display: none; }
:global(.review-dialog .el-dialog__body) { padding: 0; }

.review-card {
  display: flex;
  flex-direction: column;
  max-height: 78vh;
  color: #14283a;
  background:
    linear-gradient(135deg, rgba(46, 196, 214, 0.08), transparent 42%),
    linear-gradient(160deg, #fff, #edf6fa);
}

.review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px 14px;
  border-bottom: 1px solid rgba(20, 40, 58, 0.08);
  flex-shrink: 0;
}

.eyebrow {
  margin: 0 0 4px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: #1a7a92;
}

.review-head h2 {
  margin: 0;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 1.28rem;
  font-weight: 600;
}

.hint {
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: #5a7084;
}

.count {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid rgba(26, 122, 146, 0.3);
  border-radius: 999px;
  background: rgba(26, 122, 146, 0.08);
  color: #1a7a92;
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

.empty {
  margin: 0;
  padding: 28px 22px;
  text-align: center;
  font-size: 0.88rem;
  color: #5a7084;
}

.review-list {
  list-style: none;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 16px 22px;
}

.review-item {
  border: 1px solid rgba(20, 40, 58, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  overflow: hidden;
}

.item-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(20, 40, 58, 0.08);
  background: rgba(26, 122, 146, 0.05);
}

.item-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.item-meta strong {
  font-size: 0.94rem;
}

.item-meta em {
  font-style: normal;
  font-size: 0.74rem;
  color: #5a7084;
}

.pass {
  flex-shrink: 0;
  padding: 8px 16px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(160deg, #1f8ea8, #176f84);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(23, 111, 132, 0.22);
  transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}

.pass:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 22px rgba(23, 111, 132, 0.28);
}

.doc {
  max-height: 40vh;
  overflow-y: auto;
  padding: 14px 16px;
}

.review-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 22px 16px;
  border-top: 1px solid rgba(20, 40, 58, 0.08);
  flex-shrink: 0;
}

.foot-hint {
  font-size: 0.78rem;
  color: #5a7084;
}

.ok {
  font-size: 0.82rem;
  color: #2f7d5a;
  font-weight: 600;
}

.close {
  padding: 8px 18px;
  border: 1px solid rgba(20, 40, 58, 0.14);
  border-radius: 10px;
  background: #fff;
  color: #14283a;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
