import { AsyncState } from '../../shared/ui/AsyncState'
import { MarkdownContent } from '../../shared/ui/MarkdownContent'
import { PageHero } from '../../shared/ui/PageHero'
import { useApiResource } from '../../shared/hooks/useApiResource'

import { parseAbout } from './parseAbout'

export function AboutPage() {
  const resource = useApiResource('/api/about', parseAbout)
  return (
    <>
      <PageHero
        eyebrow="ABOUT MOSSLINE"
        title="关于这里"
        description="Mossline，意为时间留下的痕迹。这是一间个人博客，也是一份仍在生长的生活档案。"
      />
      <section className="inner-page section-shell about-live">
        <AsyncState
          status={resource.status}
          error={resource.error}
          empty={!resource.data?.content}
          onRetry={resource.retry}
        >
          <MarkdownContent>{resource.data?.content}</MarkdownContent>
        </AsyncState>
      </section>
    </>
  )
}
