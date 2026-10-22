import type { Post } from './types'
import { PostCard } from './PostCard'

interface PostCollectionProps {
  posts: Post[]
  emptyTitle?: string
  emptyDescription?: string
}

export function PostCollection({
  posts,
  emptyTitle = '这里还没有留下痕迹',
  emptyDescription = '新的故事正在慢慢生长。',
}: PostCollectionProps) {
  if (!posts.length) {
    return (
      <div className="state-panel empty-panel">
        <div className="empty-illustration">
          <span />
          <i />
        </div>
        <h3>{emptyTitle}</h3>
        <p>{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className="posts-list">
      {posts.map((post, index) => (
        <PostCard key={post.id} post={post} index={index} />
      ))}
    </div>
  )
}
