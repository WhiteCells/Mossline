import type { Friend } from './types'
import { Icon } from '../../shared/ui/Icon'

const FRIEND_COLORS = ['rose', 'sage', 'blue', 'violet', 'amber', 'ink']

interface FriendCardProps {
  friend: Friend
  index: number
}

export function FriendCard({ friend, index }: FriendCardProps) {
  const logo = friend.logo
  const color = FRIEND_COLORS[index % FRIEND_COLORS.length]

  return (
    <a
      className="friend-card"
      href={friend.uri}
      target="_blank"
      rel="noreferrer"
    >
      <span className={`friend-mark ${color}`}>
        {logo ? <img src={logo} alt="" /> : friend.name.slice(0, 1)}
      </span>
      <div>
        <strong>{friend.name}</strong>
        <p>{friend.desc}</p>
      </div>
      <Icon name="arrow" size={18} />
    </a>
  )
}
