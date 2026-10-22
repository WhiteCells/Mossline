import type { Moment } from './types'
import { MarkdownContent } from '../../shared/ui/MarkdownContent'

const TIMELINE_COLORS = ['rose', 'sage', 'blue', 'amber']

interface MomentEntryProps {
  moment: Moment
  index: number
}

export function MomentEntry({ moment, index }: MomentEntryProps) {
  const date = new Date(moment.published_at || moment.created_at)
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en', { month: 'short' }).toUpperCase()
  const images = (moment.attachments || []).filter((attachment) =>
    attachment.mime_type?.startsWith('image/'),
  )
  const color = TIMELINE_COLORS[index % TIMELINE_COLORS.length]

  return (
    <article className="timeline-entry">
      <div className="timeline-date">
        <strong>{day}</strong>
        <span>
          {month}
          <br />
          {date.getFullYear()}
        </span>
      </div>
      <i className="timeline-dot" />
      <div className={`timeline-card ${color}`}>
        <span className="moment-location">
          {moment.visibility === 'public' ? '公开动态' : 'Mossline'}
        </span>
        <MarkdownContent>{moment.content}</MarkdownContent>
        {images.length ? (
          <div className="moment-images">
            {images.map((image) => (
              <img
                src={image.url}
                alt={image.name || ''}
                key={image.id}
                loading="lazy"
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
