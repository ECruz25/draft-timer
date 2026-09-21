import { useMemo } from 'react'
import { formatDuration } from '../components'
import { BUILT_IN_PRESETS, loadUserPresets, sameDraft, type Settings } from '../lib/storage'
import { draftSummary } from '../summary'

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export default function Home(props: {
  settings: Settings
  onChange: (s: Settings) => void
  onStart: () => void
  onSettings: () => void
  resumable?: boolean
  onResume?: () => void
  onDiscard?: () => void
}) {
  const { settings, onChange } = props
  const summary = draftSummary(settings)
  const presets = useMemo(() => [...BUILT_IN_PRESETS, ...loadUserPresets()], [])
  const showInstallHint = !isStandalone()

  return (
    <main className="screen home">
      <header className="home-hero">
        <img src="./icon.svg" alt="" width={72} height={72} />
        <h1>Cube Draft Timer</h1>
        <p className="muted">Pick timer and instructions for your cube draft.</p>
      </header>

      {props.resumable && (
        <div className="card resume">
          <strong>Draft in progress</strong>
          <div className="button-row">
            <button className="btn primary" onClick={props.onResume}>
              Resume
            </button>
            <button
              className="btn ghost"
              onClick={() => confirm('Discard the draft in progress?') && props.onDiscard?.()}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <section className="card summary">
        <div className="summary-line">{summary.line}</div>
        <div className="summary-stats">
          <div>
            <b>{summary.picks}</b>
            <span>picks</span>
          </div>
          <div>
            <b>{summary.picksPerPack}</b>
            <span>per pack</span>
          </div>
          <div>
            <b>≤ {formatDuration(summary.maxSeconds)}</b>
            <span>max time</span>
          </div>
        </div>
      </section>

      <div className="chips" role="list" aria-label="Presets">
        {presets.map((p) => (
          <button
            key={p.name}
            role="listitem"
            className={`chip ${sameDraft(p.settings, settings) ? 'on' : ''}`}
            onClick={() => onChange({ ...settings, ...p.settings })}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="home-actions">
        <button className="btn primary big" onClick={props.onStart}>
          {props.resumable ? 'Start new draft' : 'Start draft'}
        </button>
        <button className="btn secondary" onClick={props.onSettings}>
          Settings
        </button>
      </div>

      {!window.isSecureContext ? (
        <p className="install-hint warning">
          Offline mode isn't available at this address. Open the app from its HTTPS link (not the local
          http://192.168… dev address) before adding it to your home screen.
        </p>
      ) : showInstallHint && (
        <p className="install-hint muted">
          {isIOS()
            ? 'Tip: in Safari, tap Share → "Add to Home Screen" to install it as an app that works offline.'
            : 'Tip: install this app from your browser menu ("Install app" / "Add to Home screen") to use it offline.'}
        </p>
      )}
    </main>
  )
}
