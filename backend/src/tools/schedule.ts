import {
  DIRECTOR_NAME,
  DIRECTOR_SCHEDULE,
  getDirectorSchedule,
  type DirectorScheduleItem,
} from '../data/directorSchedule.js'

export type { DirectorScheduleItem }
export { DIRECTOR_NAME, getDirectorSchedule }

function parseHm(t: string): number | null {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = parseHm(aStart)
  const ae = parseHm(aEnd)
  const bs = parseHm(bStart)
  const be = parseHm(bEnd)
  if (as == null || ae == null || bs == null || be == null) return false
  return as < be && ae > bs
}

export function formatScheduleCard(item: DirectorScheduleItem): string {
  const flex = item.flexible ? '可协调' : '固定'
  return [
    `【${item.startTime}-${item.endTime}】${item.title}`,
    `- 地点：${item.location || '待定'}`,
    `- 类型：${item.kind} · ${flex}`,
    item.note ? `- 备注：${item.note}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function queryDirectorSchedule(options?: {
  keyword?: string
  onlyFlexible?: boolean
}): DirectorScheduleItem[] {
  let list = getDirectorSchedule()
  if (options?.onlyFlexible) {
    list = list.filter((i) => i.flexible)
  }
  const q = options?.keyword?.trim().toLowerCase()
  if (q) {
    list = list.filter((i) =>
      [i.title, i.location, i.note, i.kind]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }
  return list
}

export function findDirectorFreeSlots(options?: {
  durationMinutes?: number
  afterTime?: string
  beforeTime?: string
}): Array<{ startTime: string; endTime: string; note: string }> {
  const duration = options?.durationMinutes ?? 60
  const dayStart = parseHm(options?.afterTime || '08:30') ?? 8 * 60 + 30
  const dayEnd = parseHm(options?.beforeTime || '21:00') ?? 21 * 60
  const busy = getDirectorSchedule()
    .filter((i) => !i.title.includes('待安排空档'))
    .map((i) => ({
      s: parseHm(i.startTime) ?? 0,
      e: parseHm(i.endTime) ?? 0,
      flexible: i.flexible,
    }))
    .sort((a, b) => a.s - b.s)

  const gaps: Array<{ startTime: string; endTime: string; note: string }> = []
  let cursor = dayStart

  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

  for (const b of busy) {
    if (b.s - cursor >= duration) {
      gaps.push({
        startTime: fmt(cursor),
        endTime: fmt(cursor + duration),
        note: '连续空档，可直接安排',
      })
    }
    cursor = Math.max(cursor, b.e)
  }
  if (dayEnd - cursor >= duration) {
    gaps.push({
      startTime: fmt(cursor),
      endTime: fmt(cursor + duration),
      note: '下班前可用空档',
    })
  }

  // 也把标记为「待安排空档」的条目作为推荐
  for (const item of getDirectorSchedule()) {
    if (!item.title.includes('待安排空档')) continue
    const s = parseHm(item.startTime)
    const e = parseHm(item.endTime)
    if (s == null || e == null || e - s < duration) continue
    if (!gaps.some((g) => g.startTime === item.startTime)) {
      gaps.unshift({
        startTime: item.startTime,
        endTime: item.endTime,
        note: item.note || '日程中预留空档',
      })
    }
  }

  return gaps.slice(0, 6)
}

export function arrangeDirectorSchedule(input: {
  title: string
  startTime: string
  endTime: string
  location?: string
  force?: boolean
}): {
  ok: boolean
  message: string
  item?: DirectorScheduleItem
  conflicts?: DirectorScheduleItem[]
} {
  const title = input.title.trim()
  if (!title) {
    return { ok: false, message: '请提供安排事项标题' }
  }

  const conflicts = getDirectorSchedule().filter(
    (i) =>
      !i.title.includes('待安排空档') &&
      overlaps(input.startTime, input.endTime, i.startTime, i.endTime),
  )

  const hardConflicts = conflicts.filter((c) => !c.flexible)
  if (hardConflicts.length && !input.force) {
    return {
      ok: false,
      message: `与厅长固定日程冲突：${hardConflicts.map((c) => `${c.startTime} ${c.title}`).join('；')}`,
      conflicts: hardConflicts,
    }
  }

  // 替换「待安排空档」或插入新项
  const placeholderIdx = DIRECTOR_SCHEDULE.findIndex(
    (i) =>
      i.title.includes('待安排空档') &&
      overlaps(input.startTime, input.endTime, i.startTime, i.endTime),
  )

  const item: DirectorScheduleItem = {
    id: `sch-arr-${Date.now().toString(36)}`,
    startTime: input.startTime,
    endTime: input.endTime,
    title,
    location: input.location,
    kind: 'meeting',
    flexible: true,
    note: `已由智能体写入厅长日程${hardConflicts.length ? '（覆盖可协调冲突项提示）' : ''}`,
  }

  if (placeholderIdx >= 0) {
    DIRECTOR_SCHEDULE.splice(placeholderIdx, 1, item)
  } else {
    DIRECTOR_SCHEDULE.push(item)
  }

  // 软冲突仅提示
  const soft = conflicts.filter((c) => c.flexible)
  const tip = soft.length
    ? `；请注意与可协调事项可能重叠：${soft.map((c) => c.title).join('、')}`
    : ''

  return {
    ok: true,
    message: `已安排${DIRECTOR_NAME}日程：${input.startTime}-${input.endTime}「${title}」${input.location ? ` @ ${input.location}` : ''}${tip}`,
    item,
    conflicts: soft.length ? soft : undefined,
  }
}
