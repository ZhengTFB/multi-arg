import type { Item, Member, Room } from './types'

// Phase 1 只用假数据把界面立起来，Phase 2 起由 DO 的真实快照替换。
const now = Date.now()
const MIN = 60_000
const HOUR = 60 * MIN

export const MOCK_ME = 'm4'

export function mockRoom(id: string): Room {
  return {
    id,
    createdAt: now - 3 * HOUR,
    expiresAt: now + 6.2 * 24 * HOUR,
    pass: '3165',
    game: {
      url: '/mock-game.html',
      origin: location.origin,
      title: '大学生登山失踪事件',
      proxy: true,
      embeddable: true,
      hasSearch: true,
      searchParam: 'q',
    },
    modules: ['note', 'keyword', 'person', 'secret', 'timeline'],
  }
}

export function mockMembers(): Member[] {
  return [
    {
      id: 'm1',
      name: '小林',
      color: '#07444C',
      joinedAt: now - 3 * HOUR,
      lastSeen: now - 20_000,
      current: { url: '/mock-game.html', title: '店内环境', at: now - 30_000 },
    },
    {
      id: 'm2',
      name: '阿岚',
      color: '#8C4A2F',
      joinedAt: now - 2.9 * HOUR,
      lastSeen: now - 3 * MIN,
      current: { url: '/mock-game.html?p=duty', title: '值班表', at: now - 2 * MIN },
    },
    {
      id: 'm3',
      name: '老周',
      color: '#3F5B8C',
      joinedAt: now - 2.7 * HOUR,
      lastSeen: now - 26 * MIN,
    },
    {
      id: MOCK_ME,
      name: '陈默',
      color: '#6B4A78',
      joinedAt: now - 2.5 * HOUR,
      lastSeen: now - 5_000,
      current: { url: '/mock-game.html', title: '店内环境', at: now - 8_000 },
    },
  ]
}

export function mockItems(): Item[] {
  return [
    {
      id: 'i01',
      type: 'system',
      authorId: 'm1',
      createdAt: now - 3 * HOUR,
      text: '小林 加入了',
    },
    {
      id: 'i02',
      type: 'system',
      authorId: 'm2',
      createdAt: now - 2.9 * HOUR,
      text: '阿岚 加入了',
    },
    {
      id: 'i03',
      type: 'link',
      authorId: 'm1',
      createdAt: now - 2 * HOUR,
      url: '/mock-game.html',
      title: '店内环境',
      pageUrl: '/mock-game.html',
    },
    {
      id: 'i04',
      type: 'note',
      authorId: 'm2',
      createdAt: now - 112 * MIN,
      text: '第三页右下角有个小字，像是日期。',
      pageUrl: '/mock-game.html',
    },
    {
      id: 'i05',
      type: 'link',
      authorId: 'm3',
      createdAt: now - 96 * MIN,
      url: '/mock-game.html?p=duty',
      title: '值班表',
      pageUrl: '/mock-game.html?p=duty',
    },
    {
      id: 'i06',
      type: 'keyword',
      authorId: 'm2',
      createdAt: now - 88 * MIN,
      keyword: '符咒',
      result: 'hit',
    },
    {
      id: 'i07',
      type: 'keyword',
      authorId: 'm1',
      createdAt: now - 74 * MIN,
      keyword: '添福菩萨',
      result: 'miss',
    },
    {
      id: 'i08',
      type: 'keyword',
      authorId: 'm3',
      createdAt: now - 62 * MIN,
      keyword: '登山口',
      result: 'miss',
    },
    {
      id: 'i09',
      type: 'note',
      authorId: 'm1',
      createdAt: now - 48 * MIN,
      starred: true,
      text: '搜「符咒」出来的那页，标题栏有个 04:12。',
      pageUrl: '/mock-game.html',
    },
    {
      id: 'i10',
      type: 'note',
      authorId: 'm3',
      createdAt: now - 44 * MIN,
      refId: 'i09',
      text: '04:12 会不会是时间，不是日期？',
    },
    {
      id: 'i11',
      type: 'note',
      authorId: 'm3',
      createdAt: now - 36 * MIN,
      status: 'excluded',
      text: '先试试「管理员」这个词。',
    },
    {
      id: 'i12',
      type: 'secret',
      authorId: 'm2',
      createdAt: now - 28 * MIN,
      secret: { account: '贴吧', password: 'abc123', usage: '顾铭账号', verified: true },
    },
    {
      id: 'i13',
      type: 'secret',
      authorId: 'm1',
      createdAt: now - 21 * MIN,
      secret: { account: '邮箱', password: 'mhs2019', usage: '论坛登录', verified: false },
    },
    {
      id: 'i14',
      type: 'person',
      authorId: 'm2',
      createdAt: now - 18 * MIN,
      person: { name: '顾铭', note: '顾晴的哥哥' },
      relations: [{ from: '顾铭', to: '顾晴', label: '哥哥' }],
    },
    {
      id: 'i15',
      type: 'person',
      authorId: 'm1',
      createdAt: now - 15 * MIN,
      person: { name: '顾晴', note: '失踪者' },
    },
    {
      id: 'i16',
      type: 'person',
      authorId: MOCK_ME,
      createdAt: now - 12 * MIN,
      person: { name: '王姨', note: '店里的房东' },
      relations: [{ from: '王姨', to: '顾晴', label: '房东' }],
    },
    {
      id: 'i17',
      type: 'event',
      authorId: 'm1',
      createdAt: now - 9 * MIN,
      event: { at: '2019-08-14 21:40', text: '最后一次出现在登山口监控里' },
    },
    {
      id: 'i18',
      type: 'event',
      authorId: 'm3',
      createdAt: now - 7 * MIN,
      event: { at: '2019-08-15 04:12', text: '论坛出现第一条帖子' },
    },
    {
      id: 'i19',
      type: 'note',
      authorId: MOCK_ME,
      createdAt: now - 3 * MIN,
      text: '值班表那页底下有一行很小的「换班」链接，点了会跳。',
      pageUrl: '/mock-game.html?p=duty',
    },
  ]
}
