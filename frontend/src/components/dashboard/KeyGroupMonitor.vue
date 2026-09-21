<template>
  <PanelFrame title="重点群体动态监测">
    <template #extra>
      <span class="panel-badge">
        预警 {{ totalWarning }} · 人员 {{ keyPersons.length }}
        <template v-if="newCount"> · 新增 {{ newCount }}</template>
      </span>
    </template>

    <div class="groups-layout" :class="{ expanded }">
      <div class="stat-row">
        <button
          v-for="g in keyGroups"
          :key="g.type"
          class="stat-card"
          :class="{ active: expanded && filterType === g.type }"
          :style="{ '--c': g.color }"
          :disabled="!expanded"
          @click="toggleType(g.type)"
        >
          <div class="stat-type">{{ g.type }}类</div>
          <div class="stat-count">
            {{ g.count }}
            <span v-if="g.delta" class="stat-delta">+{{ g.delta }}</span>
          </div>
          <div class="stat-meta">
            <span>{{ g.label }}</span>
            <strong :class="{ danger: g.warning > 0 }">预警 {{ g.warning }}</strong>
          </div>
        </button>
      </div>

      <div v-if="expanded" class="toolbar">
        <input
          v-model.trim="keyword"
          class="search"
          type="search"
          placeholder="姓名 / 职务 / 国家"
          @input="page = 1"
        />
        <select v-model="filterStatus" class="select" @change="page = 1">
          <option value="">全部状态</option>
          <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
        </select>
        <select v-model="filterCountry" class="select" @change="page = 1">
          <option value="">全部国家</option>
          <option v-for="c in countryOptions" :key="c" :value="c">{{ c }}</option>
        </select>
        <button class="reset" type="button" @click="resetFilters">重置</button>
        <span class="result">共 {{ filtered.length }} 人</span>
      </div>

      <div
        class="person-grid"
        :style="expanded ? { gridTemplateRows: `repeat(${gridRows}, minmax(104px, 1fr))` } : undefined"
      >
        <article
          v-for="p in pagedPersons"
          :key="p.id"
          class="person-card"
          :data-type="p.type"
          :class="{ 'is-new': p.isNew }"
        >
          <span v-if="p.isNew" class="new-tag">新增</span>
          <div class="photo" :data-type="p.type">
            <div class="photo-inner">
              <span class="surname">{{ p.name.slice(0, 1) }}</span>
            </div>
          </div>
          <div class="info">
            <div class="name-row">
              <strong>{{ p.name }}</strong>
              <span class="badge type" :data-type="p.type">{{ p.type }}类</span>
              <span class="badge status" :data-status="p.status">{{ p.status }}</span>
            </div>
            <div class="field"><label>年龄</label><span>{{ p.age }}岁</span></div>
            <div class="field"><label>职务</label><span>{{ p.title }}</span></div>
            <div class="field"><label>国家</label><span>{{ p.country }}</span></div>
          </div>
        </article>
      </div>

      <div v-if="expanded" class="pager">
        <button type="button" :disabled="page <= 1" @click="page -= 1">上一页</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button type="button" :disabled="page >= totalPages" @click="page += 1">下一页</button>
      </div>
    </div>
  </PanelFrame>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { KeyGroupStat, KeyPerson } from '../../types/dashboard'
import PanelFrame from './PanelFrame.vue'

const props = defineProps<{
  keyGroups: KeyGroupStat[]
  keyPersons: KeyPerson[]
  expanded?: boolean
}>()

const PAGE_SIZE_OVERVIEW = 6
const PAGE_SIZE_EXPANDED = 20

const keyword = ref('')
const filterType = ref<'' | KeyPerson['type']>('')
const filterStatus = ref('')
const filterCountry = ref('')
const page = ref(1)

const totalWarning = computed(() => props.keyGroups.reduce((s, g) => s + g.warning, 0))

/** 本轮新增人数（王处审核通过成果后出现在名单里） */
const newCount = computed(() => props.keyPersons.filter((p) => p.isNew).length)

const statusOptions = computed(() =>
  [...new Set(props.keyPersons.map((p) => p.status))].sort(),
)

const countryOptions = computed(() =>
  [...new Set(props.keyPersons.map((p) => p.country))].sort((a, b) => a.localeCompare(b, 'zh')),
)

const filtered = computed(() => {
  const kw = keyword.value.toLowerCase()
  return props.keyPersons.filter((p) => {
    if (filterType.value && p.type !== filterType.value) return false
    if (filterStatus.value && p.status !== filterStatus.value) return false
    if (filterCountry.value && p.country !== filterCountry.value) return false
    if (!kw) return true
    return (
      p.name.toLowerCase().includes(kw) ||
      p.title.toLowerCase().includes(kw) ||
      p.country.toLowerCase().includes(kw)
    )
  })
})

const pageSize = computed(() => (props.expanded ? PAGE_SIZE_EXPANDED : PAGE_SIZE_OVERVIEW))

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))

const pagedPersons = computed(() => {
  if (!props.expanded) return props.keyPersons.slice(0, PAGE_SIZE_OVERVIEW)
  const start = (page.value - 1) * PAGE_SIZE_EXPANDED
  return filtered.value.slice(start, start + PAGE_SIZE_EXPANDED)
})

const gridRows = computed(() =>
  Math.max(1, Math.ceil(pagedPersons.value.length / 3)),
)

watch(
  () => props.expanded,
  (val) => {
    if (!val) resetFilters()
  },
)

watch([filtered, pageSize], () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

function toggleType(type: KeyPerson['type']) {
  if (!props.expanded) return
  filterType.value = filterType.value === type ? '' : type
  page.value = 1
}

function resetFilters() {
  keyword.value = ''
  filterType.value = ''
  filterStatus.value = ''
  filterCountry.value = ''
  page.value = 1
}
</script>

<style scoped>
.groups-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.stat-card {
  padding: 8px 10px;
  text-align: left;
  border: 1px solid color-mix(in srgb, var(--c) 55%, transparent);
  background: linear-gradient(160deg, color-mix(in oklch, var(--c) 14%, transparent), oklch(0.18 0.06 250 / .48));
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.stat-card:disabled {
  cursor: default;
}

.stat-card:not(:disabled):hover,
.stat-card.active {
  border-color: var(--c);
  box-shadow: 0 0 12px color-mix(in srgb, var(--c) 35%, transparent);
}

.stat-type {
  font-size: 13px;
  color: var(--c);
  letter-spacing: 0.08em;
}

.stat-count {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  color: #fff;
  font-family: var(--font-display);
  display: flex;
  align-items: baseline;
  gap: 6px;
}

/* 本轮增量：红色 +N，字号与左侧计数一致 */
.stat-delta {
  font-size: inherit;
  font-weight: 700;
  color: var(--danger);
  text-shadow: 0 0 10px oklch(0.67 0.21 25 / 0.45);
}

.stat-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.stat-meta .danger {
  color: var(--danger);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.search,
.select {
  height: 30px;
  padding: 0 10px;
  color: var(--text);
  background: oklch(0.2 0.07 248 / .62);
  border: 1px solid var(--line);
  outline: none;
}

.search {
  width: 180px;
}

.search::placeholder {
  color: var(--quiet);
}

.search:focus,
.select:focus {
  border-color: var(--cyan);
}

.select {
  min-width: 110px;
}

.select option {
  background: oklch(0.17 0.06 250);
  color: var(--text);
}

.reset {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--line);
  background: oklch(0.24 0.08 242 / .42);
  color: var(--muted);
}

.reset:hover {
  border-color: var(--cyan);
  color: var(--text);
}

.result {
  margin-left: auto;
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.person-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(88px, auto);
  gap: 8px;
  overflow: auto;
  align-content: start;
}

.groups-layout.expanded .person-grid {
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: unset;
  align-content: stretch;
  overflow: auto;
}

.groups-layout.expanded .person-card { align-items: center; }

/* 展开模式 3 列窄卡：照片缩小，给姓名与字段留足空间 */
.groups-layout.expanded .person-card { grid-template-columns: 44px 1fr; }
.groups-layout.expanded .photo { width: 44px; height: 54px; }
.groups-layout.expanded .surname { font-size: 18px; }

.person-card {
  position: relative;
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 8px;
  padding: 8px 8px 8px 11px;
  background:
    linear-gradient(135deg, oklch(0.34 0.08 228 / .22), oklch(0.18 0.06 249 / .55)),
    oklch(0.19 0.065 248 / .54);
  border: 1px solid var(--line);
  border-radius: 6px;
  box-shadow: inset 0 0 12px oklch(0.62 0.15 225 / .07);
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}

/* 类型色条：青蓝明度阶梯，与类型徽章同源 */
.person-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 2px;
  background: oklch(0.62 0.14 210);
  opacity: .9;
}

.person-card[data-type='B']::before { background: oklch(0.52 0.12 216); }
.person-card[data-type='C']::before { background: oklch(0.43 0.1 224); }
.person-card[data-type='D']::before { background: oklch(0.35 0.08 232); }

.person-card:hover {
  transform: translateY(-2px);
  border-color: oklch(0.84 0.145 207 / .65);
  background:
    linear-gradient(135deg, oklch(0.36 0.09 228 / .3), oklch(0.2 0.065 249 / .62)),
    oklch(0.21 0.07 248 / .6);
  box-shadow: inset 0 0 14px oklch(0.62 0.15 225 / .12), 0 4px 14px oklch(0.84 0.145 207 / .18);
}

.photo {
  position: relative;
  width: 56px;
  height: 70px;
  padding: 2px;
  border: 1px solid oklch(0.84 0.145 207 / .46);
  border-radius: 4px;
  background: oklch(0.17 0.06 250 / .9);
  box-shadow: 0 0 8px oklch(0.84 0.145 207 / .14);
  flex-shrink: 0;
}

.photo-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 2px;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(94, 200, 232, 0.22), transparent 55%),
    linear-gradient(180deg, #16304e 0%, #0a1830 100%);
}

/* 底部青色扫描光线 */
.photo-inner::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, oklch(0.84 0.145 207 / .6), transparent);
}

.surname {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.04em;
  text-shadow: 0 0 10px oklch(0.82 0.12 207 / .2);
}

.info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding-right: 2px;
}

.name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  margin-bottom: 2px;
}

.name-row strong {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  letter-spacing: 0.02em;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  flex-shrink: 0;
  padding: 0 4px;
  font-size: 10px;
  line-height: 16px;
  color: #fff;
  border: none;
}

/* 状态徽章靠右，与姓名拉开层级 */
.badge.status { margin-left: auto; }

.badge.type[data-type='A'] { background: oklch(0.62 0.14 210); }
.badge.type[data-type='B'] { background: oklch(0.52 0.12 216); }
.badge.type[data-type='C'] { background: oklch(0.43 0.1 224); }
.badge.type[data-type='D'] { background: oklch(0.35 0.08 232); }

/* 「新增」标签：贴在人员卡片右上角 */
.new-tag {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  padding: 1px 7px 2px;
  border-bottom-left-radius: 6px;
  background: linear-gradient(160deg, oklch(0.72 0.19 25), oklch(0.6 0.2 22));
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 15px;
  box-shadow: 0 2px 8px oklch(0.6 0.2 22 / 0.45);
}

.person-card.is-new {
  border-color: oklch(0.67 0.21 25 / 0.55);
  box-shadow:
    inset 0 0 12px oklch(0.67 0.21 25 / 0.12),
    0 0 10px oklch(0.67 0.21 25 / 0.12);
}

/* 给右上角「新增」角标让位，避免压住已核查等状态徽标 */
.person-card.is-new .name-row {
  padding-right: 42px;
}

.person-card.is-new::before {
  background: oklch(0.72 0.19 25);
}

.badge.status[data-status='在控'] { background: var(--blue); }
.badge.status[data-status='核处中'] { background: var(--amber); color: var(--bg-deep); box-shadow: 0 0 8px oklch(0.82 0.16 83 / .35); }
.badge.status[data-status='轨迹异常'] { background: var(--danger); box-shadow: 0 0 8px oklch(0.67 0.21 25 / .4); }
.badge.status[data-status='已核查'] { background: var(--green); color: var(--bg-deep); }

.field {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 5px;
  align-items: baseline;
  font-size: 12px;
  line-height: 1.4;
  min-width: 0;
}

.field label {
  color: var(--quiet);
}

.field span {
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--muted);
}

.pager button {
  height: 28px;
  padding: 0 14px;
  border: 1px solid var(--line);
  background: oklch(0.24 0.08 242 / .48);
  color: var(--text);
}

.pager button:hover:not(:disabled) {
  border-color: var(--cyan);
}

.pager button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
