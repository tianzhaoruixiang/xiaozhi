<script setup lang="ts">
import { computed } from 'vue'
import { Check, Document, RefreshLeft, User } from '@element-plus/icons-vue'
import type { RevisionChange, RevisionChapter, RevisionViewMode } from '../../types/revision'

const props = defineProps<{
  chapter?: RevisionChapter
  chapters: RevisionChapter[]
  changes: RevisionChange[]
  allChanges: RevisionChange[]
  viewMode: RevisionViewMode
  sourceVersion: string
  targetVersion: string
}>()

defineEmits<{
  'update:viewMode': [mode: RevisionViewMode]
  accept: [id: string]
  keep: [id: string]
}>()

const statusText = {
  pending: '待确认表述',
  accepted: '已写入统稿',
  kept: '本次不纳入',
}

const riskText = {
  low: '低风险',
  medium: '需核对',
  high: '重点审阅',
}

// 条文与修订建议按“节号 标题”匹配
const rows = computed(() => (props.chapter?.clauses ?? []).map((clause) => ({
  clause,
  change: props.changes.find((change) => change.section === `${clause.no} ${clause.heading}`),
})))

// 合并预览：完整方案文档（全部章节），已采纳（含折中）修订写入正文，其余保持原文，不体现修订痕迹
const docChapters = computed(() => props.chapters.map((chapter) => ({
  chapter,
  rows: chapter.clauses.map((clause) => {
    const change = props.allChanges.find((item) => item.section === `${clause.no} ${clause.heading}`)
    return { clause, text: change?.status === 'accepted' ? change.revised : clause.text }
  }),
})))
</script>

<template>
  <section class="panel-frame plan-diff-panel" aria-labelledby="plan-diff-title">
    <header class="diff-panel-header">
      <div>
        <span class="diff-context">{{ viewMode === 'merged' ? '完整方案 · 共 ' + chapters.length + ' 章' : chapter?.no + ' · ' + chapter?.title }}</span>
        <h2 id="plan-diff-title">{{ viewMode === 'merged' ? '会议定稿预览' : '会议决议统稿' }}</h2>
      </div>

      <div class="diff-toolbar" role="group" aria-label="修订查看方式">
        <button
          type="button"
          :class="{ active: viewMode === 'compare' }"
          :aria-pressed="viewMode === 'compare'"
          @click="$emit('update:viewMode', 'compare')"
        >决议对照</button>
        <button
          type="button"
          :class="{ active: viewMode === 'merged' }"
          :aria-pressed="viewMode === 'merged'"
          @click="$emit('update:viewMode', 'merged')"
        >合并预览</button>
      </div>
    </header>

    <div v-if="chapter" class="diff-scroll doc-canvas">
      <article class="doc-paper" lang="zh-CN">
        <header class="doc-masthead">
          <h1 class="doc-title">大型会议保障动员会</h1>
          <p class="doc-subtitle">（会议统稿 · 拟提交联合会签）</p>
          <i class="doc-rule" aria-hidden="true" />
          <dl class="doc-meta">
            <div><dt>拟稿单位</dt><dd>市局联合指挥中心</dd></div>
            <div><dt>版　　本</dt><dd>{{ targetVersion }}（承接 {{ sourceVersion }} 版及会议决议）</dd></div>
            <div><dt>密　　级</dt><dd>内部资料</dd></div>
            <div><dt>日　　期</dt><dd>2026 年 9 月 20 日</dd></div>
          </dl>
        </header>

        <!-- 修订标记模式：当前章节对照，显示修订痕迹与批注卡 -->
        <template v-if="viewMode === 'compare'">
          <h2 class="doc-chapter">{{ chapter.no }}　{{ chapter.title }}</h2>

          <section v-for="row in rows" :key="row.clause.id" class="doc-clause">
            <h3 class="doc-clause-title">{{ row.clause.no }}　{{ row.clause.heading }}</h3>

            <template v-if="!row.change">
              <p class="doc-text">{{ row.clause.text }}</p>
            </template>

            <template v-else>
              <p class="doc-text doc-del" aria-label="原方案条文">{{ row.change.original }}</p>
              <p class="doc-text doc-ins" aria-label="修订建议条文">{{ row.change.revised }}</p>
            </template>

            <aside v-if="row.change" class="doc-note" :class="`note-${row.change.status}`">
              <header class="doc-note-head">
                <span class="note-status">{{ statusText[row.change.status] }}</span>
                <span class="note-risk">{{ riskText[row.change.risk] }}</span>
                <h4>{{ row.change.title }}</h4>
              </header>
              <p class="doc-note-reason"><strong>会议决议</strong>{{ row.change.reason }}</p>
              <footer class="doc-note-meta">
                <span><el-icon><User /></el-icon>{{ row.change.speaker }} · {{ row.change.department }} · {{ row.change.time }}</span>
                <span><el-icon><Document /></el-icon>领导确认纳入 · {{ row.change.references.length }} 项支撑依据</span>
                <span>责任单位：{{ row.change.owner }}</span>
              </footer>
              <div v-if="row.change.status === 'pending'" class="doc-note-actions">
                <button type="button" class="note-keep" @click="$emit('keep', row.change.id)">
                  <el-icon><RefreshLeft /></el-icon>本次不纳入
                </button>
                <button type="button" class="note-accept" @click="$emit('accept', row.change.id)">
                  <el-icon><Check /></el-icon>确认表述并写入定稿
                </button>
              </div>
              <span v-else class="doc-note-resolved"><el-icon><Check /></el-icon>处理结果已留痕</span>
            </aside>
          </section>
        </template>

        <!-- 合并预览模式：完整方案定稿文档，不体现修订痕迹与批注 -->
        <template v-else>
          <section v-for="docChapter in docChapters" :key="docChapter.chapter.id">
            <h2 class="doc-chapter">{{ docChapter.chapter.no }}　{{ docChapter.chapter.title }}</h2>

            <section v-for="row in docChapter.rows" :key="row.clause.id" class="doc-clause">
              <h3 class="doc-clause-title">{{ row.clause.no }}　{{ row.clause.heading }}</h3>
              <p class="doc-text">{{ row.text }}</p>
            </section>
          </section>
        </template>
      </article>
    </div>

    <div v-else class="revision-empty">
      <el-icon><Document /></el-icon>
      <strong>未选择章节</strong>
      <span>请选择左侧章节查看方案文本</span>
    </div>
  </section>
</template>
