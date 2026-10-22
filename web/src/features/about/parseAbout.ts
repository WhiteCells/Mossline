import { isRecord } from '../../shared/api/record.ts'

export interface About {
  content: string
}

/** 关于页只接收文本正文，避免把任意接口对象传给 Markdown */
export function parseAbout(data: unknown): About {
  if (!isRecord(data) || typeof data.content !== 'string') {
    throw new Error('服务器返回了无效的关于页数据')
  }
  return { content: data.content }
}
