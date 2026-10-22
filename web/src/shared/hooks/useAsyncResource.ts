import { useEffect, useReducer, useState } from 'react'
import type { AsyncState, ResourceState } from './resource'

/** 重试或切换资源时取消旧请求，卸载后忽略旧结果 */
export function useAsyncResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
): ResourceState<T> {
  const [revision, retry] = useReducer((value: number) => value + 1, 0)
  const [state, setState] = useState<AsyncState<T>>({
    status: 'loading',
    data: null,
    error: null,
  })
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading', data: null, error: null })
    void load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted)
          setState({ status: 'success', data, error: null })
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            data: null,
            error: error instanceof Error ? error : new Error('请求失败'),
          })
      },
    )
    return () => controller.abort()
  }, [load, revision])
  return { ...state, retry }
}
