import { isRecord } from './record.ts'
import type { RequestOptions } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown
  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

/** 请求同源公开接口并解包响应，取消请求时保留原始错误 */
export async function apiGet(
  path: string,
  { query, signal }: RequestOptions = {},
): Promise<unknown> {
  const url = new URL(path, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  let response: Response
  try {
    response = await fetch(`${url.pathname}${url.search}`, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof Error && error.name === 'AbortError')
    )
      throw error
    throw new ApiError('无法连接到服务器，请检查网络后重试', 0, null)
  }

  const payload: unknown = await response.json().catch(() => null)
  const message =
    isRecord(payload) && typeof payload.msg === 'string'
      ? payload.msg
      : `请求失败（${response.status}）`
  if (!response.ok) throw new ApiError(message, response.status, payload)
  if (
    !isRecord(payload) ||
    typeof payload.code !== 'number' ||
    !Number.isFinite(payload.code)
  ) {
    throw new ApiError('服务器返回了无效的响应格式', response.status, payload)
  }
  if (payload.code < 200 || payload.code >= 300) {
    throw new ApiError(message, payload.code, payload)
  }
  return payload.data
}
