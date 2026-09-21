import { buildSteps, picksPerPack, totalSeconds, type DraftSettings } from './engine/draft'

export function draftSummary(s: DraftSettings) {
  const steps = buildSteps(s)
  const picks = steps.filter((st) => st.kind === 'pick').length
  return {
    picks,
    picksPerPack: picksPerPack(s),
    maxSeconds: totalSeconds(steps),
    line: `${s.packs} pack${s.packs === 1 ? '' : 's'} × ${s.cardsPerPack} cards · ${s.startSeconds}s start, −${s.decrementSeconds}s per pick (min ${Math.min(s.minSeconds, s.startSeconds)}s)${s.reviewSeconds > 0 ? ` · ${s.reviewSeconds}s review` : ''}`,
  }
}
