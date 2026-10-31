import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import games from '../../games.json'
import { formatRoomCode, navigate } from '../lib/router'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const COVER_TINTS = ['#8b9d7722', '#d4a37322', '#5c403318', '#e9e0d4']

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
      setError('这不像一个网址。')
      return
    }
    setError('')
    navigate(`/setup?u=${encodeURIComponent(url)}`)
  }

  const openGame = (item: (typeof games.items)[number]) => {
    if (!item.url) {
      setFlash('这个还没上线。')
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
      setCodeError('房间号和口令，一共 8 位数字。')
      return
    }
    setCodeError('')
    navigate(`/r/${digits.slice(0, 4)}`)
  }

  return (
    <div className="home">
      <header>
        <a className="wordmark" href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>
          多人 ARG
        </a>
      </header>

      <main className="home-main">
        <h1 className="home-title">几个人一起玩网页解谜</h1>

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
              placeholder="粘贴游戏链接"
              aria-label="游戏链接"
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
            />
            <button
              type="submit"
              className="paste-go"
              data-empty={!value.trim()}
              aria-label="继续"
            >
              <ArrowRight size={18} strokeWidth={1.6} />
            </button>
          </form>
          {error && <p className="notice">{error}</p>}
          {flash && <p className="notice">{flash}</p>}
        </div>

        <section className="home-reco">
          <p className="eyebrow">推荐</p>
          <div className="reco-track">
            {games.items.map((item, index) => (
              <button
                key={item.slug}
                type="button"
                className="reco-card"
                data-dead={!item.embeddable}
                onClick={() => openGame(item)}
              >
                <span
                  className="reco-cover"
                  style={{ background: COVER_TINTS[index % COVER_TINTS.length] }}
                >
                  {item.title.slice(0, 1)}
                </span>
                <span className="reco-body">
                  <span className="reco-title">{item.title}</span>
                  <span className="reco-meta">
                    {item.minutes ? `约 ${item.minutes} 分钟` : item.embeddable ? '站内嵌入' : '新窗口打开'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="home-foot">
        <button type="button" className="linkish" onClick={() => setCodeOpen(true)}>
          有房间号？
        </button>
      </footer>

      {codeOpen && (
        <div className="scrim" onClick={() => setCodeOpen(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>有房间号？</h2>
            <p className="dialog-sub">房间号和口令，各 4 位数字。</p>
            <div className="dialog-body">
              <input
                className="input mono"
                style={{ padding: '16px 20px', fontSize: 22, letterSpacing: '0.12em' }}
                value={code}
                inputMode="numeric"
                autoFocus
                placeholder="8472 3165"
                aria-label="房间号和口令"
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
              <Button variant="ghost" onClick={() => setCodeOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={joinByCode}>
                进入
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
