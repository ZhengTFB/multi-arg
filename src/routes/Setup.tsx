import { useState } from 'react'
import games from '../../games.json'
import type { ModuleKey } from '../lib/types'
import { navigate } from '../lib/router'
import { load, save } from '../lib/storage'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

interface Props {
  url: string
  preset: string
}

const MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'note', label: '笔记' },
  { key: 'keyword', label: '关键词' },
  { key: 'person', label: '人物关系' },
  { key: 'secret', label: '密码本' },
  { key: 'timeline', label: '时间线' },
]

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function Setup({ url, preset }: Props) {
  const presetGame = games.items.find((g) => g.slug === preset)
  const title = presetGame?.title ?? hostOf(url)
  const [name, setName] = useState(() => load<string>('name', ''))
  const [modules, setModules] = useState<ModuleKey[]>(() => load<ModuleKey[]>('modules', ['note', 'keyword']))

  const toggle = (key: ModuleKey) => {
    setModules((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const start = () => {
    save('name', name.trim())
    save('modules', modules)
    navigate('/r/8472#demo')
  }

  return (
    <div className="setup">
      <header>
        <a className="wordmark" href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>
          多人 ARG
        </a>
      </header>

      <main className="setup-main">
        <section className="setup-block">
          <p className="eyebrow">游戏</p>
          <div>
            <h1 className="setup-game">{presetGame ? `《${title}》` : title}</h1>
            <p className="setup-game-sub">
              {hostOf(url)}
              {presetGame?.hasSearch ? ' · 这个游戏有站内搜索' : ''}
            </p>
          </div>
        </section>

        <section className="setup-block">
          <label className="field-label" htmlFor="name">
            你的名字
          </label>
          <Input
            id="name"
            value={name}
            placeholder="留空就叫访客一"
            maxLength={12}
            onChange={(e) => setName(e.target.value)}
          />
        </section>

        <section className="setup-block">
          <p className="eyebrow">这局要开哪些</p>
          <div className="module-pills">
            {MODULES.map((m) => (
              <button
                key={m.key}
                type="button"
                className="pill"
                aria-pressed={modules.includes(m.key)}
                onClick={() => toggle(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="touch-hint" style={{ fontSize: 12, color: 'var(--earth-2)', opacity: 0.75 }}>
            开了全员可见，进房后不能改。
          </p>
        </section>

        <div className="setup-actions">
          <Button variant="primary" size="lg" block onClick={start}>
            开始
          </Button>
        </div>
      </main>
    </div>
  )
}
