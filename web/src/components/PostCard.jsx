import { Icon } from './Icon'
import { Link } from 'react-router-dom'

function CoverArt({ variant, title }) {
  return (
    <div className={`cover-art cover-art--${variant}`} role="img" aria-label={`${title}的抽象插画封面`}>
      <span className="cover-orb" />
      <span className="cover-shape shape-one" />
      <span className="cover-shape shape-two" />
      <span className="cover-line" />
      <small>MOSSLINE · JOURNAL</small>
    </div>
  )
}

export function PostCard({ post, index }) {
  return (
    <article className={`post-card ${index % 2 ? 'is-reversed' : ''}`}>
      <Link className="post-cover" to={`/articles?q=${encodeURIComponent(post.title)}`} aria-label={`查看《${post.title}》`}>
        <CoverArt variant={post.cover} title={post.title} />
        <span className="post-number">/ {post.id}</span>
      </Link>
      <div className="post-content">
        <div className="post-topline">
          <span>{post.category}</span>
          <time dateTime={post.published_at}>{post.published_at.replaceAll('-', '.')}</time>
        </div>
        <h3><Link to={`/articles?q=${encodeURIComponent(post.title)}`}>{post.title}</Link></h3>
        <p>{post.desc}</p>
        <div className="post-tags">
          {post.is_top && <span className="top-tag"><Icon name="spark" size={13} /> 置顶</span>}
          {post.tags.map((tag) => <span key={tag}># {tag}</span>)}
        </div>
        <div className="post-footer">
          <div className="post-stats">
            <span><Icon name="clock" size={15} /> {post.reading_time} 分钟</span>
            <span><Icon name="eye" size={15} /> {post.view_count.toLocaleString()}</span>
            <span><Icon name="message" size={15} /> {post.comments_count}</span>
          </div>
          <Link className="read-more" to={`/articles?q=${encodeURIComponent(post.title)}`}><span>查看文章</span><Icon name="arrow" size={18} /></Link>
        </div>
      </div>
    </article>
  )
}
