import type { Post } from './types'
import type { ResourceState } from '../../shared/hooks/resource'
import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../shared/ui/Icon'
import { PostCard } from './PostCard'

const PAGE_SIZE = 3

import { PostSkeleton } from './PostSkeleton'

interface PostsSectionProps {
  resource: ResourceState<Post[]>
  searchQuery: string
  onClearSearch: () => void
}

export function PostsSection({
  resource,
  searchQuery,
  onClearSearch,
}: PostsSectionProps) {
  const { status, error, retry } = resource
  const posts = useMemo(() => resource.data ?? [], [resource.data])
  const [activeCategory, setActiveCategory] = useState('全部')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const categoryNames = useMemo(
    () => ['全部', ...new Set(posts.map((post) => post.category))],
    [posts],
  )
  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('zh-CN')
    return posts.filter((post) => {
      const matchesCategory =
        activeCategory === '全部' || post.category === activeCategory
      const searchSource = [post.title, post.desc, post.category, ...post.tags]
        .join(' ')
        .toLocaleLowerCase('zh-CN')
      return matchesCategory && (!query || searchSource.includes(query))
    })
  }, [activeCategory, posts, searchQuery])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [activeCategory, searchQuery])

  return (
    <section className="articles-section section-shell">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            <i /> LATEST STORIES
          </span>
          <h2>{searchQuery ? `“${searchQuery}” 的搜索结果` : '最近的书写'}</h2>
        </div>
        <p>把平凡日子里闪光的片刻，认真地写下来。</p>
      </div>

      {status === 'success' && posts.length > 0 && (
        <div className="category-filter" aria-label="按分类筛选文章">
          {categoryNames.map((category) => (
            <button
              key={category}
              className={category === activeCategory ? 'is-active' : ''}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div className="posts-list" aria-live="polite">
        {status === 'loading' && (
          <>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {status === 'error' && (
          <div className="state-panel error-panel">
            <span className="state-icon">!</span>
            <h3>文章暂时走丢了</h3>
            <p>{error?.message || '请稍后再试'}</p>
            <button className="primary-button" onClick={retry}>
              重新加载 <Icon name="arrow" size={17} />
            </button>
          </div>
        )}

        {status === 'success' && filteredPosts.length === 0 && (
          <div className="state-panel empty-panel">
            <div className="empty-illustration">
              <span />
              <i />
            </div>
            <h3>这里还没有留下痕迹</h3>
            <p>
              {searchQuery
                ? '换一个关键词，也许会遇见另一篇故事。'
                : '这个分类的文章正在慢慢生长。'}
            </p>
            <button
              className="primary-button"
              onClick={() => {
                setActiveCategory('全部')
                onClearSearch()
              }}
            >
              查看全部文章
            </button>
          </div>
        )}

        {status === 'success' &&
          filteredPosts
            .slice(0, visibleCount)
            .map((post, index) => (
              <PostCard key={post.id} post={post} index={index} />
            ))}
      </div>

      {status === 'success' && visibleCount < filteredPosts.length && (
        <button
          className="load-more"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          <span>继续翻阅</span>
          <i>
            <Icon name="down" size={17} />
          </i>
        </button>
      )}
    </section>
  )
}
