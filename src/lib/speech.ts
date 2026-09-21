const synth = (): SpeechSynthesis | undefined =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined

export const speechSupported = () => !!synth()

/** iOS requires the first utterance to happen inside a user gesture. */
export function unlockSpeech() {
  const s = synth()
  if (!s) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  s.speak(u)
}

export function speak(text: string, volume = 1) {
  const s = synth()
  if (!s) return
  s.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1.05
  u.volume = Math.min(1, Math.max(0, volume))
  s.speak(u)
}

export const stopSpeech = () => synth()?.cancel()
