import { apiGet, normalizeList } from './api'

function normalizePost(post) {
  return {
    ...post,
    desc: post.desc ?? post.description ?? '',
    category: typeof post.category === 'object' ? post.category.name : post.category || '未分类',
    tags: (post.tags || []).map((tag) => typeof tag === 'object' ? tag.name : tag),
    reading_time: post.reading_time || Math.max(1, Math.ceil((post.word || post.content?.length || 0) / 500)),
    comments_count: post.comments_count || 0,
    cover: post.cover || 'code',
  }
}

export async function getPosts({ signal, query } = {}) {
  const data = await apiGet('/api/post', { query: { page: 1, size: 100, ...query }, signal })
  return normalizeList(data, ['items', 'posts', 'post']).items.map(normalizePost)
}

export async function getPost(slug, signal) {
  return normalizePost(await apiGet(`/api/post/${encodeURIComponent(slug)}`, { signal }))
}
