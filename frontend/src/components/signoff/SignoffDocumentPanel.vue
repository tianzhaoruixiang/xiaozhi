<script setup lang="ts">
import { CircleCheck, DocumentChecked, Lock, Stamp, WarningFilled } from '@element-plus/icons-vue'
import type { SignoffClause, SignoffDepartment, SignoffOpinion } from '../../types/signoff'

defineProps<{
  version: string
  sourceChangeCount: number
  department?: SignoffDepartment
  opinion: SignoffOpinion | null
  clauses: SignoffClause[]
}>()

defineEmits<{
  resolve: [opinionId: string]
  sign: [departmentId: string]
}>()

const statusText = { signed: '已完成会签', pending: '等待确认', objection: '存在补充意见' }
</script>

<template>
  <section class="panel-frame signoff-document" aria-labelledby="signoff-document-title">
    <header class="signoff-document-head">
      <div>
        <span class="signoff-context">最终方案 · 版本 {{ version }}</span>
        <h2 id="signoff-document-title">联合会签</h2>
      </div>
      <div class="document-lock"><el-icon><Lock /></el-icon><span>方案正文已锁定</span><b>{{ sourceChangeCount }} 项修订</b></div>
    </header>

    <div class="signoff-document-scroll">
      <section v-if="department" class="department-review" :class="department.status">
        <header>
          <div class="department-identity">
            <span>{{ department.name.slice(0, 1) }}</span>
            <div><small>当前审阅单位</small><h3>{{ department.name }}</h3></div>
          </div>
          <span :class="['department-state', department.status]">{{ statusText[department.status] }}</span>
        </header>

        <div class="reviewer-line">
          <span>会签人</span><strong>{{ department.signer }}</strong><i />
          <span>职务</span><strong>{{ department.role }}</strong><i />
          <span>顺序</span><strong>第 {{ department.order }} 位</strong>
        </div>

        <div v-if="opinion && opinion.status === 'open'" class="signoff-opinion">
          <div class="opinion-title"><el-icon><WarningFilled /></el-icon><strong>会签补充意见</strong><span>{{ opinion.author }} · {{ opinion.department }} · {{ opinion.time }}</span></div>
          <p class="opinion-source">关联条款：{{ opinion.section }}</p>
          <blockquote>{{ opinion.content }}</blockquote>
          <div class="opinion-proposal"><span>建议补充</span><p>{{ opinion.proposal }}</p></div>
          <button type="button" @click="$emit('resolve', opinion.id)">确认补充并更新定稿条文</button>
        </div>

        <div v-else-if="department.status === 'signed'" class="signed-result">
          <span class="digital-seal"><el-icon><Stamp /></el-icon></span>
          <div><strong>会签意见：同意</strong><p>{{ department.signer }} 已于 {{ department.signedAt }} 完成电子签章</p></div>
          <code>{{ department.sealCode }}</code>
        </div>

        <div v-else class="pending-review">
          <el-icon><DocumentChecked /></el-icon>
          <div><strong>{{ opinion?.status === 'resolved' ? '补充意见已写入定稿' : '未发现待处理异议' }}</strong><p>请会签人核对最终条文和本单位责任后确认。</p></div>
          <button type="button" @click="$emit('sign', department.id)"><el-icon><CircleCheck /></el-icon>确认并完成会签</button>
        </div>
      </section>

      <section class="final-clauses">
        <div class="final-clauses-title">
          <div><h3>会议定稿条文摘要</h3><p>全部继承自统稿确认页的会议决议</p></div>
          <span>{{ clauses.length }} 条关键决议</span>
        </div>
        <article v-for="clause in clauses" :key="clause.id">
          <span class="clause-index">{{ clause.section.split(' ')[0] }}</span>
          <div>
            <h4>{{ clause.title }}</h4>
            <p>{{ clause.finalText }}</p>
            <small class="clause-decision-source">会议来源：{{ clause.speaker }} · {{ clause.department }} · {{ clause.decisionTime }}，领导确认纳入</small>
          </div>
          <span class="clause-owner">{{ clause.owner }}</span>
        </article>
      </section>
    </div>
  </section>
</template>
