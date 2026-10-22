import type { Post } from '../posts/types'
import type { ResourceState } from '../../shared/hooks/resource'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHero } from '../../shared/ui/PageHero'
import { AsyncState } from '../../shared/ui/AsyncState'
import { PostCollection } from '../posts/PostCollection'

interface TagsPageProps {
  resource: ResourceState<Post[]>
}

export function TagsPage({ resource }: TagsPageProps) {
  const { status, error, retry } = resource
  const posts = useMemo(() => resource.data ?? [], [resource.data])
  const [params, setParams] = useSearchParams()
  const tags = useMemo<string[]>(
    () => [...new Set(posts.flatMap((post) => post.tags))],
    [posts],
  )
  const requested = params.get('name') ?? ''
  const active = tags.includes(requested) ? requested : tags[0] || ''
  const counts = Object.fromEntries(
    tags.map((tag) => [
      tag,
      posts.filter((post) => post.tags.includes(tag)).length,
    ]),
  )
  const filtered = posts.filter((post) => post.tags.includes(active))

  return (
    <>
      <PageHero
        eyebrow="KEYWORDS"
        title="标签云朵"
        description="一个词就是一条细小的线索。它们散落在文章之间，也悄悄连接起相似的心情。"
      />
      <section className="inner-page section-shell">
        <AsyncState
          status={status}
          error={error}
          empty={status === 'success' && tags.length === 0}
          onRetry={retry}
        >
          <>
            <div className="tags-overview">
              {tags.map((tag, index) => (
                <button
                  key={tag}
                  className={`${active === tag ? 'is-active' : ''} ${index % 3 === 0 ? 'is-large' : ''}`}
                  onClick={() => setParams({ name: tag })}
                >
                  <span>#{tag}</span>
                  <small>{counts[tag]}</small>
                </button>
              ))}
            </div>
            <div className="collection-heading">
              <div>
                <span>正在浏览标签</span>
                <h2>#{active}</h2>
              </div>
              <small>{filtered.length} STORIES</small>
            </div>
            <PostCollection
              posts={filtered}
              emptyTitle={`“${active}” 暂无文章`}
              emptyDescription="这个关键词已经种下，等待一篇合适的故事发芽。"
            />
          </>
        </AsyncState>
      </section>
    </>
  )
}
