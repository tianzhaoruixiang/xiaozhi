/**
 * 模拟机关会议室台账（供会议室查询工具使用）
 */
export type RoomStatus = 'available' | 'busy' | 'maintenance'

export interface MeetingRoom {
  id: string
  /** 详细名称，如 七楼101会议室 */
  name: string
  building: string
  floor: string
  capacity: number
  /** 布局说明 */
  layout: string
  equipment: string[]
  /** 今日时段占用（模拟） */
  busySlots: string[]
  status: RoomStatus
  /** 适用场景 */
  suitableFor: string[]
  /** 备注 */
  notes: string
}

export const MEETING_ROOMS: MeetingRoom[] = [
  {
    id: 'room-7f-101',
    name: '七楼101会议室',
    building: '主楼',
    floor: '7F',
    capacity: 12,
    layout: '长桌议事型',
    equipment: ['投影', '视频会议终端', '白板', '有线麦克'],
    busySlots: ['09:00-10:30'],
    status: 'available',
    suitableFor: ['人员调度会', '专题会商', '小范围研究'],
    notes: '靠近机关办公室区，适合 8–12 人封闭议事；下午时段较空。',
  },
  {
    id: 'room-7f-108',
    name: '七楼108会商室',
    building: '主楼',
    floor: '7F',
    capacity: 8,
    layout: '圆桌会商型',
    equipment: ['电视投屏', '电话会议', '白板'],
    busySlots: ['14:00-15:30', '16:00-17:00'],
    status: 'available',
    suitableFor: ['碰头会', '会前协调', '双人以上会商'],
    notes: '空间紧凑，不适合超过 8 人；无阶梯座位。',
  },
  {
    id: 'room-3f-amphitheater',
    name: '三楼阶梯会议室',
    building: '主楼',
    floor: '3F',
    capacity: 80,
    layout: '阶梯报告厅',
    equipment: ['舞台麦克', '双投影', '录播系统', '同声传译预留位'],
    busySlots: ['09:30-11:30'],
    status: 'available',
    suitableFor: ['全员调度动员', '大型通报会', '培训宣讲'],
    notes: '适合 40 人以上；若仅为科室调度会则偏大，建议另选。',
  },
  {
    id: 'room-3f-301',
    name: '三楼301中会议室',
    building: '主楼',
    floor: '3F',
    capacity: 30,
    layout: 'U 型议事桌',
    equipment: ['投影', '视频会议终端', '无线麦克', '电子桌牌'],
    busySlots: [],
    status: 'available',
    suitableFor: ['跨部门调度会', '联席会', '中型专题会'],
    notes: '今日全天空闲，设备齐全，常作为跨处室调度首选。',
  },
  {
    id: 'room-5f-party',
    name: '五楼党委会议室',
    building: '主楼',
    floor: '5F',
    capacity: 24,
    layout: '长桌议事型',
    equipment: ['投影', '视频会议终端', '录音设备'],
    busySlots: ['15:00-17:00'],
    status: 'available',
    suitableFor: ['党委会议', '重要专题会', '保密议事'],
    notes: '优先保障党务活动；普通业务调度需确认无冲突后方可占用。',
  },
  {
    id: 'room-2f-multifunction',
    name: '二楼多功能厅',
    building: '主楼',
    floor: '2F',
    capacity: 50,
    layout: '可拼桌 / 剧院式两用',
    equipment: ['投影', '音响', '舞台灯', '茶歇区'],
    busySlots: ['10:00-12:00', '14:00-16:00'],
    status: 'busy',
    suitableFor: ['培训', '座谈', '中型动员'],
    notes: '今日上下午均有活动占用，临时加会请改期或换室。',
  },
  {
    id: 'room-1f-reception',
    name: '一楼接待会议室',
    building: '主楼',
    floor: '1F',
    capacity: 16,
    layout: '接待会客型',
    equipment: ['电视投屏', '茶水间邻近'],
    busySlots: ['09:00-09:45'],
    status: 'available',
    suitableFor: ['对外接待', '简短会商'],
    notes: '临近门厅，通行干扰较多，不宜开长时闭门调度会。',
  },
  {
    id: 'room-annex-b201',
    name: '附楼B201视频会议室',
    building: '附楼',
    floor: '2F',
    capacity: 18,
    layout: '视频会议专用',
    equipment: ['高清视频会议终端', '全向麦克', '双屏显示', '录播'],
    busySlots: [],
    status: 'available',
    suitableFor: ['远程会商', '跨区县视频调度', '混合式会议'],
    notes: '基层连线效果好；若有远程参会人员优先考虑。',
  },
  {
    id: 'room-6f-603',
    name: '六楼603小会议室',
    building: '主楼',
    floor: '6F',
    capacity: 6,
    layout: '方桌议事',
    equipment: ['电视投屏', '电话会议'],
    busySlots: [],
    status: 'available',
    suitableFor: ['两人至六人碰头', '会前预沟通'],
    notes: '仅适合极小范围；正式人员调度会容量不足。',
  },
  {
    id: 'room-4f-command',
    name: '四楼应急指挥会议室',
    building: '主楼',
    floor: '4F',
    capacity: 36,
    layout: '指挥席 + 观摩席',
    equipment: ['指挥大屏', '视频会商', '值班席位', '专线电话'],
    busySlots: ['08:00-08:40'],
    status: 'available',
    suitableFor: ['应急调度', '防汛防台会商', '突发情况研判'],
    notes: '应急优先；非应急类会议需报备总值班室。',
  },
  {
    id: 'room-8f-801',
    name: '八楼801贵宾会议室',
    building: '主楼',
    floor: '8F',
    capacity: 20,
    layout: '贵宾长桌',
    equipment: ['投影', '同传耳机预留', '录音'],
    busySlots: ['13:30-15:00'],
    status: 'maintenance',
    suitableFor: ['重要接待', '高层会商'],
    notes: '本周空调检修，暂停预约。',
  },
  {
    id: 'room-b1-training',
    name: '负一楼培训阶梯教室',
    building: '主楼',
    floor: 'B1',
    capacity: 100,
    layout: '阶梯教室',
    equipment: ['投影', '音响', '录播', '签到闸机'],
    busySlots: ['09:00-11:00'],
    status: 'available',
    suitableFor: ['集中培训', '大型宣讲'],
    notes: '不适合小型决策调度；进出需安检登记。',
  },
]

export function getMeetingRoomById(id: string): MeetingRoom | null {
  return MEETING_ROOMS.find((r) => r.id === id) ?? null
}

export function getMeetingRoomByName(name: string): MeetingRoom | null {
  const n = name.trim()
  return (
    MEETING_ROOMS.find((r) => r.name === n) ||
    MEETING_ROOMS.find((r) => r.name.includes(n) || n.includes(r.name)) ||
    null
  )
}
