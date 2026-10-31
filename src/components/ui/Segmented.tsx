export interface SegItem {
  key: string
  label: string
}

interface Props {
  items: SegItem[]
  value: string
  onChange: (key: string) => void
}

export function Segmented({ items, value, onChange }: Props) {
  return (
    <div className="segs" role="tablist" aria-label="面板视图">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          className="seg"
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
