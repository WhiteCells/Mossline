import { posts } from '../data/posts'

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration))

export async function getPosts() {
  // 文章接口落地后，可将此处替换为 GET /api/post 并保留组件层不变。
  await wait(620)
  return posts
}
