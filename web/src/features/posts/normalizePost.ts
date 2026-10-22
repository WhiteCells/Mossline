import { isRecord } from '../../shared/api/record.ts'
import type { Post } from './types'

function finiteNumber(value: unknown): number | null {
  try {
    const number = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(number) ? number : null
  } catch {
    return null
  }
}
function nonNegativeNumber(value: unknown, fallback = 0): number {
  const number = finiteNumber(value)
  return number !== null && number >= 0 ? number : fallback
}
function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}
function categoryName(category: unknown): string {
  const value = isRecord(category) ? category.name : category
  return typeof value === 'string' && value.trim() ? value : '未分类'
}
function tagNames(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags.flatMap((tag: unknown) => {
    const value = isRecord(tag) ? tag.name : tag
    return typeof value === 'string' && value.trim() ? [value] : []
  })
}
/** 校验接口文章字段，页面只接收结构稳定的展示模型 */
export function normalizePost(input: unknown): Post {
  const source = isRecord(input) ? input : {}
  const content = text(source.content)
  const wordCount = nonNegativeNumber(source.word, content.length)
  const readingTime = finiteNumber(source.reading_time)
  return {
    id:
      typeof source.id === 'number' || typeof source.id === 'string'
        ? source.id
        : '',
    title: text(source.title),
    slug: text(source.slug),
    desc: text(source.desc, text(source.description)),
    category: categoryName(source.category),
    tags: tagNames(source.tags),
    content,
    cover: text(source.cover) || 'code',
    is_top: source.is_top === true,
    reading_time:
      readingTime !== null && readingTime > 0
        ? readingTime
        : Math.max(1, Math.ceil(wordCount / 500)),
    view_count: nonNegativeNumber(source.view_count),
    comments_count: nonNegativeNumber(source.comments_count),
    published_at:
      typeof source.published_at === 'string' ? source.published_at : null,
  }
}
