import {
  Connection,
  Lock,
  Monitor,
  OfficeBuilding,
  Promotion,
  UserFilled,
  View,
} from '@element-plus/icons-vue'

const groupIconMap = {
  x: UserFilled,
  y: Monitor,
  z: Lock,
  e: OfficeBuilding,
  f: View,
  g: Promotion,
}

export const groupIconFor = (groupId: string) =>
  groupIconMap[groupId as keyof typeof groupIconMap] ?? Connection
