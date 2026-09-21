import { computed, type Ref } from 'vue'
import { useReviews } from '../xiaozhi/data/reviews'
import type { KeyGroupStat, KeyPerson } from '../types/dashboard'

/** 每有一份成果经王处审核通过，重点群体的增量 */
export const KEY_GROUP_DELTA: Record<'A' | 'B', number> = { A: 2, B: 5 }

/**
 * 重点群体动态监测与审核联动：
 * 王处在 /team 通过一份待审成果后，A 类 +2、B 类 +5，
 * 并把 A 类名单前 2 位、B 类名单前 5 位标记为「新增」。
 * 台账由 reviews 的共享 store 驱动（含跨标签页同步），因此大屏会实时跟随。
 */
export function useKeyGroupPulse(
  keyGroups: Ref<KeyGroupStat[]>,
  keyPersons: Ref<KeyPerson[]>,
) {
  const { approved } = useReviews()

  /** 已审核通过的成果数 */
  const approvals = computed(() => approved.value.length)

  const deltaA = computed(() => KEY_GROUP_DELTA.A * approvals.value)
  const deltaB = computed(() => KEY_GROUP_DELTA.B * approvals.value)

  const groups = computed<KeyGroupStat[]>(() =>
    keyGroups.value.map((group) => {
      // 计数保持基线不变，只挂上本轮增量（红色 +N）
      if (group.type === 'A') return { ...group, delta: deltaA.value }
      if (group.type === 'B') return { ...group, delta: deltaB.value }
      return { ...group, delta: 0 }
    }),
  )

  /** A/B 名单里需要打「新增」标记的人数（按出现顺序取前 N 位） */
  const persons = computed<KeyPerson[]>(() => {
    let seenA = 0
    let seenB = 0
    return keyPersons.value.map((person) => {
      if (person.type === 'A') {
        seenA += 1
        return { ...person, isNew: seenA <= deltaA.value }
      }
      if (person.type === 'B') {
        seenB += 1
        return { ...person, isNew: seenB <= deltaB.value }
      }
      return person
    })
  })

  return { approvals, groups, persons, deltaA, deltaB }
}
