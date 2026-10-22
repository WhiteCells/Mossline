import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeList } from './pagination.ts'

test('保留服务端分页并支持空列表', () => {
  assert.deepEqual(
    normalizeList({
      items: ['a'],
      pagination: { page: 2, size: 20, total: 45, total_pages: 3 },
    }),
    {
      items: ['a'],
      pagination: { page: 2, size: 20, total: 45, total_pages: 3 },
    },
  )
  assert.deepEqual(normalizeList(null).items, [])
  assert.deepEqual(normalizeList(['a']).items, ['a'])
})

test('非法分页字段回退，防止无限分页请求', () => {
  const result = normalizeList({
    items: ['a'],
    pagination: { page: 0, size: -1, total: 0.5, total_pages: Infinity },
  })
  assert.deepEqual(result.pagination, {
    page: 1,
    size: 1,
    total: 1,
    total_pages: 1,
  })
})
