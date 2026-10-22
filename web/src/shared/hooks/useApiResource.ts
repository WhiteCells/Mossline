import { useCallback } from 'react'
import { apiGet } from '../api/api'
import type { QueryParams } from '../api/types'
import type { ResourceState } from './resource'
import { useAsyncResource } from './useAsyncResource'

/** 将同源 GET 请求接入统一生命周期，查询对象需保持稳定引用 */
export function useApiResource<T>(
  path: string,
  parse: (data: unknown) => T,
  query?: QueryParams,
): ResourceState<T> {
  const load = useCallback(
    async (signal: AbortSignal) => parse(await apiGet(path, { query, signal })),
    [path, parse, query],
  )
  return useAsyncResource(load)
}
