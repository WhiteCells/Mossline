import type { Post } from './types'
import { Icon } from '../../shared/ui/Icon'
import { Link } from 'react-router-dom'

import { CoverArt } from './CoverArt'

interface PostCardProps {
  post: Post
  index: number
}

export function PostCard({ post, index }: PostCardProps) {
  const path = `/articles/${encodeURIComponent(post.slug)}`
  return (
    <article className={`post-card ${index % 2 ? 'is-reversed' : ''}`}>
      <Link
        className="post-cover"
        to={path}
        aria-label={`查看《${post.title}》`}
      >
        {post.cover?.startsWith('/') || post.cover?.startsWith('http') ? (
          <img
            className="post-cover-image"
            src={post.cover}
            alt=""
            loading="lazy"
          />
        ) : (
          <CoverArt variant={post.cover} title={post.title} />
        )}
        <span className="post-number">/ {post.id}</span>
      </Link>
      <div className="post-content">
        <div className="post-topline">
          <span>{post.category}</span>
          <time dateTime={post.published_at ?? undefined}>
            {post.published_at
              ? post.published_at.slice(0, 10).replaceAll('-', '.')
              : '尚未发布'}
          </time>
        </div>
        <h3>
          <Link to={path}>{post.title}</Link>
        </h3>
        <p>{post.desc}</p>
        <div className="post-tags">
          {post.is_top && (
            <span className="top-tag">
              <Icon name="spark" size={13} /> 置顶
            </span>
          )}
          {post.tags.map((tag) => (
            <span key={tag}># {tag}</span>
          ))}
        </div>
        <div className="post-footer">
          <div className="post-stats">
            <span>
              <Icon name="clock" size={15} /> {post.reading_time} 分钟
            </span>
            <span>
              <Icon name="eye" size={15} /> {post.view_count.toLocaleString()}
            </span>
            <span>
              <Icon name="message" size={15} /> {post.comments_count}
            </span>
          </div>
          <Link
            className="read-more"
            to={path}
            aria-label={`阅读《${post.title}》`}
          >
            <span>查看文章</span>
            <Icon name="arrow" size={18} />
          </Link>
        </div>
      </div>
    </article>
  )
}
