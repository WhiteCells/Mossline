import { AsyncState } from '../../shared/ui/AsyncState'
import { PageHero } from '../../shared/ui/PageHero'
import { useApiResource } from '../../shared/hooks/useApiResource'
import { parseMoments } from './parseMoments'

import { MomentEntry } from './MomentEntry'

const LIST_QUERY = { page: 1, size: 50 }

export function MomentsPage() {
  const resource = useApiResource('/api/moment', parseMoments, LIST_QUERY)
  const moments = resource.data ?? []

  return (
    <>
      <PageHero
        eyebrow="LITTLE MOMENTS"
        title="片刻动态"
        description="未必足够写成文章，却依然想要记住的瞬间。这里是一条缓慢更新的生活时间线。"
      />
      <section className="inner-page section-shell moments-timeline">
        <AsyncState
          status={resource.status}
          error={resource.error}
          empty={!moments.length}
          onRetry={resource.retry}
        >
          {moments.map((moment, index) => (
            <MomentEntry key={moment.id} moment={moment} index={index} />
          ))}
        </AsyncState>
      </section>
    </>
  )
}
