import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMoments } from './parseMoments.ts'

const moment = {
  id: 1,
  content: '正文',
  visibility: 'public',
  created_at: '2026-10-16T00:00:00Z',
  published_at: null,
}

test('空附件可展示，有附件时逐个校验', () => {
  assert.deepEqual(
    parseMoments({ items: [{ ...moment, attachments: null }] })[0]?.attachments,
    [],
  )
  assert.throws(
    () =>
      parseMoments({
        items: [{ ...moment, attachments: [{ id: 2, url: null }] }],
      }),
    /无效的动态附件/,
  )
})

test('拒绝无效可见性和缺失正文', () => {
  assert.throws(
    () => parseMoments({ items: [{ ...moment, visibility: 'draft' }] }),
    /可见性无效/,
  )
  assert.throws(
    () => parseMoments({ items: [{ ...moment, content: null }] }),
    /无效的动态数据/,
  )
})
