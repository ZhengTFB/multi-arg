import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import games from '../../games.json'
import { formatRoomCode, navigate } from '../lib/router'
import { t } from '../lib/copy'

type Mode = 'new' | 'join'

export function Home() {
  const [mode, setMode] = useState<Mode>('new')
  const [url, setUrl] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [revealed, setRevealed] = useState(false)
  const recoRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = recoRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setRevealed(true)
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const submit = () => {
    if (mode === 'new') {
      const value = url.trim()
      if (!value) return
      if (!/^https?:\/\//i.test(value)) {
        setError(t('home.err.url'))
        return
      }
      setError('')
      navigate(`/setup?u=${encodeURIComponent(value)}`)
      return
    }

    const digits = code.replace(/\D/g, '')
    if (digits.length !== 4) {
      setError(t('home.err.code'))
      return
    }
    setError('')
    navigate(`/r/${digits}`)
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

  return (
    <div className="home">
      <div className="home-scroll">
        <header className="home-top">
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

        <section className="hero">
          <div className="hero-inner">
            <h1 className="home-title" data-copy="home.title">
              {t('home.title')}
            </h1>

            <div className="start-card">
              <div className="start-tabs" role="tablist" aria-label="开始方式">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'new'}
                  data-copy="home.tab.new"
                  onClick={() => {
                    setMode('new')
                    setError('')
                  }}
                >
                  {t('home.tab.new')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'join'}
                  data-copy="home.tab.join"
                  onClick={() => {
                    setMode('join')
                    setError('')
                  }}
                >
                  {t('home.tab.join')}
                </button>
              </div>

              <form
                className="start-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  submit()
                }}
              >
                {mode === 'new' ? (
                  <input
                    className="input start-input"
                    value={url}
                    placeholder={t('home.placeholder.url')}
                    aria-label={t('home.placeholder.url')}
                    onChange={(e) => {
                      setUrl(e.target.value)
                      setError('')
                    }}
                  />
                ) : (
                  <input
                    className="input start-input mono"
                    value={code}
                    inputMode="numeric"
                    placeholder={t('home.placeholder.code')}
                    aria-label={t('home.placeholder.code')}
                    style={{ letterSpacing: '0.18em' }}
                    onChange={(e) => {
                      setCode(formatRoomCode(e.target.value))
                      setError('')
                    }}
                  />
                )}
                <button
                  type="submit"
                  className="btn btn-primary start-go"
                  data-copy={mode === 'new' ? 'home.go.new' : 'home.go.join'}
                >
                  {mode === 'new' ? t('home.go.new') : t('home.go.join')}
                </button>
              </form>

              {mode === 'join' && (
                <p className="start-hint" data-copy="home.hint.code">
                  {t('home.hint.code')}
                </p>
              )}
              {error && <p className="notice">{error}</p>}
              {flash && <p className="notice">{flash}</p>}
            </div>
          </div>

          <button
            type="button"
            className="scroll-cue"
            onClick={() => recoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <span data-copy="home.scroll.hint">{t('home.scroll.hint')}</span>
            <ChevronDown size={14} strokeWidth={1.8} />
          </button>
        </section>

        <section className="reco-section" ref={recoRef} data-in={revealed}>
          <div className="home-reco">
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
          </div>
        </section>
      </div>
    </div>
  )
}
