import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DRAFT,
  buildSteps,
  instructionFor,
  sanitize,
  secondsForPick,
  type PickStep,
} from './draft'

const picks = (steps: ReturnType<typeof buildSteps>) => steps.filter((s): s is PickStep => s.kind === 'pick')

describe('buildSteps with defaults (3 packs x 15)', () => {
  const steps = buildSteps(DEFAULT_DRAFT)

  it('has 45 picks and 2 reviews', () => {
    expect(picks(steps)).toHaveLength(45)
    expect(steps.filter((s) => s.kind === 'review')).toHaveLength(2)
    expect(steps).toHaveLength(47)
  })

  it('decreases 5s per pick, floors at 10s, and resets each pack', () => {
    const p = picks(steps)
    expect(p.slice(0, 4).map((s) => s.seconds)).toEqual([60, 55, 50, 45])
    expect(p[10].seconds).toBe(10) // pick 11: 60 - 50 = 10
    expect(p[12].seconds).toBe(10) // pick 13 would be 0, floored
    expect(p[14].seconds).toBe(0) // last card is untimed
    expect(p[15]).toMatchObject({ pack: 2, pick: 1, seconds: 60 })
  })

  it('alternates left, right, left', () => {
    const p = picks(steps)
    expect(p[0].direction).toBe('left')
    expect(p[15].direction).toBe('right')
    expect(p[30].direction).toBe('left')
  })

  it('places reviews between packs, not after the last one', () => {
    expect(steps[15]).toMatchObject({ kind: 'review', afterPack: 1, nextPack: 2, nextDirection: 'right' })
    expect(steps[31]).toMatchObject({ kind: 'review', afterPack: 2, nextPack: 3, nextDirection: 'left' })
    expect(steps.at(-1)).toMatchObject({ kind: 'pick', pack: 3, pick: 15 })
  })
})

describe('options', () => {
  it('handles multiple cards per pick with an uneven remainder', () => {
    const p = picks(buildSteps({ ...DEFAULT_DRAFT, packs: 1, cardsPerPack: 15, cardsPerPick: 2 }))
    expect(p).toHaveLength(8)
    expect(p[6]).toMatchObject({ cardsLeft: 3, take: 2 })
    expect(p[7]).toMatchObject({ cardsLeft: 1, take: 1, seconds: 0 })
  })

  it('times the last pick when autoLastPick is off', () => {
    const p = picks(buildSteps({ ...DEFAULT_DRAFT, autoLastPick: false }))
    expect(p[14].seconds).toBe(10)
  })

  it('skips reviews when review time is 0 and adds deckbuilding', () => {
    const steps = buildSteps({ ...DEFAULT_DRAFT, reviewSeconds: 0, deckbuildMinutes: 25 })
    expect(steps.some((s) => s.kind === 'review')).toBe(false)
    expect(steps.at(-1)).toEqual({ kind: 'deckbuild', seconds: 1500 })
  })

  it('can always pass the same direction', () => {
    const p = picks(buildSteps({ ...DEFAULT_DRAFT, alternateDirection: false, firstDirection: 'right' }))
    expect(new Set(p.map((s) => s.direction))).toEqual(new Set(['right']))
  })

  it('never goes below the start time when min > start', () => {
    expect(secondsForPick({ ...DEFAULT_DRAFT, startSeconds: 8, minSeconds: 10 }, 3)).toBe(8)
  })
})

describe('instructions', () => {
  it('tells players to open the pack on pick 1', () => {
    const [first] = buildSteps(DEFAULT_DRAFT)
    const ins = instructionFor(first)
    expect(ins.body).toBe('Open pack 1. Pick 1 card, then pass LEFT ⬅️')
    expect(ins.speech).toBe('Open pack 1. Pick 1. Pass left.')
  })
})

describe('sanitize', () => {
  it('clamps bad input', () => {
    const s = sanitize({ ...DEFAULT_DRAFT, packs: 0, cardsPerPack: NaN, minSeconds: 999, startSeconds: 30 })
    expect(s.packs).toBe(1)
    expect(s.cardsPerPack).toBe(1)
    expect(s.minSeconds).toBe(30)
  })
})
