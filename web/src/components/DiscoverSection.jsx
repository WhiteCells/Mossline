import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

export function DiscoverSection({ posts }) {
  const [liked, setLiked] = useState(false)
  const navigate = useNavigate()
  const categories = [...new Set(posts.map((post) => post.category))].slice(0, 4).map((name, index) => ({ name, count: posts.filter((post) => post.category === name).length, color: ['pink', 'blue', 'green', 'amber'][index] }))
  const tags = [...new Set(posts.flatMap((post) => post.tags))].slice(0, 10)

  return (
    <section className="discover-section">
      <div className="section-shell">
        <div className="section-heading centered">
          <div>
            <span className="eyebrow"><i /> WANDER &amp; DISCOVER <i /></span>
            <h2>沿着苔痕去发现</h2>
          </div>
          <p>文字有许多入口，愿你从喜欢的地方开始。</p>
        </div>

        <div className="discover-grid">
          <article className="category-panel">
            <header><span>拾光分类</span><small>CATEGORIES</small></header>
            <div className="category-list">
              {categories.map((category, index) => (
                <button key={category.name} onClick={() => navigate(`/categories?name=${encodeURIComponent(category.name)}`)}>
                  <span className={`category-index ${category.color}`}>0{index + 1}</span>
                  <strong>{category.name}</strong>
                  <small>{category.count} 篇</small>
                  <Icon name="arrow" size={16} />
                </button>
              ))}
            </div>
          </article>

          <article className="moment-panel">
            <div className="moment-date"><strong>—</strong><span>LIVE<br />NOW</span></div>
            <div className="moment-art"><span className="moment-sun" /><span className="moment-hill one" /><span className="moment-hill two" /></div>
            <div className="moment-copy">
              <span className="eyebrow"><i /> TODAY'S MOMENT</span>
              <blockquote>“每一篇文字，<br />都从真实的数据里抵达。”</blockquote>
              <p>内容由 Mossline API 实时提供</p>
            </div>
            <button className={`like-button ${liked ? 'is-liked' : ''}`} onClick={() => setLiked((value) => !value)} aria-label={liked ? '取消喜欢' : '喜欢这条动态'}>
              <Icon name="heart" size={18} /> <span>{liked ? 1 : 0}</span>
            </button>
          </article>
        </div>

        <div className="tag-panel">
          <div className="tag-copy"><span>散落的关键词</span><small>从一个词开始漫游</small></div>
          <div className="tag-cloud">
            {tags.map((tag, index) => <button key={tag} className={index === 0 ? 'featured' : ''} onClick={() => navigate(`/tags?name=${encodeURIComponent(tag)}`)}>#{tag}</button>)}
          </div>
        </div>
      </div>
    </section>
  )
}
