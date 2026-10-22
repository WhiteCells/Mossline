import { apiGet } from '../../shared/api/api'
import { normalizeList } from '../../shared/api/pagination'
import { normalizePost } from './normalizePost'
import type { Post } from './types'

const PAGE_SIZE = 200

/** 顺序读取所有分页，统一转换后交给首页、分类和搜索共用 */
export async function getPosts({
  signal,
}: { signal?: AbortSignal } = {}): Promise<Post[]> {
  const loadPage = async (page: number) =>
    normalizeList(
      await apiGet('/api/post', {
        query: { page, size: PAGE_SIZE },
        signal,
      }),
    )
  const first = await loadPage(1)
  const items = [...first.items]
  for (let page = 2; page <= first.pagination.total_pages; page += 1) {
    items.push(...(await loadPage(page)).items)
  }
  return items.map(normalizePost)
}

/** 编码 Slug 路径参数，详情切换与卸载时由调用方取消请求 */
export async function getPost(
  slug: string,
  signal?: AbortSignal,
): Promise<Post> {
  return normalizePost(
    await apiGet(`/api/post/${encodeURIComponent(slug)}`, { signal }),
  )
}
