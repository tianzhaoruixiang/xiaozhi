/**
 * 开发期调试入口：浏览器控制台里用 window.__xiaozhi 直接查看/操作各台账，
 * 便于排查「提交审核 → 待审核 +1 → 通过 → 交高总」这条链路。
 */
import { resetGroupTasks, useGroupTasks } from './groupTasks'
import { resetReviews, useReviews } from './reviews'
import { usePersonalTasks } from './personalTasks'

export function installDebugBridge() {
  if (!import.meta.env.DEV) return

  const reviews = useReviews()
  const groups = useGroupTasks()
  const personal = usePersonalTasks()

  const api = {
    reviews,
    groups,
    personal,
    resetReviews,
    resetGroupTasks,
    /** 一眼看清当前链路状态 */
    status: () => ({
      待审核: reviews.pending.value.map((item) => ({
        任务: item.taskTitle,
        提交人: item.submittedBy,
        文件: item.fileName,
        状态: item.status,
      })),
      已交高总: reviews.approved.value.map((item) => ({
        任务: item.taskTitle,
        审核人: item.reviewedBy,
        转交: item.forwardedTo,
      })),
      本组任务: groups.currentGroup.value?.tasks.map((task) => ({
        任务: task.title,
        状态: task.status,
        负责人: task.owner || '待分配',
        进度: task.progress,
      })),
      个人台专项任务: personal.specialTasks.value.map((task) => ({
        任务: task.title,
        状态: task.status,
      })),
    }),
  }

  ;(window as unknown as Record<string, unknown>).__xiaozhi = api
  console.log(
    '[小智] 调试入口就绪：window.__xiaozhi —— 试 __xiaozhi.status()，或 __xiaozhi.reviews.resetReviews()',
  )
}
