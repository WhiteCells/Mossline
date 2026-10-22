import { Link } from 'react-router-dom'
import { Icon } from '../../shared/ui/Icon'
import { PageHero } from '../../shared/ui/PageHero'

export function NotFoundPage() {
  return (
    <>
      <PageHero
        eyebrow="404 · LOST PATH"
        title="这条小径走远了"
        description="你寻找的页面也许已经搬家，或从来没有在这里生长过。"
      >
        <Link className="primary-button page-hero-button" to="/">
          回到首页 <Icon name="arrow" size={17} />
        </Link>
      </PageHero>
    </>
  )
}
