/** 文章展示模型，分类和标签已转换为名称 */
export interface Post {
  id: string | number
  title: string
  slug: string
  desc: string
  category: string
  tags: string[]
  content: string
  cover: string
  is_top: boolean
  reading_time: number
  view_count: number
  comments_count: number
  published_at: string | null
}
