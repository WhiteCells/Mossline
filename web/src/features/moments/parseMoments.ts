import { isRecord } from '../../shared/api/record.ts'
import { normalizeList } from '../../shared/api/pagination.ts'
import type { Moment, MomentAttachment } from './types'

function parseAttachment(item: unknown): MomentAttachment {
  if (
    !isRecord(item) ||
    (typeof item.id !== 'string' && typeof item.id !== 'number') ||
    typeof item.url !== 'string' ||
    typeof item.mime_type !== 'string' ||
    typeof item.name !== 'string'
  ) {
    throw new Error('服务器返回了无效的动态附件')
  }
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    mime_type: item.mime_type,
  }
}

/** 校验动态及其附件，允许没有附件的动态 */
export function parseMoments(data: unknown): Moment[] {
  return normalizeList(data).items.map((item) => {
    if (
      !isRecord(item) ||
      (typeof item.id !== 'string' && typeof item.id !== 'number') ||
      typeof item.content !== 'string' ||
      typeof item.created_at !== 'string'
    ) {
      throw new Error('服务器返回了无效的动态数据')
    }
    const visibility = item.visibility
    if (
      visibility !== 'public' &&
      visibility !== 'private' &&
      visibility !== 'unlisted'
    )
      throw new Error('动态可见性无效')
    return {
      id: item.id,
      content: item.content,
      visibility,
      created_at: item.created_at,
      published_at:
        typeof item.published_at === 'string' ? item.published_at : null,
      attachments: Array.isArray(item.attachments)
        ? item.attachments.map(parseAttachment)
        : [],
    }
  })
}
