import { isRecord } from '../../shared/api/record.ts'
import { normalizeList } from '../../shared/api/pagination.ts'
import type { Friend } from './types'

/** 校验展示必需字段，异常响应交由页面的错误状态处理 */
export function parseFriends(data: unknown): Friend[] {
  return normalizeList(data).items.map((item) => {
    if (
      !isRecord(item) ||
      (typeof item.id !== 'string' && typeof item.id !== 'number') ||
      typeof item.name !== 'string' ||
      typeof item.uri !== 'string'
    ) {
      throw new Error('服务器返回了无效的友链数据')
    }
    return {
      id: item.id,
      name: item.name,
      uri: item.uri,
      logo: typeof item.logo === 'string' ? item.logo : undefined,
      desc: typeof item.desc === 'string' ? item.desc : undefined,
    }
  })
}
