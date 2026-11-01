import { useState } from 'react'
import { t } from '../lib/copy'
import { Button } from './ui/Button'

interface Props {
  onDone: (name: string) => void
}

/** 第一次进房间先起名，之后存在本地，不再问。 */
export function NameGate({ onDone }: Props) {
  const [name, setName] = useState('')

  return (
    <div className="page-center">
      <form
        className="name-card"
        onSubmit={(e) => {
          e.preventDefault()
          onDone(name.trim() || '访客')
        }}
      >
        <p className="eyebrow" data-copy="room.name.title">
          {t('room.name.title')}
        </p>
        <p className="name-card-desc" data-copy="room.name.desc">
          {t('room.name.desc')}
        </p>
        <input
          className="input name-card-input"
          value={name}
          maxLength={12}
          autoFocus
          placeholder={t('room.name.placeholder')}
          aria-label={t('room.name.placeholder')}
          onChange={(e) => setName(e.target.value)}
        />
        <Button variant="primary" size="lg" block type="submit" data-copy="room.name.go">
          {t('room.name.go')}
        </Button>
      </form>
    </div>
  )
}
