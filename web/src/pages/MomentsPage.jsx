import { useState } from 'react'
import { Icon } from '../components/Icon'
import { PageHero } from '../components/PageHero'

const moments = [
  { date: '31', month: 'AUG', year: '2026', place: '上海', text: '晚风路过窗台，把八月最后一页轻轻合上。', note: '桌上的栀子花还留着一点香气，适合在夜里听一张旧唱片。', likes: 128, tone: 'rose' },
  { date: '18', month: 'AUG', year: '2026', place: '杭州', text: '雨落在青石板上，整座城忽然慢了下来。', note: '躲进街角的小店，喝到今年第一杯桂花拿铁。', likes: 96, tone: 'sage' },
  { date: '02', month: 'JUL', year: '2026', place: '苏州', text: '在园林的漏窗里，借到了一小块夏天。', note: '风吹过竹叶的时候，光影像水一样落在墙上。', likes: 74, tone: 'blue' },
  { date: '21', month: 'MAY', year: '2026', place: '家', text: '新买的书到了，周末也就有了新的期待。', note: '最近读得很慢，不过慢慢读也很好。', likes: 61, tone: 'amber' },
]

export function MomentsPage() {
  const [liked, setLiked] = useState([])
  const toggle = (index) => setLiked((items) => items.includes(index) ? items.filter((item) => item !== index) : [...items, index])

  return (
    <>
      <PageHero eyebrow="LITTLE MOMENTS" title="片刻动态" description="未必足够写成文章，却依然想要记住的瞬间。这里是一条缓慢更新的生活时间线。" />
      <section className="inner-page section-shell moments-timeline">
        {moments.map((moment, index) => (
          <article className="timeline-entry" key={`${moment.month}-${moment.date}`}>
            <div className="timeline-date"><strong>{moment.date}</strong><span>{moment.month}<br />{moment.year}</span></div>
            <i className="timeline-dot" />
            <div className={`timeline-card ${moment.tone}`}>
              <span className="moment-location"><Icon name="leaf" size={14} /> {moment.place}</span>
              <blockquote>“{moment.text}”</blockquote>
              <p>{moment.note}</p>
              <button className={liked.includes(index) ? 'is-liked' : ''} onClick={() => toggle(index)} aria-label="喜欢这条动态"><Icon name="heart" size={17} /><span>{moment.likes + (liked.includes(index) ? 1 : 0)}</span></button>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}
