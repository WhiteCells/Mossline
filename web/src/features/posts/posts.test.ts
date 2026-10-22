import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizePost } from './normalizePost.ts'

test('normalizePost preserves valid public post fields', () => {
  const post = normalizePost({
    id: 7,
    title: '一篇文章',
    slug: 'a-post',
    desc: '摘要',
    category: { id: 2, name: '技术' },
    tags: [{ id: 3, name: 'React' }, '随笔'],
    content: '# 正文',
    reading_time: 4,
    view_count: 12,
    comments_count: 3,
    cover: '/uploads/cover.png',
    published_at: '2026-09-02T00:00:00Z',
  })

  assert.equal(post.category, '技术')
  assert.deepEqual(post.tags, ['React', '随笔'])
  assert.equal(post.reading_time, 4)
  assert.equal(post.view_count, 12)
  assert.equal(post.comments_count, 3)
  assert.equal(post.cover, '/uploads/cover.png')
  assert.equal(post.published_at, '2026-09-02T00:00:00Z')
})

test('normalizePost accepts an uncategorized post and discards invalid tags', () => {
  const post = normalizePost({
    category: null,
    tags: [null, {}, { name: null }, 7, false, '', '旅行', { name: '日常' }],
    content: 'x'.repeat(501),
    view_count: null,
    comments_count: undefined,
    cover: null,
  })

  assert.equal(post.category, '未分类')
  assert.deepEqual(post.tags, ['旅行', '日常'])
  assert.equal(post.reading_time, 2)
  assert.equal(post.view_count, 0)
  assert.equal(post.comments_count, 0)
  assert.equal(post.cover, 'code')
  assert.equal(post.published_at, null)
})

test('normalizePost gives display fields safe values for malformed input', () => {
  const post = normalizePost({
    desc: null,
    description: '备用摘要',
    category: { name: 123 },
    tags: 'not-an-array',
    content: null,
    reading_time: -1,
    view_count: Number.POSITIVE_INFINITY,
    comments_count: '5',
    cover: 42,
    published_at: 123,
  })

  assert.equal(post.desc, '备用摘要')
  assert.equal(post.category, '未分类')
  assert.deepEqual(post.tags, [])
  assert.equal(post.content, '')
  assert.equal(post.reading_time, 1)
  assert.equal(post.view_count, 0)
  assert.equal(post.comments_count, 5)
  assert.equal(post.cover, 'code')
  assert.equal(post.published_at, null)
  assert.doesNotThrow(() => post.view_count.toLocaleString())
})
