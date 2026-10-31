import { useState } from 'react'
import games from '../../games.json'
import type { ModuleKey } from '../lib/types'
import { navigate } from '../lib/router'
import { load, save } from '../lib/storage'
import { t } from '../lib/copy'
import type { CopyKey } from '../lib/copy'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

interface Props {
  url: string
  preset: string
}

const MODULES: { key: ModuleKey; copyKey: CopyKey }[] = [
  { key: 'note', copyKey: 'module.note' },
  { key: 'keyword', copyKey: 'module.keyword' },
  { key: 'person', copyKey: 'module.person' },
  { key: 'secret', copyKey: 'module.secret' },
  { key: 'timeline', copyKey: 'module.timeline' },
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
  const [modules, setModules] = useState<ModuleKey[]>(() =>
    load<ModuleKey[]>('modules', ['note', 'keyword']),
  )

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
        <a
          className="wordmark"
          href="/"
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
        >
          多人 ARG
        </a>
      </header>

      <main className="setup-main">
        <section className="setup-block">
          <p className="eyebrow" data-copy="setup.game">
            {t('setup.game')}
          </p>
          <div>
            <h1 className="setup-game">{presetGame ? `《${title}》` : title}</h1>
            <p className="setup-game-sub">
              {hostOf(url)}
              {presetGame?.hasSearch ? ` · ${t('setup.hasSearch')}` : ''}
            </p>
          </div>
        </section>

        <section className="setup-block">
          <label className="field-label" htmlFor="name" data-copy="setup.name">
            {t('setup.name')}
          </label>
          <Input
            id="name"
            value={name}
            placeholder={t('setup.name.placeholder')}
            maxLength={12}
            onChange={(e) => setName(e.target.value)}
          />
        </section>

        <section className="setup-block">
          <p className="eyebrow" data-copy="setup.modules">
            {t('setup.modules')}
          </p>
          <div className="module-pills">
            {MODULES.map((m) => (
              <button
                key={m.key}
                type="button"
                className="pill"
                aria-pressed={modules.includes(m.key)}
                data-copy={m.copyKey}
                onClick={() => toggle(m.key)}
              >
                {t(m.copyKey)}
              </button>
            ))}
          </div>
          <p className="setup-note" data-copy="setup.modules.hint">
            {t('setup.modules.hint')}
          </p>
        </section>

        <div className="setup-actions">
          <Button variant="primary" size="lg" block data-copy="setup.start" onClick={start}>
            {t('setup.start')}
          </Button>
        </div>
      </main>
    </div>
  )
}
