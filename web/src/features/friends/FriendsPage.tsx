import { AsyncState } from '../../shared/ui/AsyncState'
import { Icon } from '../../shared/ui/Icon'
import { PageHero } from '../../shared/ui/PageHero'
import { useApiResource } from '../../shared/hooks/useApiResource'
import { parseFriends } from './parseFriends'

import { FriendCard } from './FriendCard'

const LIST_QUERY = { page: 1, size: 100 }

export function FriendsPage() {
  const resource = useApiResource('/api/friend', parseFriends, LIST_QUERY)
  const friends = resource.data ?? []

  return (
    <>
      <PageHero
        eyebrow="DEAR NEIGHBORS"
        title="友人来信"
        description="互联网依然可以是一片安静的街区。推开这些邻居的门，也许会遇见新的风景。"
      />
      <section className="inner-page section-shell">
        <AsyncState
          status={resource.status}
          error={resource.error}
          empty={!friends.length}
          onRetry={resource.retry}
        >
          <div className="friends-grid">
            {friends.map((friend, index) => (
              <FriendCard key={friend.id} friend={friend} index={index} />
            ))}
          </div>
        </AsyncState>
        <div className="neighbor-note">
          <div>
            <span className="eyebrow">
              <i /> BECOME A NEIGHBOR
            </span>
            <h2>很高兴认识你</h2>
            <p>如果你也在认真经营一片小小的网络空间，欢迎来信。</p>
          </div>
          <a className="primary-button" href="mailto:hello@mossline.example">
            写一封信 <Icon name="mail" size={17} />
          </a>
        </div>
      </section>
    </>
  )
}
