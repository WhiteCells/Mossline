import type { Post } from './types'
import type { ResourceState } from '../../shared/hooks/resource'
import { PageHero } from '../../shared/ui/PageHero'
import { PostsSection } from './PostsSection'

interface ArticlesPageProps {
  resource: ResourceState<Post[]>
  searchQuery: string
  onClearSearch: () => void
}

export function ArticlesPage({
  resource,
  searchQuery,
  onClearSearch,
}: ArticlesPageProps) {
  const posts = resource.data ?? []
  return (
    <>
      <PageHero
        eyebrow="STORY ARCHIVE"
        title="文章归档"
        description="有些日子适合远行，有些时刻值得停下来写一写。所有被认真收藏的片刻，都在这里。"
      >
        <div className="page-stat">
          <strong>{posts.length || '—'}</strong>
          <span>
            篇故事
            <br />
            仍在续写
          </span>
        </div>
      </PageHero>
      <PostsSection
        resource={resource}
        searchQuery={searchQuery}
        onClearSearch={onClearSearch}
      />
    </>
  )
}
