import { inject, type InjectionKey, type UnwrapNestedRefs } from 'vue'
import type { useGroupOperations } from './useGroupOperations'

export type OperationsContext = UnwrapNestedRefs<ReturnType<typeof useGroupOperations>>
export const operationsContextKey: InjectionKey<OperationsContext> = Symbol('operations-context')

export function useOperationsContext() {
  const context = inject(operationsContextKey)
  if (!context) throw new Error('小组协同作战上下文尚未初始化')
  return context
}
