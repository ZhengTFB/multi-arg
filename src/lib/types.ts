export type ModuleKey = 'note' | 'keyword' | 'person' | 'secret' | 'timeline'

export type ItemType = 'link' | 'note' | 'keyword' | 'person' | 'secret' | 'event' | 'system'

export interface Game {
  url: string
  origin: string
  title: string
  proxy: boolean
  embeddable: boolean
  hasSearch: boolean
  searchParam?: string
}

export interface Room {
  id: string
  createdAt: number
  expiresAt: number
  game: Game
  modules: ModuleKey[]
  expired?: boolean
}

export interface Member {
  id: string
  name: string
  color: string
  joinedAt: number
  lastSeen: number
  current?: { url: string; title: string; at: number }
}

export interface Item {
  id: string
  type: ItemType
  authorId: string
  createdAt: number
  starred?: boolean
  status?: 'open' | 'confirmed' | 'excluded'
  pageUrl?: string
  refId?: string
  mentions?: string[]
  /** 时间线里的显示顺序，越小越靠前 */
  order?: number
  url?: string
  title?: string
  text?: string
  keyword?: string
  /** hit = 有效，miss = 未尝试，invalid = 无效 */
  result?: 'hit' | 'miss' | 'invalid'
  person?: { name: string; note?: string }
  relations?: { from: string; to: string; label: string }[]
  secret?: { account: string; password: string; usage?: string; verified: boolean }
  event?: { at: string; text: string }
}
