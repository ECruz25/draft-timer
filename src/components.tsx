import { useEffect, useState, type ReactNode } from 'react'

export function Stepper(props: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  hint?: string
}) {
  const { label, value, onChange, min, max, step = 1, unit, hint } = props
  // Local text so the field can be cleared while typing; commit a clamped number on blur.
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const commit = () => {
    const n = Number(text)
    if (text.trim() === '' || !Number.isFinite(n)) setText(String(value))
    else onChange(clamp(Math.round(n)))
  }
  return (
    <div className="row">
      <div className="row-label">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="stepper">
        <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>
          −
        </button>
        <label className="stepper-value">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={text}
            aria-label={label}
            onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          {unit && <span className="unit">{unit}</span>}
        </label>
        <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>
          +
        </button>
      </div>
    </div>
  )
}

export function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="row toggle-row">
      <div className="row-label">
        <span>{props.label}</span>
        {props.hint && <small>{props.hint}</small>}
      </div>
      <input type="checkbox" role="switch" className="switch" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
    </label>
  )
}

export function Segmented<T extends string>(props: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="row">
      <div className="row-label">
        <span>{props.label}</span>
      </div>
      <div className="segmented" role="radiogroup" aria-label={props.label}>
        {props.options.map((o) => (
          <button
            type="button"
            key={o.value}
            role="radio"
            aria-checked={props.value === o.value}
            className={props.value === o.value ? 'on' : ''}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Section(props: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="section">
      <h2>{props.title}</h2>
      <div className="card">{props.children}</div>
      {props.footer && <p className="section-footer">{props.footer}</p>}
    </section>
  )
}

export function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function formatDuration(totalSeconds: number) {
  const m = Math.round(totalSeconds / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}
