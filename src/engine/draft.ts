export type Direction = 'left' | 'right'

export interface DraftSettings {
  packs: number
  cardsPerPack: number
  cardsPerPick: number
  startSeconds: number
  decrementSeconds: number
  minSeconds: number
  reviewSeconds: number
  firstDirection: Direction
  alternateDirection: boolean
  autoLastPick: boolean
  deckbuildMinutes: number
}

export interface PickStep {
  kind: 'pick'
  pack: number
  pick: number
  picksInPack: number
  cardsLeft: number
  take: number
  direction: Direction
  /** 0 means untimed (the last card, which just gets taken). */
  seconds: number
  isLastPickOfPack: boolean
}

export interface ReviewStep {
  kind: 'review'
  afterPack: number
  nextPack: number
  nextDirection: Direction
  seconds: number
}

export interface DeckbuildStep {
  kind: 'deckbuild'
  seconds: number
}

export type Step = PickStep | ReviewStep | DeckbuildStep

export const DEFAULT_DRAFT: DraftSettings = {
  packs: 3,
  cardsPerPack: 15,
  cardsPerPick: 1,
  startSeconds: 60,
  decrementSeconds: 5,
  minSeconds: 10,
  reviewSeconds: 60,
  firstDirection: 'left',
  alternateDirection: true,
  autoLastPick: true,
  deckbuildMinutes: 0,
}

const opposite = (d: Direction): Direction => (d === 'left' ? 'right' : 'left')

export function directionForPack(s: DraftSettings, pack: number): Direction {
  if (!s.alternateDirection) return s.firstDirection
  return (pack - 1) % 2 === 0 ? s.firstDirection : opposite(s.firstDirection)
}

export function picksPerPack(s: DraftSettings): number {
  return Math.ceil(s.cardsPerPack / Math.max(1, s.cardsPerPick))
}

/** Seconds on the clock for a given pick number (1-based) within a pack. Resets every pack. */
export function secondsForPick(s: DraftSettings, pick: number): number {
  const floor = Math.min(s.minSeconds, s.startSeconds)
  return Math.max(floor, s.startSeconds - (pick - 1) * s.decrementSeconds)
}

export function buildSteps(s: DraftSettings): Step[] {
  const steps: Step[] = []
  const perPick = Math.max(1, s.cardsPerPick)
  const picks = picksPerPack(s)

  for (let pack = 1; pack <= s.packs; pack++) {
    const direction = directionForPack(s, pack)
    for (let pick = 1; pick <= picks; pick++) {
      const cardsLeft = s.cardsPerPack - (pick - 1) * perPick
      const take = Math.min(perPick, cardsLeft)
      const isLastPickOfPack = pick === picks
      // Only the final pick with nothing to choose between (all remaining cards get taken) is untimed.
      const untimed = s.autoLastPick && isLastPickOfPack && pick > 1
      steps.push({
        kind: 'pick',
        pack,
        pick,
        picksInPack: picks,
        cardsLeft,
        take,
        direction,
        seconds: untimed ? 0 : secondsForPick(s, pick),
        isLastPickOfPack,
      })
    }
    if (pack < s.packs && s.reviewSeconds > 0) {
      steps.push({
        kind: 'review',
        afterPack: pack,
        nextPack: pack + 1,
        nextDirection: directionForPack(s, pack + 1),
        seconds: s.reviewSeconds,
      })
    }
  }

  if (s.deckbuildMinutes > 0) {
    steps.push({ kind: 'deckbuild', seconds: s.deckbuildMinutes * 60 })
  }
  return steps
}

export function totalSeconds(steps: Step[]): number {
  return steps.reduce((sum, st) => sum + st.seconds, 0)
}

const cards = (n: number) => `${n} card${n === 1 ? '' : 's'}`
const arrow = (d: Direction) => (d === 'left' ? '⬅️' : '➡️')

export interface Instruction {
  title: string
  body: string
  /** Short line meant to be read aloud. */
  speech: string
  direction?: Direction
}

export function instructionFor(step: Step): Instruction {
  switch (step.kind) {
    case 'pick': {
      const title = `Pack ${step.pack} · Pick ${step.pick} of ${step.picksInPack}`
      if (step.isLastPickOfPack) {
        const body =
          step.take === 1 ? 'Take the last card in the pack.' : `Take the last ${cards(step.take)} in the pack.`
        return { title, body, speech: `Pack ${step.pack}, last pick. ${body}` }
      }
      const open = step.pick === 1 ? `Open pack ${step.pack}. ` : ''
      const body = `${open}Pick ${cards(step.take)}, then pass ${step.direction.toUpperCase()} ${arrow(step.direction)}`
      return {
        title,
        body,
        speech: `${open}Pick ${step.pick}. Pass ${step.direction}.`,
        direction: step.direction,
      }
    }
    case 'review':
      return {
        title: `Review · after pack ${step.afterPack}`,
        body: `Review your picks. Pack ${step.nextPack} passes ${step.nextDirection.toUpperCase()} ${arrow(step.nextDirection)}`,
        speech: `Pack ${step.afterPack} done. Review your picks. Pack ${step.nextPack} passes ${step.nextDirection}.`,
        direction: step.nextDirection,
      }
    case 'deckbuild':
      return {
        title: 'Deck building',
        body: 'Build your deck from your picks.',
        speech: 'Draft complete. Time to build your decks.',
      }
  }
}

/** Clamp user input into sane ranges so the engine never produces nonsense. */
export function sanitize(s: DraftSettings): DraftSettings {
  const int = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(Number.isFinite(v) ? v : min)))
  const startSeconds = int(s.startSeconds, 5, 600)
  return {
    ...s,
    packs: int(s.packs, 1, 10),
    cardsPerPack: int(s.cardsPerPack, 1, 30),
    cardsPerPick: int(s.cardsPerPick, 1, 5),
    startSeconds,
    decrementSeconds: int(s.decrementSeconds, 0, 60),
    minSeconds: int(s.minSeconds, 1, startSeconds),
    reviewSeconds: int(s.reviewSeconds, 0, 600),
    deckbuildMinutes: int(s.deckbuildMinutes, 0, 90),
  }
}
