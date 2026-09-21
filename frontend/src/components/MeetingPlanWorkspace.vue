<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  ArrowLeft,
  Check,
  CircleCheck,
  Clock,
  Document,
  Files,
  MagicStick,
  Promotion,
  UserFilled,
} from '@element-plus/icons-vue'
import { planDocument } from '../mock/meeting'
import { revisionChapters } from '../mock/revision'
import { getAvatarByNumber } from '../utils/avatars'
import { groupIconFor } from '../utils/groupIcons'
import type { Participant } from '../types/meeting'
import type { ParticipantConfirmation } from '../types/confirmation'
import type { DistributionGroup, DistributionMaterial, DistributionTask } from '../types/distribution'
import type { RevisionChange } from '../types/revision'

const props = defineProps<{
  version: string
  participants: Participant[]
  confirmations: ParticipantConfirmation[]
  groups: DistributionGroup[]
  tasks: DistributionTask[]
  materials: DistributionMaterial[]
  changes: RevisionChange[]
  confirmedCount: number
  pendingCount: number
  progress: number
  dispatching: boolean
  dispatched: boolean
}>()

const emit = defineEmits<{
  close: []
  confirmCurrent: []
  confirmParticipant: [participantId: string]
  dispatch: []
}>()

const activeTab = ref<'plan' | 'groups' | 'minutes'>('plan')
const planViewMode = ref<'changes' | 'full'>('changes')
const groupUpdateVisible = ref(false)
let groupUpdateTimer: number | undefined
const groupUpdates: Record<string, string> = {
  x: '审核节点调整为会前 72 小时，增补名单增加会前 24 小时复核要求。',
  z: '外围缓冲区调整为 150 米，并新增东侧前置识别岗和联合机动单元。',
  f: '补充分级监测触发条件，重点级别情况同步推送联合指挥专席。',
}
const updatedGroupCount = Object.keys(groupUpdates).length
const currentParticipant = computed(() => props.participants.find((participant) => participant.isMe))
const currentConfirmed = computed(() => {
  const id = currentParticipant.value?.id
  return !!id && props.confirmations.find((record) => record.participantId === id)?.status === 'confirmed'
})

const recordFor = (participantId: string) => props.confirmations.find((record) => record.participantId === participantId)
const tasksFor = (groupId: string) => props.tasks.filter((task) => task.groupId === groupId)
const changesFor = (chapterId: string) => props.changes.filter((change) => change.chapterId === chapterId)
const additionIds = new Set(['rev-101', 'rev-402', 'rev-601'])
const isAddition = (change: RevisionChange) => additionIds.has(change.id)
const additionCount = computed(() => props.changes.filter(isAddition).length)
const revisionCount = computed(() => props.changes.length - additionCount.value)
const changedChapters = computed(() => revisionChapters.filter((chapter) => changesFor(chapter.id).length))
const finalClauseText = (chapterId: string, clauseNo: string, original: string) => {
  const change = props.changes.find((item) => item.chapterId === chapterId && item.section.startsWith(clauseNo))
  if (!change || change.status === 'kept') return original
  return change.revised
}

watch(activeTab, (tab) => {
  if (groupUpdateTimer) window.clearTimeout(groupUpdateTimer)
  groupUpdateVisible.value = false
  if (tab !== 'groups') return
  groupUpdateTimer = window.setTimeout(() => {
    groupUpdateVisible.value = true
  }, 1800)
})

onBeforeUnmount(() => {
  if (groupUpdateTimer) window.clearTimeout(groupUpdateTimer)
})
</script>

<template>
  <section class="meeting-plan-workspace panel-frame" aria-label="当前方案工作区">
    <header class="plan-workspace-toolbar">
      <button type="button" class="plan-back" @click="emit('close')"><el-icon><ArrowLeft /></el-icon>会议现场</button>
      <nav class="plan-workspace-tabs" aria-label="方案内容切换">
        <button type="button" :class="{ active: activeTab === 'plan' }" @click="activeTab = 'plan'"><el-icon><Document /></el-icon>方案<b>{{ changes.length }} 处变更</b></button>
        <button type="button" :class="{ active: activeTab === 'groups' }" @click="activeTab = 'groups'"><el-icon><UserFilled /></el-icon>工作组<b>{{ groupUpdateVisible ? `${updatedGroupCount} 处调整` : groups.length }}</b></button>
        <button type="button" :class="{ active: activeTab === 'minutes' }" @click="activeTab = 'minutes'"><el-icon><Files /></el-icon>纪要<b>{{ planDocument.minutes.actions.length }}</b></button>
      </nav>
      <div class="plan-workspace-meta"><strong>{{ version }}</strong><span class="plan-save-state"><i />已自动保存</span></div>
    </header>

    <div class="plan-workspace-content">
      <div v-if="activeTab === 'plan'" class="plan-document-view">
        <div class="plan-view-controls">
          <div class="plan-view-switch" aria-label="方案视图切换">
            <button type="button" :class="{ active: planViewMode === 'changes' }" @click="planViewMode = 'changes'">修订与新增</button>
            <button type="button" :class="{ active: planViewMode === 'full' }" @click="planViewMode = 'full'">完整版方案</button>
          </div>
          <div v-if="planViewMode === 'changes'" class="change-counts"><span class="revised">修订 {{ revisionCount }}</span><span class="added">新增 {{ additionCount }}</span></div>
          <span v-else class="clean-version"><el-icon><CircleCheck /></el-icon>已合并全部会议变更</span>
        </div>
        <article class="word-document">
          <header class="word-document-title">
            <p>市局联合指挥中心文件</p>
            <h1>大型会议保障总体安保方案</h1>
            <div><span>版本号：{{ version.replace('版本', '').trim() }}</span><span>拟稿单位：{{ planDocument.draftUnit }}</span><span>更新时间：{{ planDocument.updatedAt }}</span></div>
          </header>

          <template v-if="planViewMode === 'changes'">
          <section class="word-change-note">
            <h2>会议变更说明</h2>
            <p>本次会议共形成 {{ changes.length }} 处方案变更，其中修订 {{ revisionCount }} 处、新增 {{ additionCount }} 处。以下按章节展示变更内容及意见来源。</p>
          </section>

          <section v-for="chapter in changedChapters" :key="chapter.id" class="word-section">
            <h2>{{ chapter.no }}　{{ chapter.title }}</h2>
            <div v-if="changesFor(chapter.id).length" class="word-revisions">
              <article v-for="change in changesFor(chapter.id)" :key="change.id" class="word-revision-item" :class="{ addition: isAddition(change) }">
                <header>
                  <span>{{ isAddition(change) ? '会议新增' : '会议修订' }}</span>
                  <strong>{{ change.section }} · {{ change.title }}</strong>
                  <em>{{ change.status === 'kept' ? '维持原文' : isAddition(change) ? '已新增' : '已写入方案' }}</em>
                </header>
                <p v-if="change.status !== 'kept' && isAddition(change)" class="revision-added"><b>新增内容</b><ins>{{ change.revised }}</ins></p>
                <div v-else-if="change.status !== 'kept'" class="revision-compare">
                  <p class="revision-original"><b>原文</b><del>{{ change.original }}</del></p>
                  <p class="revision-final"><b>修订后</b><ins>{{ change.revised }}</ins></p>
                </div>
                <p v-else class="revision-kept"><b>审议结论</b>{{ change.original }}</p>
                <footer><span>意见来源：{{ change.speaker }} · {{ change.department }}</span><span>责任工作组：{{ change.owner }}</span></footer>
              </article>
            </div>
          </section>
          </template>

          <template v-else>
            <section class="word-change-note clean-note">
              <h2>方案说明</h2>
              <p>以下为已合并全部会议修订及新增内容的完整方案正文。</p>
            </section>
            <section v-for="chapter in revisionChapters" :key="chapter.id" class="word-section full-version-section">
              <h2>{{ chapter.no }}　{{ chapter.title }}</h2>
              <ol>
                <li v-for="clause in chapter.clauses" :key="clause.id"><strong>{{ clause.no }}　{{ clause.heading }}</strong><p>{{ finalClauseText(chapter.id, clause.no, clause.text) }}</p></li>
              </ol>
            </section>
          </template>

          <footer class="word-document-footer">
            <p>本方案经会议签章确认后生效，由会议助手同步生成工作组任务清单并下发。</p>
            <span>市局联合指挥中心</span>
          </footer>
        </article>
      </div>

      <div v-else-if="activeTab === 'groups'" class="group-document-view">
        <div v-if="groupUpdateVisible" class="group-update-banner" aria-live="polite">
          <el-icon><MagicStick /></el-icon>
          <div><strong>会议助手已同步工作组调整</strong><span>根据最新方案，已更新 {{ updatedGroupCount }} 个工作组的职责与执行任务。</span></div>
          <em>{{ updatedGroupCount }} 处调整</em>
        </div>
        <article v-for="group in groups" :key="group.id" class="workspace-group-card" :class="{ updated: groupUpdateVisible && groupUpdates[group.id] }">
          <header>
            <span class="workspace-group-icon" :style="{ '--group-color': group.color }"><el-icon><component :is="groupIconFor(group.id)" /></el-icon></span>
            <div><h3>{{ group.name }}</h3><p>{{ group.responsibility }}</p></div>
            <span class="group-count">{{ tasksFor(group.id).length }} 项任务</span>
          </header>
          <div class="group-owner"><strong>组长 {{ group.lead }}</strong><span>{{ group.department }} · {{ group.memberCount }} 人</span></div>
          <div v-if="groupUpdateVisible && groupUpdates[group.id]" class="group-revision-note"><span>方案联动调整</span><p>{{ groupUpdates[group.id] }}</p></div>
          <ul>
            <li v-for="task in tasksFor(group.id)" :key="task.id">
              <el-icon><Check /></el-icon>
              <div><strong>{{ task.title }}</strong><span>{{ task.description }}</span><small>{{ task.owner }} · {{ task.deadline }} · 交付：{{ task.deliverable }}</small></div>
            </li>
          </ul>
        </article>
      </div>

      <article v-else class="minutes-document-view">
        <header class="minutes-document-head">
          <div><small>MEETING MINUTES</small><h3>{{ planDocument.minutes.title }}</h3></div>
          <span>{{ planDocument.minutes.status }}</span>
        </header>
        <div class="minutes-meta"><span>记录人：{{ planDocument.minutes.recorder }}</span><span>更新时间：{{ planDocument.updatedAt }}</span></div>
        <section><h4>会议概述</h4><p>{{ planDocument.minutes.summary }}</p></section>
        <section><h4>议定事项</h4><ol><li v-for="item in planDocument.minutes.decisions" :key="item">{{ item }}</li></ol></section>
        <section><h4>后续任务</h4><div class="minute-actions"><article v-for="item in planDocument.minutes.actions" :key="item.id"><strong>{{ item.content }}</strong><span>{{ item.owner }}</span><time>{{ item.deadline }}</time></article></div></section>
        <section><h4>随纪要下发材料</h4><div class="minute-materials"><span v-for="material in materials" :key="material.id"><el-icon><Files /></el-icon>{{ material.title }}<em>已就绪</em></span></div></section>
      </article>
    </div>

    <footer class="signature-dock">
      <div class="signature-progress">
        <div><strong>签章确认</strong><span>已确认 {{ confirmedCount }}/{{ confirmations.length }} 人</span></div>
        <i><b :style="{ width: `${progress}%` }" /></i>
      </div>
      <div class="signature-people" aria-label="参会人员签章状态">
        <button
          v-for="participant in participants"
          :key="participant.id"
          type="button"
          :class="{ confirmed: recordFor(participant.id)?.status === 'confirmed', me: participant.isMe }"
          :title="`${participant.name} · ${recordFor(participant.id)?.status === 'confirmed' ? '已确认' : '待确认'}`"
          :disabled="recordFor(participant.id)?.status === 'confirmed' || dispatching || dispatched"
          @click="participant.isMe ? emit('confirmCurrent') : emit('confirmParticipant', participant.id)"
        >
          <img :src="getAvatarByNumber(participant.avatar)" :alt="participant.name" />
          <el-icon v-if="recordFor(participant.id)?.status === 'confirmed'"><CircleCheck /></el-icon>
          <small>{{ participant.name }}</small>
        </button>
      </div>
      <div class="signature-actions">
        <button v-if="!currentConfirmed" type="button" class="confirm-self" :disabled="dispatching || dispatched" @click="emit('confirmCurrent')">我已确认</button>
        <button type="button" class="dispatch-button" :disabled="pendingCount > 0 || dispatching || dispatched" @click="emit('dispatch')">
          <el-icon><Promotion /></el-icon>{{ dispatched ? '任务已下发' : dispatching ? '正在下发' : '下发任务' }}
        </button>
      </div>
      <p class="signature-hint"><el-icon><Clock /></el-icon>{{ pendingCount ? '其他参会人员均已确认，等待您确认后即可下发' : '签章确认完成，可下发任务和材料' }}</p>
    </footer>
  </section>
</template>

<style scoped>
.meeting-plan-workspace{min-width:0;display:grid;grid-template-rows:auto auto auto minmax(0,1fr) auto;background:rgba(255,255,255,.9);overflow:hidden}
.plan-workspace-head{min-height:4.25rem;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.75rem;padding:.65rem .85rem;border-bottom:1px solid var(--line);background:linear-gradient(105deg,rgba(21,139,161,.1),rgba(255,255,255,.86))}.plan-back{display:flex;align-items:center;gap:.25rem;padding:.35rem .45rem;border:1px solid var(--line);border-radius:.25rem;color:var(--muted);background:white;font-size:.65rem;cursor:pointer}.plan-workspace-title{display:flex;align-items:center;gap:.55rem;min-width:0}.plan-title-icon{width:2.3rem;height:2.3rem;display:grid;place-items:center;border-radius:.38rem;color:white;background:linear-gradient(135deg,var(--cyan),#38a88d)}.plan-workspace-title small{display:block;color:var(--cyan);font-size:.6rem;letter-spacing:.04em}.plan-workspace-title h2{margin:.16rem 0 0;color:var(--text);font-size:.95rem}.plan-save-state{display:flex;align-items:center;gap:.3rem;color:var(--green);font-size:.63rem;white-space:nowrap}.plan-save-state i{width:.38rem;height:.38rem;border-radius:50%;background:#3aad78;box-shadow:0 0 .4rem rgba(58,173,120,.55)}
.plan-overview{display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;padding:.55rem .7rem;border-bottom:1px solid var(--line)}.plan-overview article{min-width:0;display:flex;align-items:center;gap:.4rem;padding:.4rem .45rem;border:1px solid rgba(20,40,58,.09);border-radius:.3rem;background:#f8fbfc}.plan-overview .el-icon{flex:0 0 auto;color:var(--cyan)}.plan-overview strong,.plan-overview span{display:block}.plan-overview strong{color:var(--text);font-size:.82rem}.plan-overview span{color:var(--quiet);font-size:.56rem;white-space:nowrap}
.plan-workspace-tabs{display:flex;gap:.15rem;padding:.38rem .7rem 0;border-bottom:1px solid var(--line)}.plan-workspace-tabs button{display:flex;align-items:center;gap:.3rem;padding:.5rem .65rem;border:0;border-bottom:2px solid transparent;color:var(--muted);background:transparent;font-size:.69rem;cursor:pointer}.plan-workspace-tabs button.active{border-color:var(--cyan);color:var(--cyan);font-weight:700}.plan-workspace-tabs b{min-width:1.1rem;padding:.03rem .24rem;border-radius:1rem;background:rgba(21,139,161,.08);font-size:.57rem}
.plan-workspace-content{min-height:0;padding:.65rem;overflow-y:auto;scrollbar-width:thin}.plan-document-view,.chapter-list{display:grid;gap:.55rem}.version-changes{padding:.65rem;border:1px solid rgba(21,139,161,.18);border-radius:.4rem;background:rgba(21,139,161,.045)}.version-changes header{display:flex;align-items:center;justify-content:space-between}.version-changes small,.minutes-document-head small{color:var(--cyan);font-size:.56rem;letter-spacing:.08em}.version-changes h3{margin:.12rem 0;color:var(--text);font-size:.78rem}.version-changes header>span{color:var(--cyan);font-size:.62rem;font-weight:700}.version-changes ul{display:grid;gap:.35rem;margin:.4rem 0 0;padding:0;list-style:none}.version-changes li{display:grid;grid-template-columns:1rem 1fr;gap:.3rem;color:var(--muted);font-size:.65rem;line-height:1.45}.version-changes li .el-icon{color:var(--green)}
.chapter-card{padding:.65rem;border:1px solid rgba(20,40,58,.1);border-radius:.4rem;background:white}.chapter-card header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.45rem}.chapter-card header>span{padding:.2rem .35rem;border-radius:.2rem;color:var(--cyan);background:rgba(21,139,161,.09);font-size:.59rem}.chapter-card h3{margin:0;color:var(--text);font-size:.75rem}.chapter-card em{color:var(--green);font-size:.57rem;font-style:normal}.chapter-card ol{display:grid;gap:.26rem;margin:.48rem 0 0;padding-left:1.3rem}.chapter-card li{color:var(--muted);font-size:.63rem;line-height:1.45}
.group-document-view{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;align-content:start}.workspace-group-card{padding:.62rem;border:1px solid rgba(20,40,58,.1);border-radius:.4rem;background:white}.workspace-group-card>header{display:grid;grid-template-columns:2rem 1fr auto;align-items:center;gap:.45rem}.workspace-group-icon{width:2rem;height:2rem;display:grid;place-items:center;border-radius:.32rem;color:var(--group-color);background:color-mix(in srgb,var(--group-color) 12%,white)}.workspace-group-card h3{margin:0;color:var(--text);font-size:.73rem}.workspace-group-card header p{margin:.1rem 0 0;color:var(--quiet);font-size:.57rem}.group-count{color:var(--cyan);font-size:.57rem;white-space:nowrap}.group-owner{display:flex;justify-content:space-between;gap:.4rem;margin:.5rem 0;padding:.35rem .4rem;border-radius:.25rem;background:#f5f9fb;font-size:.58rem}.group-owner strong{color:var(--text)}.group-owner span{color:var(--quiet)}.workspace-group-card ul{display:grid;gap:.4rem;margin:0;padding:0;list-style:none}.workspace-group-card li{display:grid;grid-template-columns:.9rem 1fr;gap:.3rem}.workspace-group-card li>.el-icon{margin-top:.12rem;color:var(--green)}.workspace-group-card li strong,.workspace-group-card li span,.workspace-group-card li small{display:block}.workspace-group-card li strong{color:var(--text);font-size:.62rem}.workspace-group-card li span{margin-top:.08rem;color:var(--muted);font-size:.56rem;line-height:1.35}.workspace-group-card li small{margin-top:.1rem;color:var(--quiet);font-size:.53rem}
.minutes-document-view{padding:.25rem .4rem}.minutes-document-head{display:flex;justify-content:space-between;align-items:center;padding-bottom:.55rem;border-bottom:1px solid var(--line)}.minutes-document-head h3{margin:.12rem 0 0;color:var(--text);font-size:.88rem}.minutes-document-head>span{padding:.22rem .42rem;border-radius:999px;color:var(--cyan);background:rgba(21,139,161,.08);font-size:.59rem}.minutes-meta{display:flex;gap:1rem;padding:.45rem 0;color:var(--quiet);font-size:.58rem}.minutes-document-view section{margin-top:.55rem;padding:.6rem;border:1px solid rgba(20,40,58,.1);border-radius:.35rem;background:white}.minutes-document-view h4{margin:0 0 .35rem;color:var(--text);font-size:.7rem}.minutes-document-view p,.minutes-document-view li{color:var(--muted);font-size:.62rem;line-height:1.55}.minutes-document-view p{margin:0}.minutes-document-view ol{display:grid;gap:.25rem;margin:0;padding-left:1.15rem}.minute-actions{display:grid;gap:.3rem}.minute-actions article{display:grid;grid-template-columns:1fr auto auto;gap:.5rem;padding:.4rem;border-radius:.25rem;background:#f5f9fb;font-size:.58rem}.minute-actions strong{color:var(--text)}.minute-actions span,.minute-actions time{color:var(--quiet)}.minute-materials{display:flex;flex-wrap:wrap;gap:.35rem}.minute-materials>span{display:flex;align-items:center;gap:.25rem;padding:.32rem .4rem;border:1px solid var(--line);border-radius:.25rem;color:var(--muted);font-size:.57rem}.minute-materials .el-icon{color:var(--cyan)}.minute-materials em{color:var(--green);font-style:normal}
.signature-dock{display:grid;grid-template-columns:9rem minmax(0,1fr) auto;align-items:center;gap:.55rem;padding:.55rem .7rem .45rem;border-top:1px solid var(--line-strong);background:linear-gradient(105deg,#f6fbfc,rgba(255,255,255,.98));box-shadow:0 -.35rem 1rem rgba(20,40,58,.05)}.signature-progress>div{display:flex;justify-content:space-between;gap:.3rem;font-size:.59rem}.signature-progress strong{color:var(--text)}.signature-progress span{color:var(--cyan)}.signature-progress>i{height:.25rem;display:block;margin-top:.32rem;border-radius:1rem;background:rgba(20,40,58,.08);overflow:hidden}.signature-progress>i b{height:100%;display:block;border-radius:inherit;background:linear-gradient(90deg,var(--cyan),#38a88d);transition:width .25s ease}.signature-people{min-width:0;display:flex;align-items:flex-start;gap:.2rem;overflow-x:auto}.signature-people button{position:relative;min-width:2.55rem;padding:0;border:0;color:var(--quiet);background:transparent;cursor:pointer}.signature-people img{width:1.7rem;height:1.7rem;border:2px solid rgba(20,40,58,.12);border-radius:50%;object-fit:cover}.signature-people small{display:block;margin-top:.08rem;font-size:.48rem;white-space:nowrap}.signature-people button.confirmed img{border-color:#3aad78}.signature-people button.me img{box-shadow:0 0 0 2px rgba(21,139,161,.13)}.signature-people button>.el-icon{position:absolute;top:.9rem;right:.28rem;border-radius:50%;color:white;background:#3aad78;font-size:.75rem}.signature-actions{display:flex;align-items:center;gap:.3rem}.signature-actions button{height:2rem;padding:0 .52rem;border-radius:.25rem;font-size:.59rem;white-space:nowrap;cursor:pointer}.confirm-self,.confirm-rest{border:1px solid var(--line-strong);color:var(--cyan);background:white}.dispatch-button{display:flex;align-items:center;gap:.25rem;border:0;color:white;background:linear-gradient(110deg,var(--cyan-strong),var(--cyan));font-weight:700}.signature-actions button:disabled{opacity:.42;cursor:not-allowed}.signature-hint{grid-column:1/-1;margin:0;color:var(--quiet);font-size:.53rem;text-align:right}.signature-hint .el-icon{margin-right:.2rem;vertical-align:-.1rem;color:var(--cyan)}
@media(max-width:1450px){.group-document-view{grid-template-columns:1fr}.plan-overview article{padding:.35rem}.signature-dock{grid-template-columns:8rem minmax(0,1fr)}.signature-actions{grid-column:1/-1;justify-content:flex-end}.signature-hint{display:none}}
@media(prefers-reduced-motion:reduce){.signature-progress>i b{transition:none}}

/* 当前方案采用正文审阅式布局，字号与会议页其余区域保持一致。 */
.meeting-plan-workspace { grid-template-rows: auto minmax(0, 1fr) auto; }
.plan-workspace-toolbar { min-height: 3.5rem; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .75rem; padding: 0 .875rem; border-bottom: 1px solid var(--line); background: rgba(255, 255, 255, .94); }
.plan-back { padding: .45rem .65rem; font-size: .8125rem; font-weight: 600; }
.plan-workspace-tabs { align-self: stretch; justify-content: center; padding: 0; border: 0; }
.plan-workspace-tabs button { height: 100%; padding: 0 .875rem; font-size: .8125rem; }
.plan-workspace-tabs button { white-space: nowrap; }
.plan-workspace-tabs b { min-width: 1.35rem; padding: .08rem .3rem; font-size: .6875rem; }
.plan-workspace-meta { display: flex; align-items: center; gap: .65rem; white-space: nowrap; }
.plan-workspace-meta > strong { color: var(--text); font-size: .8125rem; }
.plan-save-state { font-size: .75rem; }
.plan-workspace-content { padding: 1rem; background: #e9eff3; }
.plan-document-view { display: block; }
.plan-view-controls { width: min(100%, 52rem); display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin: 0 auto .75rem; }
.plan-view-switch { display: inline-flex; padding: .2rem; border: 1px solid rgba(20, 40, 58, .14); border-radius: .35rem; background: rgba(255, 255, 255, .9); }
.plan-view-switch button { padding: .4rem .7rem; border: 0; border-radius: .25rem; color: var(--muted); background: transparent; font-size: .75rem; cursor: pointer; }
.plan-view-switch button.active { color: white; background: var(--cyan); font-weight: 700; box-shadow: 0 .2rem .55rem rgba(21, 139, 161, .2); }
.change-counts { display: flex; align-items: center; gap: .35rem; }
.change-counts span { padding: .28rem .5rem; border-radius: 999px; font-size: .6875rem; font-weight: 700; }
.change-counts .revised { color: #936145; background: #fbf2ec; }
.change-counts .added { color: #2f7d5a; background: #edf8f2; }
.clean-version { display: flex; align-items: center; gap: .25rem; color: var(--green); font-size: .75rem; font-weight: 700; }
.word-document { width: min(100%, 52rem); min-height: 100%; margin: 0 auto; padding: 2rem 2.4rem 2.5rem; border: 1px solid rgba(20, 40, 58, .12); background: #fff; box-shadow: 0 .5rem 1.8rem rgba(31, 65, 83, .1); color: #1f2933; }
.word-document-title { padding-bottom: 1.25rem; border-bottom: 2px solid #34495a; text-align: center; }
.word-document-title > p { margin: 0 0 .75rem; color: #6a7782; font-size: .8125rem; letter-spacing: .18em; }
.word-document-title h1 { margin: 0; color: #172532; font-family: 'Noto Serif SC', 'SimSun', serif; font-size: 1.45rem; font-weight: 700; letter-spacing: .08em; }
.word-document-title > div { display: flex; flex-wrap: wrap; justify-content: center; gap: .4rem 1.25rem; margin-top: .9rem; color: #65727e; font-size: .75rem; }
.word-change-note { margin: 1.35rem 0; padding: .9rem 1rem; border-left: .2rem solid var(--cyan); background: #f3f8fa; }
.word-change-note h2, .word-section h2 { margin: 0 0 .65rem; color: #1d3546; font-family: 'Noto Serif SC', 'SimSun', serif; font-size: 1rem; }
.word-change-note > p { margin: 0; color: #465b69; font-family: 'Noto Serif SC', 'SimSun', serif; font-size: .8125rem; line-height: 1.75; }
.word-change-note.clean-note { border-left-color: var(--green); background: #f1f8f4; }
.word-change-note ol, .word-section ol { display: grid; gap: .5rem; margin: 0; padding-left: 1.6rem; }
.word-change-note li, .word-section li { padding-left: .15rem; color: #354653; font-family: 'Noto Serif SC', 'SimSun', serif; font-size: .875rem; line-height: 1.8; }
.word-section { margin-top: 1.35rem; }
.word-section h2 { padding-bottom: .45rem; border-bottom: 1px solid #d8e0e6; }
.word-revisions { display: grid; gap: .75rem; margin-top: 1rem; }
.word-revision-item { position: relative; overflow: hidden; border: 1px solid rgba(21, 139, 161, .24); border-radius: .25rem; background: #fbfdfd; animation: revision-enter .24s ease-out both; }
.word-revision-item::before { position: absolute; inset: 0 auto 0 0; width: .22rem; content: ''; background: var(--cyan); }
.word-revision-item > header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .5rem; padding: .55rem .75rem .5rem .9rem; border-bottom: 1px solid rgba(20, 40, 58, .09); background: rgba(21, 139, 161, .055); }
.word-revision-item > header > span { padding: .18rem .38rem; border-radius: .18rem; color: white; background: var(--cyan); font-size: .6875rem; font-weight: 700; }
.word-revision-item > header > strong { min-width: 0; color: #213848; font-size: .8125rem; }
.word-revision-item > header > em { color: var(--green); font-size: .6875rem; font-style: normal; font-weight: 700; white-space: nowrap; }
.revision-compare { display: grid; gap: .4rem; padding: .65rem .75rem .7rem .9rem; }
.revision-compare p, .revision-kept { display: grid; grid-template-columns: 3.5rem minmax(0, 1fr); gap: .45rem; margin: 0; padding: .48rem .55rem; border-radius: .2rem; font-family: 'Noto Serif SC', 'SimSun', serif; font-size: .8125rem; line-height: 1.65; }
.revision-compare p b, .revision-kept b { font-family: var(--font-body); font-size: .6875rem; }
.revision-original { color: #80565a; background: #fcf3f3; }
.revision-original b { color: #9b4d53; }
.revision-original del { text-decoration-color: #b85a62; text-decoration-thickness: 1.5px; }
.revision-final { color: #285b47; border: 1px solid rgba(47, 125, 90, .18); background: #f0f8f4; }
.revision-final b { color: #2f7d5a; }
.revision-final ins { text-decoration: none; background: linear-gradient(transparent 72%, rgba(74, 183, 132, .22) 72%); }
.revision-kept { margin: .65rem .75rem .7rem .9rem; color: #596975; background: #f4f7f9; }
.word-revision-item > footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .25rem .8rem; padding: 0 .75rem .55rem .9rem; color: #697985; font-size: .6875rem; }
.word-revision-item.addition { border-color: rgba(47, 125, 90, .28); }
.word-revision-item.addition::before { background: var(--green); }
.word-revision-item.addition > header { background: rgba(47, 125, 90, .065); }
.word-revision-item.addition > header > span { background: var(--green); }
.revision-added { display: grid; grid-template-columns: 4rem minmax(0, 1fr); gap: .45rem; margin: .65rem .75rem .7rem .9rem; padding: .55rem .6rem; border: 1px solid rgba(47, 125, 90, .2); border-radius: .2rem; color: #285b47; background: #eef8f3; font-family: 'Noto Serif SC', 'SimSun', serif; font-size: .8125rem; line-height: 1.7; }
.revision-added b { color: #2f7d5a; font-family: var(--font-body); font-size: .6875rem; }
.revision-added ins { text-decoration: none; background: linear-gradient(transparent 72%, rgba(74, 183, 132, .24) 72%); }
.full-version-section ol { padding-left: 1.45rem; }
.full-version-section li { margin-bottom: .75rem; }
.full-version-section li strong { display: block; color: #263d4d; font-size: .875rem; }
.full-version-section li p { margin: .18rem 0 0; color: #354653; font-family: 'Noto Serif SC', 'SimSun', serif; font-size: .875rem; line-height: 1.8; }
.word-document-footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #d8e0e6; color: #5e6d78; font-family: 'Noto Serif SC', 'SimSun', serif; font-size: .8125rem; line-height: 1.7; }
.word-document-footer p { margin: 0; }
.word-document-footer span { display: block; margin-top: 1rem; text-align: right; }
.workspace-group-card h3 { font-size: .875rem; }
.workspace-group-card header p, .group-count { font-size: .75rem; }
.group-owner { padding: .45rem .5rem; font-size: .75rem; }
.workspace-group-card li strong { font-size: .8125rem; }
.workspace-group-card li span { font-size: .75rem; line-height: 1.55; }
.workspace-group-card li small { font-size: .6875rem; }
.group-update-banner { grid-column: 1 / -1; display: grid; grid-template-columns: 2rem minmax(0, 1fr) auto; align-items: center; gap: .65rem; padding: .7rem .8rem; border: 1px solid rgba(21, 139, 161, .28); border-radius: .4rem; background: linear-gradient(105deg, rgba(21, 139, 161, .11), rgba(74, 183, 132, .06)); animation: group-update-enter .28s ease-out both; }
.group-update-banner > .el-icon { width: 2rem; height: 2rem; border-radius: 50%; color: white; background: var(--cyan); }
.group-update-banner strong, .group-update-banner span { display: block; }
.group-update-banner strong { color: var(--text); font-size: .8125rem; }
.group-update-banner span { margin-top: .15rem; color: var(--muted); font-size: .75rem; }
.group-update-banner em { padding: .25rem .45rem; border-radius: 999px; color: var(--cyan); background: white; font-size: .6875rem; font-style: normal; font-weight: 700; white-space: nowrap; }
.workspace-group-card.updated { border-color: rgba(21, 139, 161, .45); box-shadow: inset .2rem 0 0 var(--cyan), 0 .35rem 1rem rgba(21, 139, 161, .08); animation: group-card-update .32s ease-out both; }
.group-revision-note { margin: .1rem 0 .55rem; padding: .5rem .55rem; border-left: .18rem solid var(--cyan); background: rgba(21, 139, 161, .065); }
.group-revision-note span { display: block; color: var(--cyan); font-size: .6875rem; font-weight: 700; }
.group-revision-note p { margin: .2rem 0 0; color: var(--muted); font-size: .75rem; line-height: 1.5; }
.minutes-document-head h3 { font-size: 1rem; }
.minutes-document-head small, .minutes-document-head > span, .minutes-meta { font-size: .75rem; }
.minutes-document-view h4 { font-size: .875rem; }
.minutes-document-view p, .minutes-document-view li { font-size: .8125rem; line-height: 1.7; }
.minute-actions article { padding: .55rem; font-size: .75rem; }
.minute-materials > span { padding: .4rem .5rem; font-size: .75rem; }
.signature-progress > div { font-size: .75rem; }
.signature-people button { min-width: 3rem; }
.signature-people img { width: 2rem; height: 2rem; }
.signature-people small { font-size: .625rem; }
.signature-people button > .el-icon { top: 1.1rem; right: .3rem; font-size: .875rem; }
.signature-actions button { height: 2.25rem; padding: 0 .7rem; font-size: .75rem; }
.signature-hint { font-size: .6875rem; }

@media (max-width: 1450px) {
  .word-document { padding: 1.5rem 1.6rem 2rem; }
  .plan-workspace-tabs button { padding: 0 .6rem; }
}
@keyframes revision-enter { from { opacity: 0; transform: translateY(.3rem); } to { opacity: 1; transform: translateY(0); } }
@keyframes group-update-enter { from { opacity: 0; transform: translateY(-.35rem); } to { opacity: 1; transform: translateY(0); } }
@keyframes group-card-update { 0% { background: rgba(21, 139, 161, .14); transform: translateY(.2rem); } 100% { background: white; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .word-revision-item, .group-update-banner, .workspace-group-card.updated { animation: none; } }
</style>
