import { useState } from 'react'
import { Section, Segmented, Stepper, Toggle, formatDuration } from '../components'
import { DEFAULT_DRAFT, sanitize, type Direction } from '../engine/draft'
import { playWarning, setVolume, startAlarm, stopAlarm, unlockAudio } from '../lib/audio'
import { speak, speechSupported } from '../lib/speech'
import {
  BUILT_IN_PRESETS,
  DEFAULT_SETTINGS,
  draftSettingsOf,
  loadUserPresets,
  sameDraft,
  saveUserPresets,
  type Preset,
  type Settings,
} from '../lib/storage'
import { draftSummary } from '../summary'

export default function SettingsScreen(props: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void }) {
  const { settings: s, onChange } = props
  const [userPresets, setUserPresets] = useState<Preset[]>(loadUserPresets)
  const [presetName, setPresetName] = useState('')
  const [alarmTesting, setAlarmTesting] = useState(false)

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...s, [key]: value }
    onChange({ ...next, ...sanitize(next) })
  }
  const summary = draftSummary(s)

  const savePreset = () => {
    const name = presetName.trim()
    if (!name) return
    const others = userPresets.filter((p) => p.name !== name)
    const next = [...others, { name, settings: draftSettingsOf(s) }]
    setUserPresets(next)
    saveUserPresets(next)
    setPresetName('')
  }

  const deletePreset = (name: string) => {
    const next = userPresets.filter((p) => p.name !== name)
    setUserPresets(next)
    saveUserPresets(next)
  }

  const testAlarm = () => {
    unlockAudio()
    setVolume(s.soundEnabled ? s.volume : 0)
    if (alarmTesting) {
      stopAlarm()
      setAlarmTesting(false)
      return
    }
    const ms = (s.alarmSeconds || 5) * 1000
    startAlarm(ms)
    setAlarmTesting(true)
    window.setTimeout(() => setAlarmTesting(false), ms)
  }

  return (
    <main className="screen settings">
      <header className="topbar">
        <button className="btn ghost" onClick={props.onBack}>
          ‹ Back
        </button>
        <h1>Settings</h1>
        <span className="topbar-spacer" />
      </header>

      <div className="card summary compact">
        <div className="summary-line">
          {summary.picks} picks · up to {formatDuration(summary.maxSeconds)}
        </div>
      </div>

      <Section title="Packs">
        <Stepper label="Number of packs" value={s.packs} min={1} max={10} onChange={(v) => set('packs', v)} />
        <Stepper label="Cards per pack" value={s.cardsPerPack} min={1} max={30} onChange={(v) => set('cardsPerPack', v)} />
        <Stepper
          label="Cards per pick"
          hint="Some formats take 2 at a time"
          value={s.cardsPerPick}
          min={1}
          max={5}
          onChange={(v) => set('cardsPerPick', v)}
        />
      </Section>

      <Section
        title="Timer"
        footer={`Pick 1 gets ${s.startSeconds}s, each pick after gets ${s.decrementSeconds}s less, never below ${Math.min(s.minSeconds, s.startSeconds)}s. Resets every pack.`}
      >
        <Stepper label="Starting time" value={s.startSeconds} min={5} max={600} step={5} unit="s" onChange={(v) => set('startSeconds', v)} />
        <Stepper label="Decrease per pick" value={s.decrementSeconds} min={0} max={60} unit="s" onChange={(v) => set('decrementSeconds', v)} />
        <Stepper label="Minimum time" value={s.minSeconds} min={1} max={s.startSeconds} unit="s" onChange={(v) => set('minSeconds', v)} />
        <Stepper
          label="Review between packs"
          hint="0 to skip"
          value={s.reviewSeconds}
          min={0}
          max={600}
          step={15}
          unit="s"
          onChange={(v) => set('reviewSeconds', v)}
        />
        <Toggle
          label="Last card is untimed"
          hint="Just take it, no countdown"
          checked={s.autoLastPick}
          onChange={(v) => set('autoLastPick', v)}
        />
        <Stepper
          label="Deck building timer"
          hint="0 to skip"
          value={s.deckbuildMinutes}
          min={0}
          max={90}
          step={5}
          unit="min"
          onChange={(v) => set('deckbuildMinutes', v)}
        />
      </Section>

      <Section title="Passing">
        <Segmented<Direction>
          label="Pack 1 passes"
          value={s.firstDirection}
          options={[
            { value: 'left', label: '⬅️ Left' },
            { value: 'right', label: 'Right ➡️' },
          ]}
          onChange={(v) => set('firstDirection', v)}
        />
        <Toggle label="Alternate each pack" hint="Left, right, left…" checked={s.alternateDirection} onChange={(v) => set('alternateDirection', v)} />
      </Section>

      <Section title="Sound & alerts" footer="On iPhone, web sounds follow the silent switch. Make sure it's off and the volume is up.">
        <Toggle label="Sound" checked={s.soundEnabled} onChange={(v) => set('soundEnabled', v)} />
        <div className="row">
          <div className="row-label">
            <span>Volume</span>
          </div>
          <input
            type="range"
            className="slider"
            min={0}
            max={1}
            step={0.05}
            value={s.volume}
            disabled={!s.soundEnabled}
            aria-label="Volume"
            onChange={(e) => set('volume', Number(e.target.value))}
          />
        </div>
        <Stepper
          label="Warning beep at"
          hint="0 to turn off"
          value={s.warningSeconds}
          min={0}
          max={60}
          unit="s"
          onChange={(v) => set('warningSeconds', v)}
        />
        <Stepper
          label="Alarm length"
          hint="0 = until Next is tapped"
          value={s.alarmSeconds}
          min={0}
          max={60}
          unit="s"
          onChange={(v) => set('alarmSeconds', v)}
        />
        <Toggle label="Tick on last 3 seconds" checked={s.finalTicks} onChange={(v) => set('finalTicks', v)} />
        <Toggle label="Vibrate on alarm" hint="Android only" checked={s.vibrate} onChange={(v) => set('vibrate', v)} />
        <Toggle
          label="Read instructions aloud"
          hint={speechSupported() ? 'e.g. "Pick 3. Pass left."' : 'Not supported in this browser'}
          checked={s.voiceEnabled}
          onChange={(v) => set('voiceEnabled', v)}
        />
        <div className="button-row inset">
          <button
            className="btn secondary"
            onClick={() => {
              unlockAudio()
              setVolume(s.soundEnabled ? s.volume : 0)
              playWarning()
            }}
          >
            Test beep
          </button>
          <button className="btn secondary" onClick={testAlarm}>
            {alarmTesting ? 'Stop alarm' : 'Test alarm'}
          </button>
          <button className="btn secondary" disabled={!speechSupported()} onClick={() => speak('Open pack 1. Pick 1. Pass left.')}>
            Test voice
          </button>
        </div>
      </Section>

      <Section title="Presets">
        {[...BUILT_IN_PRESETS, ...userPresets].map((p) => (
          <div className="row" key={p.name}>
            <div className="row-label">
              <span>
                {p.name} {sameDraft(p.settings, s) && <span className="badge">current</span>}
              </span>
              <small>{draftSummary(p.settings).line}</small>
            </div>
            <div className="button-row">
              <button className="btn small secondary" onClick={() => onChange({ ...s, ...p.settings })}>
                Use
              </button>
              {!p.builtIn && (
                <button
                  className="btn small ghost danger"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => confirm(`Delete preset "${p.name}"?`) && deletePreset(p.name)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        <form
          className="row preset-form"
          onSubmit={(e) => {
            e.preventDefault()
            savePreset()
          }}
        >
          <input
            className="text-input"
            placeholder="Save current settings as…"
            value={presetName}
            maxLength={40}
            onChange={(e) => setPresetName(e.target.value)}
          />
          <button className="btn small primary" type="submit" disabled={!presetName.trim()}>
            Save
          </button>
        </form>
      </Section>

      <div className="button-row center">
        <button
          className="btn ghost danger"
          onClick={() => confirm('Reset all settings to defaults?') && onChange({ ...DEFAULT_SETTINGS, ...DEFAULT_DRAFT })}
        >
          Reset to defaults
        </button>
      </div>
      <p className="muted center small">Changes to packs and timers apply to the next draft you start.</p>
    </main>
  )
}
