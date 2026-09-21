import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildSteps, instructionFor, type Step } from '../engine/draft'
import { playStart, playTick, playWarning, setVolume, startAlarm, stopAlarm } from './audio'
import { speak, stopSpeech } from './speech'
import { saveDraft, type SavedDraft, type Settings } from './storage'

export type Status = 'idle' | 'running' | 'paused' | 'expired'

interface State {
  index: number
  status: Status
  endAt: number
  remainingMs: number
}

const msFor = (step: Step) => step.seconds * 1000

/**
 * Drives a draft. `draftSettings` is the snapshot the draft was started with (so editing settings
 * mid-draft doesn't reshuffle steps); `live` supplies sound/voice preferences, which apply immediately.
 */
export function useDraftRunner(saved: SavedDraft, live: Settings, onFinish: () => void) {
  const steps = useMemo(() => buildSteps(saved.settings), [saved.settings])
  const [state, setState] = useState<State>(() => ({
    index: Math.min(saved.index, steps.length - 1),
    status: saved.status,
    endAt: saved.endAt,
    remainingMs: saved.remainingMs,
  }))
  const [now, setNow] = useState(() => Date.now())
  const lastSecondRef = useRef<number | null>(null)
  const liveRef = useRef(live)
  liveRef.current = live

  const step = steps[state.index]
  const untimed = step.seconds === 0
  const remainingMs =
    state.status === 'running' ? Math.max(0, state.endAt - now) : state.status === 'expired' ? 0 : state.remainingMs

  useEffect(() => setVolume(live.soundEnabled ? live.volume : 0), [live.soundEnabled, live.volume])

  // Persist so a reload / iOS killing the page resumes exactly where we were (timestamps keep it accurate).
  useEffect(() => {
    saveDraft({ settings: saved.settings, ...state })
  }, [saved.settings, state])

  const announce = useCallback((s: Step) => {
    if (liveRef.current.voiceEnabled) speak(instructionFor(s).speech, liveRef.current.volume || 1)
  }, [])

  const startStep = useCallback(
    (index: number, status: Status = 'running') => {
      stopAlarm()
      const next = steps[index]
      lastSecondRef.current = null
      const t = Date.now()
      setNow(t)
      setState({ index, status, endAt: t + msFor(next), remainingMs: msFor(next) })
      if (status === 'running') {
        if (next.seconds > 0) playStart()
        announce(next)
      }
    },
    [steps, announce],
  )

  // Ticking loop: compute from the wall clock rather than counting intervals, so throttled/backgrounded
  // timers stay accurate.
  useEffect(() => {
    if (state.status !== 'running' || untimed) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const left = state.endAt - t
      const sec = Math.ceil(left / 1000)
      const prev = lastSecondRef.current
      lastSecondRef.current = sec
      const s = liveRef.current
      if (left <= 0) {
        setState((st) => ({ ...st, status: 'expired', remainingMs: 0 }))
        return
      }
      if (prev !== null && sec < prev) {
        if (s.warningSeconds > 0 && sec === s.warningSeconds && step.seconds > s.warningSeconds) playWarning()
        else if (s.finalTicks && sec <= 3) playTick()
      }
    }
    tick()
    const id = window.setInterval(tick, 100)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [state.status, state.endAt, untimed, step.seconds])

  // Alarm sounds for the configured length; the screen keeps flashing until the user taps Next (or adds time).
  useEffect(() => {
    if (state.status !== 'expired') return
    startAlarm(liveRef.current.alarmSeconds * 1000)
    // Browsers block vibrate() until the user has tapped the page (e.g. right after a reload).
    const canVibrate = () => navigator.userActivation?.hasBeenActive ?? true
    if (liveRef.current.vibrate && canVibrate()) navigator.vibrate?.([400, 200, 400, 200, 400])
    return () => {
      stopAlarm()
      if (canVibrate()) navigator.vibrate?.(0)
    }
  }, [state.status])

  useEffect(
    () => () => {
      stopAlarm()
      stopSpeech()
    },
    [],
  )

  const isLast = state.index >= steps.length - 1

  const next = useCallback(() => {
    if (isLast) {
      stopAlarm()
      saveDraft(undefined)
      onFinish()
      return
    }
    startStep(state.index + 1)
  }, [isLast, onFinish, startStep, state.index])

  const back = useCallback(() => {
    if (state.index === 0) startStep(0, 'paused')
    else startStep(state.index - 1, 'paused')
  }, [startStep, state.index])

  const start = useCallback(() => startStep(state.index), [startStep, state.index])

  const togglePause = useCallback(() => {
    setState((st) => {
      if (st.status === 'running') return { ...st, status: 'paused', remainingMs: Math.max(0, st.endAt - Date.now()) }
      if (st.status === 'paused' || st.status === 'idle') return { ...st, status: 'running', endAt: Date.now() + st.remainingMs }
      return st
    })
  }, [])

  const addTime = useCallback((ms: number) => {
    // `now` catches up on the next tick, which the endAt change triggers immediately.
    setState((st) => {
      if (st.status === 'running') return { ...st, endAt: st.endAt + ms }
      if (st.status === 'expired') return { ...st, status: 'running', endAt: Date.now() + ms, remainingMs: ms }
      return { ...st, remainingMs: st.remainingMs + ms }
    })
  }, [])

  const repeatInstruction = useCallback(() => speak(instructionFor(step).speech), [step])

  return {
    steps,
    step,
    index: state.index,
    status: state.status,
    untimed,
    remainingMs,
    totalMs: Math.max(msFor(step), remainingMs),
    isLast,
    next,
    back,
    start,
    togglePause,
    addTime,
    repeatInstruction,
  }
}
