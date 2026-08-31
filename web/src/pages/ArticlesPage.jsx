import { PageHero } from '../components/PageHero'
import { PostsSection } from '../components/PostsSection'

export function ArticlesPage({ posts, status, retry, searchQuery, onClearSearch }) {
  return (
    <>
      <PageHero eyebrow="STORY ARCHIVE" title="文章归档" description="有些日子适合远行，有些时刻值得停下来写一写。所有被认真收藏的片刻，都在这里。">
        <div className="page-stat"><strong>{posts.length || '—'}</strong><span>篇故事<br />仍在续写</span></div>
      </PageHero>
      <PostsSection posts={posts} status={status} retry={retry} searchQuery={searchQuery} onClearSearch={onClearSearch} />
    </>
  )
}
