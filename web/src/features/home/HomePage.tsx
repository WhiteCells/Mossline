import { Link } from 'react-router-dom'
import { CoverArt } from '../posts/CoverArt'
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
      <div className="home-journal" id="home-stories">
        <section className="home-shortcuts" aria-labelledby="home-start-title">
          <h2 className="home-section-title" id="home-start-title">
            <Icon name="spark" size={18} /> 从这里开始 <span>START HERE</span>
          </h2>
          <div className="home-shortcut-grid">
            {[
              {
                to: '/articles',
                title: '文字与灵感',
                caption: '在字里行间，拾起日常',
                variant: 'room',
              },
              {
                to: '/moments',
                title: '此刻的片段',
                caption: '把生活的微光收藏',
                variant: 'lake',
              },
              {
                to: '/about',
                title: '关于这片苔原',
                caption: '很高兴，在这里相遇',
                variant: 'code',
              },
            ].map((item) => (
              <Link
                className="home-shortcut"
                to={item.to}
                key={item.to}
                aria-label={`${item.title}：${item.caption}`}
              >
                <CoverArt variant={item.variant} title={item.title} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.caption}</p>
                </div>
                <Icon name="arrow" size={18} />
              </Link>
            ))}
          </div>
        </section>
        <section className="home-stories" aria-labelledby="home-stories-title">
          <h2 className="home-section-title" id="home-stories-title">
            <Icon name="leaf" size={18} /> 最近的书写 <span>DISCOVERY</span>
          </h2>
          <AsyncState status={status} error={error} onRetry={retry}>
            <PostCollection posts={posts.slice(0, 6)} />
          </AsyncState>
          {status === 'success' && (
            <Link className="page-link-button" to="/articles">
              查看全部文章 <Icon name="arrow" size={18} />
            </Link>
          )}
        </section>
      </div>
    </>
  )
}
