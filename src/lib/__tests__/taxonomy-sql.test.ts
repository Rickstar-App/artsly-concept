/**
 * The SECOND HALF of the §9 regression guard.
 *
 * `taxonomy.ts` and the Postgres CHECK constraints in
 * `supabase/migrations/0001_init.sql` are two copies of the same enum. Two
 * copies drift — that is precisely how v1.0 ended up with a survey that offered
 * "Pop art" and artwork tags that said "Pop", scoring a silent zero for three
 * of twelve styles.
 *
 * This test makes drift a build failure.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { STYLES, COLORS, MOODS, ROOMS, SIZES, BUDGET_BANDS, CHANGE_FREQUENCIES,
         PIECE_TYPES, RETURN_REASONS, ARTWORK_AVAILABILITY, RENTAL_STATUSES,
         RENTAL_SOURCES, MYSTERY_STATUSES, USER_ROLES } from '../taxonomy'

const SQL = readFileSync(join(process.cwd(), 'supabase/migrations/0001_init.sql'), 'utf8')

/** Pull the array literal out of a `valid_x() ... select array[...]` function. */
function sqlArray(fn: string): string[] {
  const re = new RegExp(`function ${fn}\\(\\)[\\s\\S]*?select array\\[([\\s\\S]*?)\\]::text\\[\\]`, 'm')
  const m = re.exec(SQL)
  if (!m) throw new Error(`Could not find ${fn}() in the migration`)
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

/** Pull the members out of a `create type x as enum (...)`. */
function sqlEnum(name: string): string[] {
  const re = new RegExp(`create type ${name}\\s+as enum \\(([^)]*)\\)`, 'm')
  const m = re.exec(SQL)
  if (!m) throw new Error(`Could not find enum ${name} in the migration`)
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

describe('taxonomy.ts and the SQL migration cannot drift', () => {
  it('valid_styles() matches STYLES', () => expect(sqlArray('valid_styles')).toEqual([...STYLES]))
  it('valid_colors() matches COLORS', () => expect(sqlArray('valid_colors')).toEqual([...COLORS]))
  it('valid_moods()  matches MOODS',  () => expect(sqlArray('valid_moods')).toEqual([...MOODS]))

  it('valid_rooms() matches ROOMS and EXCLUDES the user-side wildcard', () => {
    const rooms = sqlArray('valid_rooms')
    expect(rooms).toEqual([...ROOMS])
    expect(rooms).not.toContain('any')
  })

  it('every enum matches its TypeScript counterpart', () => {
    expect(sqlEnum('size_category')).toEqual([...SIZES])
    expect(sqlEnum('artwork_availability')).toEqual([...ARTWORK_AVAILABILITY])
    expect(sqlEnum('rental_status')).toEqual([...RENTAL_STATUSES])
    expect(sqlEnum('rental_source')).toEqual([...RENTAL_SOURCES])
    expect(sqlEnum('return_reason')).toEqual([...RETURN_REASONS])
    expect(sqlEnum('mystery_piece_type')).toEqual([...PIECE_TYPES])
    expect(sqlEnum('mystery_status')).toEqual([...MYSTERY_STATUSES])
    expect(sqlEnum('change_frequency')).toEqual([...CHANGE_FREQUENCIES])
    expect(sqlEnum('budget_band')).toEqual([...BUDGET_BANDS])
    expect(sqlEnum('user_role')).toEqual([...USER_ROLES])
  })

  it('RLS is enabled on every table the migration creates', () => {
    const tables = [...SQL.matchAll(/create table (\w+)/g)].map((m) => m[1])
    expect(tables.length).toBeGreaterThanOrEqual(11)
    for (const t of tables) {
      expect(SQL, `RLS missing on "${t}" — §32.3 requires it on every table`)
        .toContain(`alter table ${t}`)
    }
  })

  it('the one-active-rental-per-artwork index is scoped to active only (§31.2)', () => {
    expect(SQL).toMatch(/create unique index one_active_rental_per_artwork[\s\S]*?where status = 'active'/)
  })

  it('the ladder CHECK constraints exist (§7.2)', () => {
    expect(SQL).toContain('constraint ladder_order')
    expect(SQL).toContain('constraint ladder_value')
    expect(SQL).toContain('constraint size_derived')
  })
})
