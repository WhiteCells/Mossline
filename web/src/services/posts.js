import { apiGet, normalizeList } from './api.js'
import { normalizePost } from './normalizePost.js'

export { normalizePost } from './normalizePost.js'

export async function getPosts({ signal, query } = {}) {
  const first = normalizeList(await apiGet('/api/post', { query: { page: 1, size: 200, ...query }, signal }), ['items', 'posts', 'post'])
  const items = [...first.items]
  for (let page = 2; page <= first.pagination.total_pages; page += 1) {
    const next = normalizeList(await apiGet('/api/post', { query: { page, size: 200, ...query }, signal }), ['items', 'posts', 'post'])
    items.push(...next.items)
  }
  return items.map(normalizePost)
}

export async function getPost(slug, signal) {
  return normalizePost(await apiGet(`/api/post/${encodeURIComponent(slug)}`, { signal }))
}
