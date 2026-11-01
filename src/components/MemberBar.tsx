import { Star } from 'lucide-react'
import type { Member } from '../lib/types'
import { t } from '../lib/copy'

interface Props {
  members: Member[]
  meId: string
  filter: string
  starOnly: boolean
  unread: Set<string>
  onFilter: (key: string) => void
  onStarOnly: (on: boolean) => void
}

/** 笔记上方的人名筛选：全部 / 我 / 每个成员（显示全名）。 */
export function MemberBar({ members, meId, filter, starOnly, unread, onFilter, onStarOnly }: Props) {
  return (
    <div className="memberbar">
      <button
        type="button"
        className="chip"
        aria-pressed={!starOnly && filter === 'all'}
        data-copy="room.members.all"
        onClick={() => {
          onStarOnly(false)
          onFilter('all')
        }}
      >
        {t('room.members.all')}
      </button>
      <button
        type="button"
        className="chip"
        aria-pressed={!starOnly && filter === 'me'}
        data-copy="room.members.me"
        onClick={() => {
          onStarOnly(false)
          onFilter('me')
        }}
      >
        {t('room.members.me')}
      </button>
      {members.map((member) => (
        <button
          key={member.id}
          type="button"
          className="chip chip--person"
          aria-pressed={!starOnly && filter === member.id}
          title={member.name}
          onClick={() => {
            onStarOnly(false)
            onFilter(member.id)
          }}
        >
          <i style={{ background: member.color }} />
          <span className="chip-name">{member.name}</span>
          {unread.has(member.id) && member.id !== meId && <span className="avatar-unread" />}
        </button>
      ))}
      <button
        type="button"
        className="star-chip"
        aria-pressed={starOnly}
        aria-label="公共笔记"
        title="公共笔记"
        onClick={() => onStarOnly(!starOnly)}
      >
        <Star size={13} fill={starOnly ? 'currentColor' : 'none'} strokeWidth={1.5} />
      </button>
    </div>
  )
}
