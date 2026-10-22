import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AsyncState } from '../../shared/ui/AsyncState'
import { Icon } from '../../shared/ui/Icon'
import { MarkdownContent } from '../../shared/ui/MarkdownContent'
import type { Post } from './types'
import { useAsyncResource } from '../../shared/hooks/useAsyncResource'
import { getPost } from './posts'

interface ArticleHeaderProps {
  post: Post
}

function ArticleHeader({ post }: ArticleHeaderProps) {
  return (
    <header className="article-detail-header">
      <span className="eyebrow">
        <i /> {post.category}
      </span>
      <h1>{post.title}</h1>
      <p>{post.desc}</p>
      <div className="article-meta">
        <time>{post.published_at?.slice(0, 10)}</time>
        <span>
          <Icon name="clock" size={15} />
          {post.reading_time} 分钟
        </span>
        <span>
          <Icon name="eye" size={15} />
          {post.view_count || 0}
        </span>
      </div>
      <div className="post-tags">
        {post.tags.map((tag) => (
          <Link key={tag} to={`/tags?name=${encodeURIComponent(tag)}`}>
            # {tag}
          </Link>
        ))}
      </div>
    </header>
  )
}

export function ArticleDetailPage() {
  const { slug } = useParams()
  const load = useCallback(
    (signal: AbortSignal) => getPost(slug ?? '', signal),
    [slug],
  )
  const { data: post, status, error, retry } = useAsyncResource(load)
  const hasCover =
    post?.cover?.startsWith('/') || post?.cover?.startsWith('http')

  return (
    <section className="article-detail section-shell">
      <AsyncState status={status} error={error} onRetry={retry}>
        {post && (
          <>
            <Link className="article-back" to="/articles">
              <Icon name="arrow" size={16} /> 返回文章
            </Link>
            <ArticleHeader post={post} />
            {hasCover ? (
              <img className="article-cover" src={post.cover} alt="" />
            ) : null}
            <MarkdownContent>{post.content}</MarkdownContent>
          </>
        )}
      </AsyncState>
    </section>
  )
}
