import { Link } from 'react-router-dom'
import { DiscoverSection } from '../components/DiscoverSection'
import { Hero } from '../components/Hero'
import { Icon } from '../components/Icon'
import { Newsletter } from '../components/Newsletter'
import { PostCard } from '../components/PostCard'

export function HomePage({ posts, status }) {
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
          {status === 'success' && posts.slice(0, 3).map((post, index) => <PostCard key={post.id} post={post} index={index} />)}
        </div>
        {status === 'success' && <Link className="page-link-button" to="/articles">查看全部文章 <Icon name="arrow" size={18} /></Link>}
      </section>
      <DiscoverSection posts={posts} />
      <Newsletter />
    </>
  )
}
