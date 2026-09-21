/** 豆包风 3D Q 版智能体头像（原创插画，非官方 IP） */
import imgQingya from '../assets/avatars/avatar-qingya.png'
import imgDoumi from '../assets/avatars/avatar-doumi.png'
import imgLanxin from '../assets/avatars/avatar-lanxin.png'
import imgCuiwei from '../assets/avatars/avatar-cuiwei.png'
import imgTaoyao from '../assets/avatars/avatar-taoyao.png'
import imgXinghe from '../assets/avatars/avatar-xinghe.png'
import imgJinyu from '../assets/avatars/avatar-jinyu.png'
import imgMozhu from '../assets/avatars/avatar-mozhu.png'
import imgYanzi from '../assets/avatars/avatar-yanzi.png'
import imgShuilan from '../assets/avatars/avatar-shuilan.png'
import imgZisu from '../assets/avatars/avatar-zisu.png'
import imgSonglu from '../assets/avatars/avatar-songlu.png'

export interface AgentAvatarPreset {
  id: string
  label: string
  /** 圆形底色（兜底 / 边框光晕） */
  bg: [string, string]
  /** 3D 头像图 */
  src: string
}

export const AGENT_AVATAR_PRESETS: AgentAvatarPreset[] = [
  {
    id: 'xiaozhi',
    label: '小智',
    bg: ['#d9f7e8', '#5dcb9a'],
    src: imgCuiwei,
  },
  {
    id: 'qingya',
    label: '青芽',
    bg: ['#d8f5ff', '#7ec8e8'],
    src: imgQingya,
  },
  {
    id: 'doumi',
    label: '豆米',
    bg: ['#fff0d6', '#f0b45a'],
    src: imgDoumi,
  },
  {
    id: 'lanxin',
    label: '岚心',
    bg: ['#e4e9ff', '#8b9cf0'],
    src: imgLanxin,
  },
  {
    id: 'cuiwei',
    label: '翠微',
    bg: ['#d9f7e8', '#5dcb9a'],
    src: imgCuiwei,
  },
  {
    id: 'taoyao',
    label: '桃夭',
    bg: ['#ffe4ec', '#f08aaa'],
    src: imgTaoyao,
  },
  {
    id: 'xinghe',
    label: '星河',
    bg: ['#e0e6ff', '#6a7fd8'],
    src: imgXinghe,
  },
  {
    id: 'jinyu',
    label: '金榆',
    bg: ['#fff6d0', '#e0c060'],
    src: imgJinyu,
  },
  {
    id: 'mozhu',
    label: '墨竹',
    bg: ['#e8eef2', '#7a90a0'],
    src: imgMozhu,
  },
  {
    id: 'yanzi',
    label: '焰子',
    bg: ['#ffe8de', '#f07858'],
    src: imgYanzi,
  },
  {
    id: 'shuilan',
    label: '水蓝',
    bg: ['#d6f0ff', '#4eb0e0'],
    src: imgShuilan,
  },
  {
    id: 'zisu',
    label: '紫苏',
    bg: ['#f0e4ff', '#a888e0'],
    src: imgZisu,
  },
  {
    id: 'songlu',
    label: '松露',
    bg: ['#e8f2dc', '#88b060'],
    src: imgSonglu,
  },
]

/** 小智固定头像（青绿豆包风妹子） */
export const XIAOZHI_AVATAR_ID = 'cuiwei'

/** 已知专家 → 固定头像，保证每次协作视觉稳定 */
export const AGENT_AVATAR_BY_ID: Record<string, string> = {
  xiaozhi: 'cuiwei',
  'brief-agent': 'cuiwei',
  'context-analyst': 'qingya',
  'room-coordinator': 'doumi',
  'director-scheduler': 'lanxin',
  'security-management-expert': 'mozhu',
  'archive-researcher': 'mozhu',
  'notice-dispatcher': 'taoyao',
  'schedule-expert': 'xinghe',
  'meeting-expert': 'shuilan',
  'knowledge-expert': 'mozhu',
  'liaison-expert': 'yanzi',
  'xhs-sourcer': 'yanzi',
  'linkedin-sourcer': 'xinghe',
  'maimai-sourcer': 'jinyu',
  'candidate-synthesizer': 'songlu',
  'online-talk-script': 'shuilan',
  'online-call-scheduler': 'zisu',
  'online-plan-synthesizer': 'qingya',
  'offline-invite-scripter': 'taoyao',
  'offline-meetup-coordinator': 'lanxin',
  'offline-plan-synthesizer': 'mozhu',
}

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

export function getAvatarPreset(id: string): AgentAvatarPreset {
  return (
    AGENT_AVATAR_PRESETS.find((p) => p.id === id) ?? AGENT_AVATAR_PRESETS[0]
  )
}

/** 按智能体 id 稳定映射到预设头像 */
export function pickAgentAvatarId(agentId: string): string {
  const key = (agentId || '').toLowerCase().trim()
  if (key === 'general-assistant') return XIAOZHI_AVATAR_ID
  if (AGENT_AVATAR_BY_ID[key]) return AGENT_AVATAR_BY_ID[key]

  const idx = hashString(key || 'agent') % AGENT_AVATAR_PRESETS.length
  const picked = AGENT_AVATAR_PRESETS[idx]
  if (picked.id === XIAOZHI_AVATAR_ID && AGENT_AVATAR_PRESETS.length > 1) {
    return AGENT_AVATAR_PRESETS[(idx + 1) % AGENT_AVATAR_PRESETS.length].id
  }
  return picked.id
}
