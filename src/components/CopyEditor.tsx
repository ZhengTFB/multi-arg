import { useCallback, useEffect, useState } from 'react'
import { copy } from '../lib/copy'

/**
 * 只跑在 vite dev 里：点页面上带 data-copy 的文字直接改，
 * 或者从「列表」里改占位符这类不在正文里的文案。
 * 保存走 /__copy/save，写回 src/copy.json。
 */
const STYLE = `
.copy-hit { outline: 1.5px dashed rgba(176,112,80,.5); outline-offset: 3px; border-radius: 4px; cursor: text; }
.copy-hit:hover { outline-color: rgba(176,112,80,.95); background: rgba(212,163,115,.12); }
.copy-hit:focus { outline: 2px solid #8B9D77; outline-offset: 3px; background: rgba(139,157,119,.1); }
.copy-bar {
  position: fixed; left: 16px; bottom: 16px; z-index: 9999;
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px 9px 14px;
  background: #2B2420; color: #FAF6F1;
  border-radius: 20px 24px 18px 22px / 22px 18px 24px 20px;
  box-shadow: 0 6px 16px rgba(92,64,51,.3);
  font: 12px/1.4 -apple-system, "PingFang SC", system-ui, sans-serif;
}
.copy-bar b { font-weight: 600; }
.copy-bar span { opacity: .72; }
.copy-bar button {
  padding: 5px 12px; border-radius: 14px; font: inherit; cursor: pointer;
  background: #FAF6F1; color: #2B2420; border: 0;
}
.copy-bar button.ghost { background: transparent; color: #FAF6F1; opacity: .78; border: 1px solid rgba(250,246,241,.35); }
.copy-launch {
  position: fixed; left: 16px; bottom: 16px; z-index: 9999;
  padding: 7px 12px; border: 1px solid #E9E0D4; border-radius: 999px;
  background: rgba(255,255,255,.92); color: #7A6658; cursor: pointer;
  font: 11px/1.4 -apple-system, "PingFang SC", system-ui, sans-serif;
}
.copy-list {
  position: fixed; left: 16px; bottom: 64px; z-index: 9999;
  width: min(560px, calc(100vw - 32px)); max-height: 62vh; overflow-y: auto;
  padding: 14px 16px; background: #FFFFFF; border: 1px solid #E9E0D4;
  border-radius: 18px 22px 18px 20px / 20px 18px 22px 18px;
  box-shadow: 0 8px 40px rgba(92,64,51,.18);
  font: 12px/1.5 -apple-system, "PingFang SC", system-ui, sans-serif;
}
.copy-row { display: grid; grid-template-columns: 132px 1fr; gap: 8px; align-items: center; padding: 5px 0; }
.copy-key { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 10px; color: #7A6658; word-break: break-all; }
.copy-row input {
  width: 100%; padding: 6px 10px; font: inherit; color: #5C4033;
  background: #FAF6F1; border: 1px solid #E9E0D4; border-radius: 10px; outline: none;
}
.copy-row input:focus { border-color: #8B9D77; }
`

function arm(el: HTMLElement) {
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return
  if (!el.dataset.original) el.dataset.original = el.textContent ?? ''
  el.contentEditable = 'true'
  el.spellcheck = false
  el.classList.add('copy-hit')
}

export function CopyEditor() {
  const [on, setOn] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const enable = useCallback(() => setOn(true), [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (new URLSearchParams(location.search).has('edit')) setOn(true)
  }, [])

  useEffect(() => {
    if (!on) return

    const armAll = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>('[data-copy]').forEach(arm)
    }
    armAll(document)

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.dataset.copy) arm(node)
            armAll(node)
          }
        })
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const recordNode = (el: HTMLElement) => {
      const key = el.dataset.copy
      if (!key) return
      const value = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
      setDirty((prev) => {
        if (value === el.dataset.original) {
          const next = { ...prev }
          delete next[key]
          return next
        }
        return { ...prev, [key]: value }
      })
    }

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-copy]')
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      el.focus()
    }

    const onInput = (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-copy]')
      if (el) recordNode(el)
    }

    const onBlur = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.dataset.copy) recordNode(el)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault()
        ;(e.target as HTMLElement | null)?.blur()
      }
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('input', onInput, true)
    document.addEventListener('focusout', onBlur, true)
    document.addEventListener('keydown', onKey, true)

    return () => {
      observer.disconnect()
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('focusout', onBlur, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [on])

  const save = async () => {
    setState('saving')
    try {
      const res = await fetch('/__copy/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dirty),
      })
      const json = (await res.json()) as { ok: boolean }
      if (!json.ok) throw new Error('save failed')
      setState('saved')
      window.setTimeout(() => location.reload(), 420)
    } catch {
      setState('error')
    }
  }

  if (!import.meta.env.DEV) return null
  // 截图时带 ?shot=1，别让工具条出现在验收图里
  if (new URLSearchParams(location.search).has('shot')) return null

  if (!on) {
    return (
      <>
        <style>{STYLE}</style>
        <button type="button" className="copy-launch" onClick={enable}>
          编辑文案
        </button>
      </>
    )
  }

  const count = Object.keys(dirty).length

  return (
    <>
      <style>{STYLE}</style>

      {listOpen && (
        <div className="copy-list">
          {Object.entries(copy).map(([key, value]) => (
            <label className="copy-row" key={key}>
              <span className="copy-key">{key}</span>
              <input
                value={dirty[key] ?? value}
                onChange={(e) => setDirty((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      )}

      <div className="copy-bar">
        <b>文案校对</b>
        <span>
          {state === 'saved'
            ? '已写入 copy.json'
            : state === 'error'
              ? '写入失败，看终端'
              : count
                ? `改了 ${count} 处`
                : '点文字就能改'}
        </span>
        <button type="button" onClick={save} disabled={!count || state === 'saving'}>
          {state === 'saving' ? '保存中' : '保存'}
        </button>
        <button type="button" className="ghost" onClick={() => setListOpen((v) => !v)}>
          {listOpen ? '收起列表' : '列表'}
        </button>
        <button type="button" className="ghost" onClick={() => location.reload()}>
          放弃
        </button>
      </div>
    </>
  )
}
