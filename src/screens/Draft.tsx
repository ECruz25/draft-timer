import { useEffect, useRef } from 'react'
import { formatTime } from '../components'
import { instructionFor, type Direction, type Step } from '../engine/draft'
import { useDraftRunner } from '../lib/useDraftRunner'
import { useWakeLock } from '../lib/useWakeLock'
import type { SavedDraft, Settings } from '../lib/storage'

const RADIUS = 45
const CIRC = 2 * Math.PI * RADIUS

function Ring(props: { fraction: number; label: string; tone: string; sub?: string }) {
  return (
    <div className={`ring ${props.tone}`}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="ring-track" cx="50" cy="50" r={RADIUS} />
        <circle
          className="ring-fill"
          cx="50"
          cy="50"
          r={RADIUS}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - Math.min(1, Math.max(0, props.fraction)))}
        />
      </svg>
      <div className="ring-label" role="timer" aria-live="off">
        <span className="ring-time">{props.label}</span>
        {props.sub && <span className="ring-sub">{props.sub}</span>}
      </div>
    </div>
  )
}

function Arrow({ direction }: { direction: Direction }) {
  return (
    <div className={`pass-arrow ${direction}`} aria-label={`Pass ${direction}`}>
      <svg viewBox="0 0 120 60" aria-hidden>
        <path d="M110 30H22M22 30l22-20M22 30l22 20" />
      </svg>
      <span>PASS {direction.toUpperCase()}</span>
    </div>
  )
}

function upNext(step: Step | undefined) {
  if (!step) return 'Last step'
  const ins = instructionFor(step)
  return step.kind === 'pick' ? `${ins.title}${step.seconds ? ` · ${step.seconds}s` : ''}` : ins.title
}

export default function Draft(props: {
  saved: SavedDraft
  settings: Settings
  onFinish: () => void
  onQuit: () => void
  onLeave: (to: 'home' | 'settings') => void
}) {
  const r = useDraftRunner(props.saved, props.settings, props.onFinish)
  const wake = useWakeLock(true)
  const ins = instructionFor(r.step)
  const secondsLeft = r.remainingMs / 1000
  const warn = props.settings.warningSeconds || 10

  const pickSteps = r.steps.filter((s) => s.kind === 'pick').length
  const picksDone = r.steps.slice(0, r.index).filter((s) => s.kind === 'pick').length

  const tone =
    r.status === 'expired'
      ? 'expired'
      : r.untimed
        ? 'calm'
        : secondsLeft <= warn && r.step.seconds > warn
          ? 'warn'
          : r.step.kind === 'pick'
            ? 'normal'
            : 'calm'

  // Keyboard shortcuts for laptops: space = pause/start, enter/→ = next, ← = back.
  const runner = useRef(r)
  runner.current = r
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const r = runner.current
      if (e.target instanceof HTMLInputElement) return
      if (e.key === ' ') {
        e.preventDefault()
        if (r.status === 'idle') r.start()
        else r.togglePause()
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        r.next()
      } else if (e.key === 'ArrowLeft') r.back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const ringLabel = r.untimed ? '—' : formatTime(secondsLeft)
  const ringSub =
    r.status === 'expired'
      ? "TIME'S UP"
      : r.status === 'paused'
        ? 'PAUSED'
        : r.status === 'idle'
          ? 'READY'
          : r.untimed
            ? 'NO TIMER'
            : undefined

  return (
    <main className={`screen draft ${r.status === 'expired' ? 'flash' : ''} kind-${r.step.kind}`}>
      <header className="topbar">
        <button className="btn ghost small" onClick={() => props.onLeave('home')}>
          ‹ Home
        </button>
        <div className="topbar-title">{ins.title}</div>
        <button className="btn ghost small icon" onClick={() => props.onLeave('settings')} aria-label="Settings">
          ⚙︎
        </button>
      </header>

      <div className="draft-body">
        <Ring
          fraction={r.untimed ? 1 : r.remainingMs / (r.totalMs || 1)}
          label={ringLabel}
          sub={ringSub}
          tone={tone}
        />

        <div className="instruction">
          <p className="instruction-body">{ins.body}</p>
          {ins.direction && r.step.kind === 'pick' && !r.step.isLastPickOfPack && <Arrow direction={ins.direction} />}
          {r.step.kind === 'review' && <Arrow direction={r.step.nextDirection} />}
        </div>
      </div>

      <footer className="draft-controls">
        <div className="draft-actions">
        {r.status === 'idle' ? (
          <button className="btn primary big" onClick={r.start}>
            ▶ Start {r.index === 0 ? 'draft' : ''}
          </button>
        ) : (
          <>
            <div className="button-row">
              <button className="btn secondary" onClick={r.back} disabled={r.index === 0 && r.status === 'paused'} aria-label="Previous step">
                ‹ Back
              </button>
              {!r.untimed && (
                <button className="btn secondary" onClick={r.togglePause} disabled={r.status === 'expired'}>
                  {r.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
                </button>
              )}
              {!r.untimed && (
                <button className="btn secondary" onClick={() => r.addTime(10_000)}>
                  +10s
                </button>
              )}
              {props.settings.voiceEnabled && (
                <button className="btn secondary" onClick={r.repeatInstruction} aria-label="Repeat instruction">
                  🔊
                </button>
              )}
            </div>
            <button className={`btn big ${r.status === 'expired' || r.untimed ? 'primary pulse' : 'primary'}`} onClick={r.next}>
              {r.isLast ? 'Finish ✓' : 'Next ▶'}
            </button>
          </>
        )}
        </div>

        <div className="progress" aria-label={`${picksDone} of ${pickSteps} picks done`}>
          <div className="progress-bar">
            <div style={{ width: `${(picksDone / pickSteps) * 100}%` }} />
          </div>
          <div className="progress-meta">
            <span>
              {picksDone}/{pickSteps} picks
            </span>
            <span>Next: {upNext(r.steps[r.index + 1])}</span>
          </div>
        </div>

        <div className="draft-footer-links">
          <button className="link danger" onClick={() => confirm('End this draft?') && props.onQuit()}>
            End draft
          </button>
          {wake.supported ? (
            <span className="muted small">{wake.held ? '☀︎ Screen stays on' : ''}</span>
          ) : (
            <span className="muted small">Keep the screen on. This browser can't lock it awake.</span>
          )}
        </div>
      </footer>
    </main>
  )
}
