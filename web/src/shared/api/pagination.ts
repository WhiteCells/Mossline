import { isRecord } from './record.ts'
import type { Page } from './types'

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback
}

/** 规范分页元数据，缺失或非法字段使用当前页的安全默认值 */
export function normalizeList(data: unknown): Page<unknown> {
  const record = isRecord(data) ? data : {}
  const items: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray(record.items)
      ? record.items
      : []
  const pagination = isRecord(record.pagination) ? record.pagination : {}
  return {
    items,
    pagination: {
      page: Math.max(1, nonNegativeInteger(pagination.page, 1)),
      size: nonNegativeInteger(pagination.size, items.length),
      total: nonNegativeInteger(pagination.total, items.length),
      total_pages: nonNegativeInteger(pagination.total_pages, 1),
    },
  }
}
