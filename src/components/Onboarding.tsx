import { Button } from './ui/Button'
import { t } from '../lib/copy'
import type { CopyKey } from '../lib/copy'

interface Props {
  open: boolean
  onStart: () => void
}

const STEPS: { title: CopyKey; desc: CopyKey }[] = [
  { title: 'onb.step1.title', desc: 'onb.step1.desc' },
  { title: 'onb.step2.title', desc: 'onb.step2.desc' },
  { title: 'onb.step3.title', desc: 'onb.step3.desc' },
]

/** 第一次进房间自动弹出，三步讲清楚：游戏在哪、东西丢哪、人怎么进来。 */
export function Onboarding({ open, onStart }: Props) {
  if (!open) return null

  return (
    <div className="scrim" onClick={onStart} role="presentation">
      <div className="dialog onb" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">新手引导</p>
        <h2 data-copy="onb.title">{t('onb.title')}</h2>

        <ol className="onb-steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="onb-num mono">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <b data-copy={step.title}>{t(step.title)}</b>
                <p data-copy={step.desc}>{t(step.desc)}</p>
              </div>
            </li>
          ))}
        </ol>

        <Button variant="primary" size="lg" block data-copy="onb.start" onClick={onStart}>
          {t('onb.start')}
        </Button>
      </div>
    </div>
  )
}
