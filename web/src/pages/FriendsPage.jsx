import { Icon } from '../components/Icon'
import { PageHero } from '../components/PageHero'

const friends = [
  { name: '春日放映室', mark: '春', desc: '电影、镜头，以及散场后还没说完的话。', url: '#', tone: 'rose' },
  { name: '山茶邮局', mark: '茶', desc: '从南方寄来的信，关于植物与漫长雨季。', url: '#', tone: 'sage' },
  { name: '沿海公路', mark: '海', desc: '旅行摄影与地图之外的风景收藏。', url: '#', tone: 'blue' },
  { name: '夜航手记', mark: '夜', desc: '技术、产品与独立创造者的深夜思考。', url: '#', tone: 'violet' },
  { name: '白昼梦境', mark: '梦', desc: '插画、设计和一些不切实际的好点子。', url: '#', tone: 'amber' },
  { name: '一页之间', mark: '页', desc: '私人阅读史，以及书页折角里的秘密。', url: '#', tone: 'ink' },
]

export function FriendsPage() {
  return (
    <>
      <PageHero eyebrow="DEAR NEIGHBORS" title="友人来信" description="互联网依然可以是一片安静的街区。推开这些邻居的门，也许会遇见新的风景。" />
      <section className="inner-page section-shell">
        <div className="friends-grid">
          {friends.map((friend) => (
            <a className="friend-card" href={friend.url} key={friend.name} onClick={friend.url === '#' ? (event) => event.preventDefault() : undefined}>
              <span className={`friend-mark ${friend.tone}`}>{friend.mark}</span>
              <div><strong>{friend.name}</strong><p>{friend.desc}</p></div>
              <Icon name="arrow" size={18} />
            </a>
          ))}
        </div>
        <div className="neighbor-note">
          <div><span className="eyebrow"><i /> BECOME A NEIGHBOR</span><h2>很高兴认识你</h2><p>如果你也在认真经营一片小小的网络空间，欢迎来信。请附上站点名称、简介与访问地址。</p></div>
          <a className="primary-button" href="mailto:hello@mossline.example">写一封信 <Icon name="mail" size={17} /></a>
        </div>
      </section>
    </>
  )
}
