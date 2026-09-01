export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export async function apiGet(path, { query, signal } = {}) {
  const url = new URL(path, window.location.origin)
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  })
  let response
  try {
    response = await fetch(`${url.pathname}${url.search}`, { headers: { Accept: 'application/json' }, signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('无法连接到服务器，请检查网络后重试。', 0, null)
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(payload?.msg || `请求失败（${response.status}）`, response.status, payload)
  if (payload && typeof payload === 'object' && 'code' in payload) {
    if (Number(payload.code) < 200 || Number(payload.code) >= 300) throw new ApiError(payload.msg || '请求失败', Number(payload.code), payload)
    return payload.data
  }
  return payload
}

export function normalizeList(data, keys = ['items']) {
  if (Array.isArray(data)) return { items: data, pagination: { page: 1, size: data.length, total: data.length, total_pages: 1 } }
  const items = keys.map((key) => data?.[key]).find(Array.isArray) || []
  return { items, pagination: data?.pagination || { page: 1, size: items.length, total: items.length, total_pages: 1 } }
}
