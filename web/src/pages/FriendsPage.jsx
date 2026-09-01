import { useMemo } from 'react'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { PageHero } from '../components/PageHero'
import { useApiResource } from '../hooks/useApiResource'
import { normalizeList } from '../services/api'

export function FriendsPage() {
  const options = useMemo(() => ({ query: { page: 1, size: 100 }, initialData: { items: [] } }), [])
  const resource = useApiResource('/api/friend', options)
  const friends = normalizeList(resource.data, ['items', 'friends', 'links']).items
  return <><PageHero eyebrow="DEAR NEIGHBORS" title="友人来信" description="互联网依然可以是一片安静的街区。推开这些邻居的门，也许会遇见新的风景。" /><section className="inner-page section-shell"><AsyncState status={resource.status} error={resource.error} empty={!friends.length} onRetry={resource.retry}><div className="friends-grid">{friends.map((friend, index) => <a className="friend-card" href={friend.uri || friend.url} key={friend.id} target="_blank" rel="noreferrer"><span className={`friend-mark ${['rose','sage','blue','violet','amber','ink'][index % 6]}`}>{friend.logo || friend.logo_url ? <img src={friend.logo || friend.logo_url} alt="" /> : friend.name.slice(0, 1)}</span><div><strong>{friend.name}</strong><p>{friend.desc || friend.description}</p></div><Icon name="arrow" size={18} /></a>)}</div></AsyncState><div className="neighbor-note"><div><span className="eyebrow"><i /> BECOME A NEIGHBOR</span><h2>很高兴认识你</h2><p>如果你也在认真经营一片小小的网络空间，欢迎来信。</p></div><a className="primary-button" href="mailto:hello@mossline.example">写一封信 <Icon name="mail" size={17} /></a></div></section></>
}
