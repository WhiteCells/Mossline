import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { MarkdownContent } from '../components/MarkdownContent'
import { getPost } from '../services/posts'

export function ArticleDetailPage() {
  const { slug } = useParams()
  const [state, setState] = useState({ status: 'loading', post: null, error: null })
  const load = useCallback(() => {
    const controller = new AbortController()
    setState((current) => ({ ...current, status: 'loading', error: null }))
    getPost(slug, controller.signal).then((post) => setState({ status: 'success', post, error: null })).catch((error) => { if (error.name !== 'AbortError') setState({ status: 'error', post: null, error }) })
    return controller
  }, [slug])
  useEffect(() => { const controller = load(); return () => controller.abort() }, [load])
  const { post } = state
  return <section className="article-detail section-shell"><AsyncState status={state.status} error={state.error} onRetry={load}>{post && <>
    <Link className="article-back" to="/articles"><Icon name="arrow" size={16} /> 返回文章</Link>
    <header className="article-detail-header"><span className="eyebrow"><i /> {post.category}</span><h1>{post.title}</h1><p>{post.desc}</p><div className="article-meta"><time>{post.published_at?.slice(0, 10)}</time><span><Icon name="clock" size={15} />{post.reading_time} 分钟</span><span><Icon name="eye" size={15} />{post.view_count || 0}</span></div><div className="post-tags">{post.tags.map((tag) => <Link key={tag} to={`/tags?name=${encodeURIComponent(tag)}`}># {tag}</Link>)}</div></header>
    {post.cover?.startsWith('/') || post.cover?.startsWith('http') ? <img className="article-cover" src={post.cover} alt="" /> : null}
    <MarkdownContent>{post.content}</MarkdownContent>
  </>}</AsyncState></section>
}
