import {
  MEETING_ROOMS,
  getMeetingRoomById,
  type MeetingRoom,
  type RoomStatus,
} from '../data/meetingRooms.js'

export type { MeetingRoom, RoomStatus }
export { getMeetingRoomById }

export interface QueryMeetingRoomsInput {
  /** 关键词：名称、楼层、设备、适用场景 */
  query?: string
  /** 最少可容纳人数 */
  minCapacity?: number
  /** 期望会议开始时间，如 14:00（用于避开 busySlots） */
  startTime?: string
  /** 期望会议结束时间，如 15:30 */
  endTime?: string
  /** 仅看可用（排除 maintenance；busy 仍返回但标记冲突） */
  onlyAvailable?: boolean
  /** 需要包含的设备关键词 */
  equipment?: string
  limit?: number
}

function parseHm(t: string): number | null {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

function slotOverlaps(
  slot: string,
  startMin: number,
  endMin: number,
): boolean {
  const m = slot.match(/(\d{1,2}:\d{2})\s*[-–—~至到]\s*(\d{1,2}:\d{2})/)
  if (!m) return false
  const a = parseHm(m[1])
  const b = parseHm(m[2])
  if (a == null || b == null) return false
  return startMin < b && endMin > a
}

export function roomConflictsWithWindow(
  room: MeetingRoom,
  startTime?: string,
  endTime?: string,
): string[] {
  if (!startTime) return []
  const startMin = parseHm(startTime)
  if (startMin == null) return []
  const endMin = endTime ? parseHm(endTime) ?? startMin + 90 : startMin + 90
  return room.busySlots.filter((s) => slotOverlaps(s, startMin, endMin))
}

function scoreRoom(room: MeetingRoom, input: QueryMeetingRoomsInput): number {
  let score = 0
  const q = (input.query ?? '').trim().toLowerCase()
  if (q) {
    const hay = [
      room.name,
      room.building,
      room.floor,
      room.layout,
      room.notes,
      ...room.equipment,
      ...room.suitableFor,
    ]
      .join(' ')
      .toLowerCase()
    for (const token of q.split(/[\s,，、；;]+/).filter(Boolean)) {
      if (hay.includes(token)) score += 3
      if (room.name.toLowerCase().includes(token)) score += 5
      if (room.suitableFor.some((s) => s.toLowerCase().includes(token))) score += 4
    }
  } else {
    score += 1
  }

  if (input.minCapacity) {
    if (room.capacity >= input.minCapacity) {
      score += 4
      // 容量刚好略大更好，过大略减分
      const overflow = room.capacity - input.minCapacity
      if (overflow <= 10) score += 2
      else if (overflow > 40) score -= 2
    } else {
      score -= 8
    }
  }

  if (input.equipment) {
    const eq = input.equipment.toLowerCase()
    if (room.equipment.some((e) => e.toLowerCase().includes(eq))) score += 3
    else score -= 2
  }

  const conflicts = roomConflictsWithWindow(room, input.startTime, input.endTime)
  if (conflicts.length) score -= 6
  if (room.status === 'available') score += 2
  if (room.status === 'busy') score -= 5
  if (room.status === 'maintenance') score -= 20

  return score
}

export function queryMeetingRooms(
  input: QueryMeetingRoomsInput = {},
): Array<
  MeetingRoom & {
    score: number
    timeConflicts: string[]
    recommendable: boolean
  }
> {
  const limit = input.limit ?? 8
  let list = [...MEETING_ROOMS]

  if (input.onlyAvailable) {
    list = list.filter((r) => r.status !== 'maintenance')
  }

  const ranked = list
    .map((room) => {
      const timeConflicts = roomConflictsWithWindow(
        room,
        input.startTime,
        input.endTime,
      )
      const score = scoreRoom(room, input)
      const recommendable =
        room.status === 'available' &&
        timeConflicts.length === 0 &&
        (!input.minCapacity || room.capacity >= input.minCapacity)
      return { ...room, score, timeConflicts, recommendable }
    })
    .sort((a, b) => b.score - a.score || a.capacity - b.capacity)

  return ranked.slice(0, limit)
}

export function formatRoomCard(
  room: MeetingRoom & { timeConflicts?: string[]; recommendable?: boolean },
): string {
  const statusLabel =
    room.status === 'available'
      ? '可预约'
      : room.status === 'busy'
        ? '占用中'
        : '维护中'
  const lines = [
    `【${room.name}】（${room.id}）`,
    `- 位置：${room.building} ${room.floor}`,
    `- 容量：${room.capacity} 人 · 布局：${room.layout}`,
    `- 设备：${room.equipment.join('、')}`,
    `- 状态：${statusLabel}`,
    `- 今日已占用时段：${room.busySlots.length ? room.busySlots.join('、') : '无'}`,
    `- 适用：${room.suitableFor.join('、')}`,
    `- 备注：${room.notes}`,
  ]
  if (room.timeConflicts?.length) {
    lines.push(`- 与需求时段冲突：${room.timeConflicts.join('、')}`)
  }
  if (typeof room.recommendable === 'boolean') {
    lines.push(`- 是否建议选用：${room.recommendable ? '是' : '否'}`)
  }
  return lines.join('\n')
}

export function formatRoomDirectoryHint(): string {
  return MEETING_ROOMS.map(
    (r) =>
      `${r.name}（${r.capacity}人/${r.status}/${r.floor}）`,
  ).join('；')
}

export interface RoomBookingRecord {
  id: string
  roomId: string
  roomName: string
  title: string
  startTime: string
  endTime: string
  organizer: string
  attendees?: string[]
  bookedAt: string
}

/** 进程内模拟预定台账 */
const ROOM_BOOKINGS: RoomBookingRecord[] = []

export function listRoomBookings(): RoomBookingRecord[] {
  return [...ROOM_BOOKINGS]
}

export function bookMeetingRoom(input: {
  roomIdOrName: string
  title: string
  startTime: string
  endTime: string
  organizer?: string
  attendees?: string[]
}): { ok: boolean; message: string; booking?: RoomBookingRecord; room?: MeetingRoom } {
  const room =
    getMeetingRoomById(input.roomIdOrName) ||
    queryMeetingRooms({ query: input.roomIdOrName, limit: 1, onlyAvailable: false })[0]

  if (!room) {
    return { ok: false, message: `未找到会议室：${input.roomIdOrName}` }
  }
  if (room.status === 'maintenance') {
    return { ok: false, message: `「${room.name}」维护中，无法预定` }
  }

  const conflicts = roomConflictsWithWindow(room, input.startTime, input.endTime)
  if (conflicts.length) {
    return {
      ok: false,
      message: `「${room.name}」在 ${input.startTime}-${input.endTime} 与已有占用冲突：${conflicts.join('、')}`,
      room,
    }
  }

  const slot = `${input.startTime}-${input.endTime}`
  // 写入模拟占用
  const target = MEETING_ROOMS.find((r) => r.id === room.id)
  if (target && !target.busySlots.includes(slot)) {
    target.busySlots.push(slot)
    target.busySlots.sort()
  }

  const booking: RoomBookingRecord = {
    id: `bk-${Date.now().toString(36)}`,
    roomId: room.id,
    roomName: room.name,
    title: input.title.trim() || '会议预定',
    startTime: input.startTime,
    endTime: input.endTime,
    organizer: input.organizer?.trim() || '办公室',
    attendees: input.attendees,
    bookedAt: new Date().toISOString(),
  }
  ROOM_BOOKINGS.push(booking)

  return {
    ok: true,
    message: `已预定「${room.name}」${slot}，主题：${booking.title}`,
    booking,
    room: target ?? room,
  }
}
