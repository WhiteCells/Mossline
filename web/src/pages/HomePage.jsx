import { Link } from 'react-router-dom'
import { DiscoverSection } from '../components/DiscoverSection'
import { Hero } from '../components/Hero'
import { Icon } from '../components/Icon'
import { Newsletter } from '../components/Newsletter'
import { PostCard } from '../components/PostCard'

export function HomePage({ posts, status, retry }) {
  return (
    <>
      <Hero />
      <section className="articles-section section-shell" id="home-stories">
        <div className="section-heading">
          <div><span className="eyebrow"><i /> LATEST STORIES</span><h2>最近的书写</h2></div>
          <p>把平凡日子里闪光的片刻，认真地写下来。</p>
        </div>
        <div className="posts-list">
          {status === 'loading' && <div className="state-panel home-loading"><span className="loading-leaf"><Icon name="leaf" /></span><p>正在翻开最近的故事…</p></div>}
          {status === 'error' && <div className="state-panel error-panel"><span className="state-icon">!</span><h3>最近的故事暂时无法抵达</h3><p>请检查网络连接后重试。</p><button className="primary-button" onClick={retry}>重新加载 <Icon name="arrow" size={17} /></button></div>}
          {status === 'success' && posts.length === 0 && <div className="state-panel empty-panel"><div className="empty-illustration"><span /><i /></div><h3>这里还没有留下痕迹</h3><p>第一篇故事正在慢慢生长。</p></div>}
          {status === 'success' && posts.slice(0, 3).map((post, index) => <PostCard key={post.id} post={post} index={index} />)}
        </div>
        {status === 'success' && <Link className="page-link-button" to="/articles">查看全部文章 <Icon name="arrow" size={18} /></Link>}
      </section>
      <DiscoverSection posts={posts} />
      <Newsletter />
    </>
  )
}
