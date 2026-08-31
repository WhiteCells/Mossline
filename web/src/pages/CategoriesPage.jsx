import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { PageHero } from '../components/PageHero'
import { PostCollection } from '../components/PostCollection'

const colors = ['pink', 'blue', 'green', 'amber']

export function CategoriesPage({ posts }) {
  const [params, setParams] = useSearchParams()
  const categoryNames = useMemo(() => [...new Set(posts.map((post) => post.category))], [posts])
  const requested = params.get('name')
  const active = categoryNames.includes(requested) ? requested : categoryNames[0]
  const filtered = posts.filter((post) => post.category === active)

  return (
    <>
      <PageHero eyebrow="COLLECTIONS" title="拾光分类" description="生活、旅途、技术与四季，被收进不同抽屉。循着感兴趣的方向，慢慢翻阅。" />
      <section className="inner-page section-shell">
        <div className="category-overview">
          {categoryNames.map((category, index) => {
            const count = posts.filter((post) => post.category === category).length
            return (
              <button key={category} className={active === category ? 'is-active' : ''} onClick={() => setParams({ name: category })}>
                <span className={`category-index ${colors[index % colors.length]}`}>0{index + 1}</span>
                <span><strong>{category}</strong><small>{count} 篇文章</small></span>
                <Icon name="arrow" size={17} />
              </button>
            )
          })}
        </div>
        <div className="collection-heading"><div><span>当前分类</span><h2>{active}</h2></div><small>{filtered.length} STORIES</small></div>
        <PostCollection posts={filtered} />
      </section>
    </>
  )
}
