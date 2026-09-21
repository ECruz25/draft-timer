import { useCallback, useEffect, useState } from 'react'
import { unlockAudio } from './lib/audio'
import { unlockSpeech } from './lib/speech'
import {
  loadDraft,
  loadSettings,
  saveDraft,
  saveSettings,
  type SavedDraft,
  type Settings,
} from './lib/storage'
import { buildSteps, sanitize } from './engine/draft'
import Home from './screens/Home'
import SettingsScreen from './screens/Settings'
import Draft from './screens/Draft'
import Done from './screens/Done'

type Screen = 'home' | 'settings' | 'draft' | 'done'

export default function App() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings)
  const [saved, setSaved] = useState<SavedDraft | undefined>(loadDraft)
  const [screen, setScreen] = useState<Screen>(() => (loadDraft() ? 'draft' : 'home'))

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s)
    saveSettings(s)
  }, [])

  // iOS only allows sound/speech after a user gesture; re-unlock on every tap (cheap, and iOS can re-lock
  // audio after the app is backgrounded).
  useEffect(() => {
    let speechUnlocked = false
    const unlock = () => {
      unlockAudio()
      if (!speechUnlocked) {
        unlockSpeech()
        speechUnlocked = true
      }
    }
    document.addEventListener('pointerdown', unlock)
    return () => document.removeEventListener('pointerdown', unlock)
  }, [])

  const startDraft = () => {
    const snapshot = { ...settings, ...sanitize(settings) }
    const first = buildSteps(snapshot)[0]
    const draft: SavedDraft = {
      settings: snapshot,
      index: 0,
      status: 'idle',
      endAt: 0,
      remainingMs: first.seconds * 1000,
    }
    saveDraft(draft)
    setSaved(draft)
    setScreen('draft')
  }

  const endDraft = () => {
    saveDraft(undefined)
    setSaved(undefined)
    setScreen('home')
  }

  const finish = useCallback(() => {
    setSaved(undefined)
    setScreen('done')
  }, [])

  switch (screen) {
    case 'settings':
      return <SettingsScreen settings={settings} onChange={setSettings} onBack={() => setScreen(saved ? 'draft' : 'home')} />
    case 'draft':
      return saved ? (
        <Draft
          saved={saved}
          settings={settings}
          onFinish={finish}
          onQuit={endDraft}
          onLeave={(to) => {
            // The runner persists on every change; pick up its latest state so we resume exactly there.
            setSaved(loadDraft() ?? saved)
            setScreen(to)
          }}
        />
      ) : (
        <Home settings={settings} onChange={setSettings} onStart={startDraft} onSettings={() => setScreen('settings')} />
      )
    case 'done':
      return <Done onHome={() => setScreen('home')} onAgain={startDraft} />
    default:
      return (
        <Home
          settings={settings}
          onChange={setSettings}
          onStart={startDraft}
          onSettings={() => setScreen('settings')}
          resumable={!!saved}
          onResume={() => setScreen('draft')}
          onDiscard={endDraft}
        />
      )
  }
}
