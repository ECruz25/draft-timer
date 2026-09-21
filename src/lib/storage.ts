import { DEFAULT_DRAFT, sanitize, type DraftSettings } from '../engine/draft'

export interface SoundSettings {
  soundEnabled: boolean
  volume: number
  /** Beep once when this many seconds remain (0 = off). */
  warningSeconds: number
  /** How long the time's-up alarm sounds (0 = until Next is tapped). */
  alarmSeconds: number
  /** Short ticks during the final 3 seconds. */
  finalTicks: boolean
  voiceEnabled: boolean
  vibrate: boolean
}

export interface Settings extends DraftSettings, SoundSettings {}

export interface Preset {
  name: string
  settings: DraftSettings
  builtIn?: boolean
}

export const DEFAULT_SOUND: SoundSettings = {
  soundEnabled: true,
  volume: 0.8,
  warningSeconds: 10,
  alarmSeconds: 5,
  finalTicks: true,
  voiceEnabled: false,
  vibrate: true,
}

export const DEFAULT_SETTINGS: Settings = { ...DEFAULT_DRAFT, ...DEFAULT_SOUND }

export const BUILT_IN_PRESETS: Preset[] = [
  { name: 'Standard cube (3 × 15)', settings: DEFAULT_DRAFT, builtIn: true },
  { name: 'twobert (5 × 9)', settings: { ...DEFAULT_DRAFT, packs: 5, cardsPerPack: 9 }, builtIn: true },
  {
    name: 'Fast draft (3 × 15)',
    settings: { ...DEFAULT_DRAFT, startSeconds: 40, decrementSeconds: 3, minSeconds: 8, reviewSeconds: 30 },
    builtIn: true,
  },
  {
    name: 'Relaxed (3 × 15)',
    settings: { ...DEFAULT_DRAFT, startSeconds: 75, decrementSeconds: 5, minSeconds: 15, reviewSeconds: 90 },
    builtIn: true,
  },
  {
    name: 'Grid-ish / small packs (4 × 9)',
    settings: { ...DEFAULT_DRAFT, packs: 4, cardsPerPack: 9, startSeconds: 50, decrementSeconds: 5 },
    builtIn: true,
  },
]

const KEYS = {
  settings: 'cdt.settings.v1',
  presets: 'cdt.presets.v1',
  draft: 'cdt.draft.v1',
}

// Storage can throw (private mode, quota, disabled) — never let that break the app.
function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function loadSettings(): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings) }
  return { ...merged, ...sanitize(merged) }
}

export const saveSettings = (s: Settings) => write(KEYS.settings, s)

export const loadUserPresets = (): Preset[] => read<Preset[]>(KEYS.presets) ?? []
export const saveUserPresets = (p: Preset[]) => write(KEYS.presets, p)

export interface SavedDraft {
  settings: Settings
  index: number
  status: 'running' | 'paused' | 'expired' | 'idle'
  /** Epoch ms when the current timer ends (running only). */
  endAt: number
  /** Remaining ms while paused/idle. */
  remainingMs: number
}

export const loadDraft = () => read<SavedDraft>(KEYS.draft)
export const saveDraft = (d: SavedDraft | undefined) => write(KEYS.draft, d)

export function draftSettingsOf(s: Settings): DraftSettings {
  const {
    packs, cardsPerPack, cardsPerPick, startSeconds, decrementSeconds, minSeconds,
    reviewSeconds, firstDirection, alternateDirection, autoLastPick, deckbuildMinutes,
  } = s
  return {
    packs, cardsPerPack, cardsPerPick, startSeconds, decrementSeconds, minSeconds,
    reviewSeconds, firstDirection, alternateDirection, autoLastPick, deckbuildMinutes,
  }
}

export function sameDraft(a: DraftSettings, b: DraftSettings) {
  return JSON.stringify(draftSettingsOf(a as Settings)) === JSON.stringify(draftSettingsOf(b as Settings))
}
