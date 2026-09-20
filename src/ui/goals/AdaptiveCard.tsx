import { evaluateAdaptive } from '../../adaptive'
import { applyAdaptive, dailyIntake, plannedLbPerWeek } from '../../adaptiveRun'
import type { WeightEntry } from '../../db/types'
import { computeTargets, formulaTdee } from '../../goals'
import type { SyncEngine } from '../../sync/engine'
import type { LocalStore } from '../../sync/store'
import { useT } from '../i18n'
import type { PaceReason } from '../../adaptive'

export interface AdaptiveUpdate { from: number; to: number; reason: PaceReason }

// Once per app open: waits for the first sync cycle (success or failure) so pulled weights/log count,
// then evaluates and stores an 'updated' result. Returns the calorie-target change to announce, or null.
export async function runAdaptive(store: LocalStore, engine: SyncEngine, userId: string, today: string): Promise<AdaptiveUpdate | null> {
  await engine.runOnce()
  const profile = await store.get('profile', userId)
  if (profile?.deletedAt !== null || !profile.adaptiveEnabled) return null // absent, deleted, or adaptive off
  const weights = await store.all('weights')
  const latest = weights.reduce<WeightEntry | null>((l, w) => (l === null || w.date > l.date ? w : l), null)
  if (latest === null) return null
  const year = new Date().getFullYear()
  const result = evaluateAdaptive({
    today,
    lastRunOn: profile.tdeeUpdatedOn,
    previous: profile.tdeeEstimate ?? formulaTdee(profile, latest.weightLb, year),
    plannedLbPerWeek: plannedLbPerWeek(profile),
    weights: weights.map((w) => ({ date: w.date, weightLb: w.weightLb })),
    intake: dailyIntake(await store.all('food_log')),
  })
  const updated = applyAdaptive(profile, result, today)
  if (updated === null || result.kind !== 'updated') return null
  await store.put('profile', updated)
  return {
    from: computeTargets(profile, latest.weightLb, year).calories,
    to: computeTargets(updated, latest.weightLb, year).calories,
    reason: result.reason,
  }
}

export function AdaptiveCard({ update, onUndo, onDismiss }: { update: AdaptiveUpdate; onUndo: () => void; onDismiss: () => void }) {
  const t = useT()
  return (
    // The live region is the always-mounted slot in App; this card is only its content.
    <section class="adaptive-card notice" aria-label={t.t('adaptive.updated')}>
      <p>{t.t('adaptive.card', {
        from: t.n(update.from), to: t.n(update.to), reason: t.t(`adaptive.reason.${update.reason}`),
      })}</p>
      <button type="button" class="stamp" onClick={onUndo}>{t.t('common.undo')}</button>
      <button type="button" class="link" onClick={onDismiss}>{t.t('common.dismiss')}</button>
    </section>
  )
}
