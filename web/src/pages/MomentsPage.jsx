import { useMemo } from 'react'
import { AsyncState } from '../components/AsyncState'
import { MarkdownContent } from '../components/MarkdownContent'
import { PageHero } from '../components/PageHero'
import { useApiResource } from '../hooks/useApiResource'
import { normalizeList } from '../services/api'

export function MomentsPage() {
  const options = useMemo(() => ({ query: { page: 1, size: 50 }, initialData: { items: [] } }), [])
  const resource = useApiResource('/api/moment', options)
  const moments = normalizeList(resource.data, ['items', 'moments']).items
  return <><PageHero eyebrow="LITTLE MOMENTS" title="片刻动态" description="未必足够写成文章，却依然想要记住的瞬间。这里是一条缓慢更新的生活时间线。" /><section className="inner-page section-shell moments-timeline"><AsyncState status={resource.status} error={resource.error} empty={!moments.length} onRetry={resource.retry}>{moments.map((moment, index) => { const date = new Date(moment.published_at || moment.created_at); return <article className="timeline-entry" key={moment.id}><div className="timeline-date"><strong>{String(date.getDate()).padStart(2, '0')}</strong><span>{date.toLocaleString('en', { month: 'short' }).toUpperCase()}<br />{date.getFullYear()}</span></div><i className="timeline-dot" /><div className={`timeline-card ${['rose','sage','blue','amber'][index % 4]}`}><span className="moment-location">{moment.visibility === 'public' ? '公开动态' : 'Mossline'}</span><MarkdownContent>{moment.content}</MarkdownContent>{moment.attachments?.length ? <div className="moment-images">{moment.attachments.filter((item) => item.mime_type?.startsWith('image/')).map((item) => <img src={item.url} alt={item.name || ''} key={item.id} loading="lazy" />)}</div> : null}</div></article> })}</AsyncState></section></>
}
