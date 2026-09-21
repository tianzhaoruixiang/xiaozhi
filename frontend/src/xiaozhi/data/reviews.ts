import { computed, nextTick, ref, watch } from 'vue'

export type ReviewStatus = 'pending' | 'approved'

/** 张磊在个人台完成一项任务后，提交给王处审核的成果 */
export interface ReviewSubmission {
  id: string
  taskId: string
  taskTitle: string
  /** 交付物类型（短名单 / 线上沟通方案 / 线下沟通方案…） */
  kind: string
  fileName: string
  /** 交付物正文（Markdown） */
  markdown: string
  submittedBy: string
  submittedAt: string
  status: ReviewStatus
  /** 审核人（王处） */
  reviewedBy?: string
  reviewedAt?: string
  /** 审核通过后自动转交对象（高总） */
  forwardedTo?: string
  forwardedAt?: string
}

export function formatClock(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

let seq = 0
function newId() {
  seq += 1
  return `rev-${Date.now().toString(36)}-${seq}`
}

const STORAGE_KEY = 'xiaozhi.reviews.v1'
const hasWindow = typeof window !== 'undefined'

function loadFromStorage(): ReviewSubmission[] {
  if (!hasWindow) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ReviewSubmission[]) : []
  } catch {
    return []
  }
}

/**
 * 共享可变台账：/personal 提交 → /team 审核 → /command 查阅。
 * 同时落盘 localStorage，并通过 storage 事件在**多个标签页之间**同步：
 * 一个标签页里上报，另一个已打开的 /team、/command 标签页会立即看到「待审核 +1」。
 */
const submissions = ref<ReviewSubmission[]>(loadFromStorage())

if (hasWindow) {
  let applyingRemote = false

  // 本页改动 → 落盘（storage 事件只会在其它标签页触发）
  watch(
    submissions,
    (value) => {
      if (applyingRemote) return
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        /* 隐私模式或超配额：忽略，仅影响跨标签页同步 */
      }
    },
    { deep: true },
  )

  // 其它标签页改动 → 同步进本页
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    try {
      const parsed = event.newValue ? JSON.parse(event.newValue) : []
      applyingRemote = true
      submissions.value = Array.isArray(parsed) ? parsed : []
      void nextTick(() => {
        applyingRemote = false
      })
    } catch {
      applyingRemote = false
    }
  })
}

export function useReviews() {
  const all = computed(() => submissions.value)
  const pending = computed(() =>
    submissions.value.filter((item) => item.status === 'pending'),
  )
  const approved = computed(() =>
    submissions.value.filter((item) => item.status === 'approved'),
  )
  /** 王处专项任务上的「待审核」角标数字 */
  const pendingCount = computed(() => pending.value.length)

  /**
   * 张磊完成任务后提交审核。
   * 同一任务若已有待审项，则替换之（避免重复堆叠），并重新计时。
   */
  const submitForReview = (payload: {
    taskId: string
    taskTitle: string
    kind: string
    fileName: string
    markdown: string
    submittedBy?: string
    submittedAt?: string
  }): ReviewSubmission => {
    const existingIndex = submissions.value.findIndex(
      (item) => item.taskId === payload.taskId && item.status === 'pending',
    )
    const item: ReviewSubmission = {
      id: newId(),
      taskId: payload.taskId,
      taskTitle: payload.taskTitle,
      kind: payload.kind,
      fileName: payload.fileName,
      markdown: payload.markdown,
      submittedBy: payload.submittedBy || '张磊',
      submittedAt: payload.submittedAt || new Date().toISOString(),
      status: 'pending',
    }
    if (existingIndex >= 0) {
      submissions.value.splice(existingIndex, 1, item)
    } else {
      submissions.value.push(item)
    }
    return item
  }

  /** 王处审核通过：自动转交高总 */
  const approve = (
    id: string,
    options?: { reviewedBy?: string; forwardTo?: string },
  ) => {
    const item = submissions.value.find((s) => s.id === id)
    if (!item) return { ok: false as const, reason: 'not-found' }
    if (item.status === 'approved') return { ok: false as const, reason: 'already' }
    const stamp = new Date().toISOString()
    item.status = 'approved'
    item.reviewedBy = options?.reviewedBy || '王处'
    item.reviewedAt = stamp
    item.forwardedTo = options?.forwardTo || '高总'
    item.forwardedAt = stamp
    return { ok: true as const, item }
  }

  return { all, pending, approved, pendingCount, submitForReview, approve }
}

/** 复位（演示/测试用） */
export function resetReviews() {
  submissions.value = []
  if (hasWindow) {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* 忽略 */
    }
  }
}
