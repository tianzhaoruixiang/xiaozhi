<script setup lang="ts">
import { computed } from 'vue'
import { Collection, DocumentChecked } from '@element-plus/icons-vue'
import type { RevisionChapter, RevisionChange } from '../../types/revision'

const props = defineProps<{
  chapters: RevisionChapter[]
  changes: RevisionChange[]
  selectedChapterId: string
  progress: number
  sourceVersion: string
  targetVersion: string
}>()

defineEmits<{ select: [chapterId: string] }>()

const statsFor = (chapterId: string) => {
  const items = props.changes.filter((change) => change.chapterId === chapterId)
  return {
    total: items.length,
    resolved: items.filter((change) => change.status === 'accepted' || change.status === 'kept').length,
  }
}

const updatedChapterCount = computed(() => new Set(props.changes.map((change) => change.chapterId)).size)
</script>

<template>
  <aside class="panel-frame revision-sidebar" aria-label="方案章节目录">
    <header class="revision-panel-header">
      <div>
        <span class="panel-icon"><el-icon><Collection /></el-icon></span>
        <div>
          <h2>方案目录</h2>
          <p>版本 {{ sourceVersion }} → {{ targetVersion }}</p>
        </div>
      </div>
      <strong>{{ progress }}%</strong>
    </header>

    <div class="revision-progress" aria-label="统稿确认进度">
      <span :style="{ width: `${progress}%` }" />
    </div>

    <nav class="chapter-nav" aria-label="方案章节">
      <button
        v-for="chapter in chapters"
        :key="chapter.id"
        type="button"
        :class="{ active: chapter.id === selectedChapterId }"
        :aria-current="chapter.id === selectedChapterId ? 'page' : undefined"
        @click="$emit('select', chapter.id)"
      >
        <span class="chapter-no">{{ chapter.no }}</span>
        <span class="chapter-copy">
          <strong>{{ chapter.title }}</strong>
          <small>{{ chapter.description }}</small>
        </span>
        <span class="chapter-count">
          {{ statsFor(chapter.id).resolved }}/{{ statsFor(chapter.id).total }}
        </span>
      </button>
    </nav>

    <footer class="revision-sidebar-footer">
      <el-icon><DocumentChecked /></el-icon>
      <div>
        <strong>{{ updatedChapterCount }} 个章节形成会议决议</strong>
        <span>全部内容可追溯至发言和领导确认</span>
      </div>
    </footer>
  </aside>
</template>
