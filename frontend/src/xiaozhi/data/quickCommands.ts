import type { GroupTask } from './groupTasks'

export interface QuickCommand {
  id: string
  label: string
  /** 点击后填入输入框的完整指令 */
  text: string
}

/**
 * 点击任务后，按任务状态给出快捷指令：
 * - 待分配：拆分工作 / 分配任务
 * - 进行中：询问进展 / 风险情况
 * - 已完成：成果成效
 */
export function quickCommandsForTask(task: GroupTask | null): QuickCommand[] {
  if (!task) return []
  const title = task.title

  if (task.status === 'unassigned') {
    return [
      {
        id: 'split',
        label: '拆分工作',
        text: `将「${title}」拆分成任务项，说明每项的目标与交付物`,
      },
      {
        id: 'assign',
        label: '分配任务',
        text: `把「${title}」的任务项按成员饱和度分配给合适的成员`,
      },
    ]
  }

  if (task.status === 'done') {
    return [
      {
        id: 'result',
        label: '成果成效',
        text: `「${title}」的成果成效如何？`,
      },
    ]
  }

  return [
    {
      id: 'progress',
      label: '询问进展',
      text: `「${title}」现在的进展情况如何？`,
    },
    {
      id: 'risk',
      label: '风险情况',
      text: `「${title}」有哪些风险和阻塞？`,
    },
  ]
}
