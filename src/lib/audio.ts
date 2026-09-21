// All sounds are synthesized with Web Audio, so there are no files to load and everything works offline.
// iOS only lets audio start inside a user gesture, so call unlockAudio() from a tap (the Start button).

let ctx: AudioContext | undefined
let volume = 0.8
let alarmTimer: number | undefined
let alarmStopTimer: number | undefined

function context(): AudioContext | undefined {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return undefined
    ctx = new Ctor()
  }
  // iOS suspends/interrupts the context after backgrounding; try to wake it every time.
  if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  return ctx
}

export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v))
}

export function unlockAudio() {
  const c = context()
  if (!c) return
  // Playing a silent buffer inside the gesture is what actually unlocks iOS.
  const src = c.createBufferSource()
  src.buffer = c.createBuffer(1, 1, 22050)
  src.connect(c.destination)
  src.start(0)
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gainScale = 1) {
  const c = context()
  if (!c || volume === 0) return
  const t = c.currentTime + start
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  const peak = volume * gainScale
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

export const playTick = () => tone(1000, 0, 0.08, 'square', 0.25)

export function playWarning() {
  tone(740, 0, 0.18, 'triangle', 0.7)
  tone(740, 0.25, 0.18, 'triangle', 0.7)
}

export function playStart() {
  tone(523, 0, 0.12, 'sine', 0.6)
  tone(784, 0.12, 0.2, 'sine', 0.6)
}

function alarmBurst() {
  for (let i = 0; i < 4; i++) {
    tone(988, i * 0.16, 0.12, 'square', 0.55)
    tone(1319, i * 0.16 + 0.06, 0.08, 'square', 0.35)
  }
}

/** Repeating alarm that stops after `durationMs` (0 = until stopAlarm() is called). */
export function startAlarm(durationMs = 0) {
  stopAlarm()
  alarmBurst()
  alarmTimer = window.setInterval(alarmBurst, 1300)
  if (durationMs > 0) alarmStopTimer = window.setTimeout(stopAlarm, durationMs)
}

export function stopAlarm() {
  if (alarmStopTimer !== undefined) {
    clearTimeout(alarmStopTimer)
    alarmStopTimer = undefined
  }
  if (alarmTimer !== undefined) {
    clearInterval(alarmTimer)
    alarmTimer = undefined
  }
}
