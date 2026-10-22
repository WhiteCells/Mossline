import { Link } from 'react-router-dom'
import { DiscoverSection } from './DiscoverSection'
import { Hero } from './Hero'
import { Icon } from '../../shared/ui/Icon'
import type { Post } from '../posts/types'
import type { ResourceState } from '../../shared/hooks/resource'
import { PostCollection } from '../posts/PostCollection'
import { AsyncState } from '../../shared/ui/AsyncState'

interface HomePageProps {
  resource: ResourceState<Post[]>
}

export function HomePage({ resource }: HomePageProps) {
  const { status, error, retry } = resource
  const posts = resource.data ?? []
  return (
    <>
      <Hero />
      <section className="articles-section section-shell" id="home-stories">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <i /> LATEST STORIES
            </span>
            <h2>最近的书写</h2>
          </div>
          <p>把平凡日子里闪光的片刻，认真地写下来。</p>
        </div>
        <AsyncState status={status} error={error} onRetry={retry}>
          <PostCollection posts={posts.slice(0, 3)} />
        </AsyncState>
        {status === 'success' && (
          <Link className="page-link-button" to="/articles">
            查看全部文章 <Icon name="arrow" size={18} />
          </Link>
        )}
      </section>
      <DiscoverSection posts={posts} />
    </>
  )
}
