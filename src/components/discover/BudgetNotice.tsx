'use client'

/**
 * §12.9 filter 3 — "Surface the exclusion HONESTLY rather than silently:
 * '12 pieces hidden by your budget. [Show them anyway]'."
 *
 * The same treatment applies to the §12.9a size-fit constraint, which is the
 * whole reason that constraint is acceptable: nothing is hidden without saying
 * so, and one click undoes it.
 */
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function BudgetNotice({ hiddenByBudget, hiddenBySize }: { hiddenByBudget: number; hiddenBySize: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  if (hiddenByBudget === 0 && hiddenBySize === 0) return null

  const show = (key: string) => {
    const next = new URLSearchParams(params.toString())
    next.set(key, '1')
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  return (
    <div className="hidden-notice" role="status">
      {hiddenByBudget > 0 ? (
        <p>
          <span className="tnum">{hiddenByBudget}</span>{' '}
          {hiddenByBudget === 1 ? 'piece is' : 'pieces are'} hidden by your budget.{' '}
          <button type="button" className="link-button" onClick={() => show('overBudget')}>Show them anyway</button>
        </p>
      ) : null}
      {hiddenBySize > 0 ? (
        <p>
          <span className="tnum">{hiddenBySize}</span>{' '}
          {hiddenBySize === 1 ? 'piece won’t' : 'pieces won’t'} fit the wall size you chose.{' '}
          <button type="button" className="link-button" onClick={() => show('allSizes')}>Show them anyway</button>
        </p>
      ) : null}
    </div>
  )
}
