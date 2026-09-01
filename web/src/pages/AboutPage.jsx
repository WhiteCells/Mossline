import { AsyncState } from '../components/AsyncState'
import { MarkdownContent } from '../components/MarkdownContent'
import { Newsletter } from '../components/Newsletter'
import { PageHero } from '../components/PageHero'
import { useApiResource } from '../hooks/useApiResource'

export function AboutPage() {
  const resource = useApiResource('/api/about')
  return <><PageHero eyebrow="ABOUT MOSSLINE" title="关于这里" description="Mossline，意为时间留下的痕迹。这是一间个人博客，也是一份仍在生长的生活档案。" /><section className="inner-page section-shell about-live"><AsyncState status={resource.status} error={resource.error} empty={!resource.data?.content} onRetry={resource.retry}><MarkdownContent>{resource.data?.content}</MarkdownContent></AsyncState></section><Newsletter /></>
}
