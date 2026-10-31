import { useState } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import games from '../../games.json'
import { formatRoomCode, navigate } from '../lib/router'
import { t } from '../lib/copy'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export function Home() {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [codeOpen, setCodeOpen] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')

  const submit = () => {
    const url = value.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      setError(t('home.err.url'))
      return
    }
    setError('')
    navigate(`/setup?u=${encodeURIComponent(url)}`)
  }

  const openGame = (item: (typeof games.items)[number]) => {
    if (!item.url) {
      setFlash(t('home.err.soon'))
      window.setTimeout(() => setFlash(''), 2200)
      return
    }
    if (!item.embeddable) {
      window.open(item.url, '_blank', 'noopener')
      return
    }
    navigate(`/setup?u=${encodeURIComponent(item.url)}&preset=${encodeURIComponent(item.slug)}`)
  }

  const joinByCode = () => {
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 8) {
      setCodeError(t('dialog.room.err'))
      return
    }
    setCodeError('')
    navigate(`/r/${digits.slice(0, 4)}`)
  }

  return (
    <div className="home">
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

      <main className="home-main">
        <h1 className="home-title" data-copy="home.title">
          {t('home.title')}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <form
            className="paste"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <Input
              tall
              value={value}
              placeholder={t('home.placeholder')}
              aria-label={t('home.placeholder')}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
            />
            <button
              type="submit"
              className="paste-go"
              data-empty={!value.trim()}
              aria-label={t('home.enter')}
            >
              <ArrowRight size={18} strokeWidth={1.6} />
            </button>
          </form>
          {error && <p className="notice">{error}</p>}
          {flash && <p className="notice">{flash}</p>}
        </div>

        <section className="home-reco">
          <div className="reco-head">
            <span className="eyebrow" data-copy="home.reco">
              {t('home.reco')}
            </span>
            <span className="reco-head-line" />
            <span className="reco-count mono">{String(games.items.length).padStart(2, '0')}</span>
          </div>

          <div className="reco-grid">
            {games.items.map((item, index) => (
              <button
                key={item.slug}
                type="button"
                className="poster"
                data-dead={!item.embeddable}
                onClick={() => openGame(item)}
              >
                <span className="poster-art">
                  {item.cover ? <img src={item.cover} alt="" loading="lazy" /> : null}
                  <span className="poster-index mono">{String(index + 1).padStart(2, '0')}</span>
                  {!item.embeddable && (
                    <span className="poster-flag" data-copy="home.reco.dead">
                      {t('home.reco.dead')}
                    </span>
                  )}
                </span>
                <span className="poster-body">
                  <span className="poster-title">{item.title}</span>
                  <span className="poster-meta">
                    <span>
                      {item.minutes
                        ? `约 ${item.minutes} 分钟`
                        : item.embeddable
                          ? t('home.reco.embed')
                          : t('home.reco.dead')}
                    </span>
                    <ArrowUpRight size={12} strokeWidth={1.6} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="home-foot">
        <button
          type="button"
          className="linkish"
          data-copy="home.roomcode"
          onClick={() => setCodeOpen(true)}
        >
          {t('home.roomcode')}
        </button>
      </footer>

      {codeOpen && (
        <div className="scrim" onClick={() => setCodeOpen(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2 data-copy="dialog.room.title">{t('dialog.room.title')}</h2>
            <p className="dialog-sub" data-copy="dialog.room.sub">
              {t('dialog.room.sub')}
            </p>
            <div className="dialog-body">
              <input
                className="input mono"
                style={{ padding: '16px 20px', fontSize: 22, letterSpacing: '0.12em' }}
                value={code}
                inputMode="numeric"
                autoFocus
                placeholder={t('dialog.room.placeholder')}
                aria-label={t('dialog.room.title')}
                onChange={(e) => {
                  setCode(formatRoomCode(e.target.value))
                  setCodeError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') joinByCode()
                }}
              />
              {codeError && <p className="notice">{codeError}</p>}
            </div>
            <div className="dialog-actions">
              <Button variant="ghost" data-copy="dialog.cancel" onClick={() => setCodeOpen(false)}>
                {t('dialog.cancel')}
              </Button>
              <Button variant="primary" data-copy="dialog.enter" onClick={joinByCode}>
                {t('dialog.enter')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
